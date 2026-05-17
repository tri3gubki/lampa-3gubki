import Template from '../template'
import Controller from '../../core/controller'
import Lang from '../../core/lang'
import Parser from '../../core/api/sources/parser'
import Torrent from '../torrent'
import Utils from '../../utils/utils'
import DeviceInput from '../device_input'
import Shared from './shared'
import Actions from './actions'

/**
 * Series Torrents Modal — поиск и выбор торрента для СЕРИАЛА.
 *
 * Многошаговое overlay-окно поверх страницы сериала (без Activity-стека):
 *   1. «Сезон»   — список сезонов из TMDB (если сезон один — шаг пропуск)
 *   2. «Поиск»   — спиннер; поиск всего сериала идёт в фоне с открытия окна
 *   3. «Качество»— бакеты 4K HDR / 4K / 1080p / 720p выбранного сезона
 *   4. «Список»  — топ-5 выбранного качества по сидерам
 *   5. выбор     — Torrent.start → окно выбора серий → плеер
 *
 * Поиск делается ОДИН раз (по названию сериала) при открытии окна — все
 * сезоны приходят в одном ответе, выбор сезона лишь фильтрует кэш через
 * Shared.filterSeries (точный сезон + год сезона; многосезонные сборники
 * и одноимённые чужие сериалы отбрасываются).
 */

let html         = null
let card         = null
let seasons      = null   // [{number,title,episodes,year}]
let results      = null   // сырые Results от Parser (весь сериал), кэш
let searching    = false
let search_error = ''
let season_cur   = null   // выбранный сезон {number,title,episodes,year}
let buckets      = null
let step         = ''     // season | search | quality | list | empty
let opened       = false
let prev_ctrl    = 'full_start'
let last_focus   = null   // строка, с которой открыли long-press меню
let quality_bucket = null // выбранный бакет качества (для возврата фокуса)

function seriesName(c){
    return (c.original_name || c.original_title || c.name || c.title || '').trim()
}

/**
 * Список сезонов из TMDB-карточки. Спецвыпуски (сезон 0) включаются.
 * year — год выхода сезона, нужен фильтру для дисамбигуации одноимённых
 * сериалов (см. Shared.filterSeries).
 */
function buildSeasons(c){
    let list = []

    if(Array.isArray(c.seasons) && c.seasons.length){
        c.seasons.forEach(s => {
            if(!s || s.season_number == null) return

            let year = parseInt(((s.air_date || '') + '').slice(0, 4)) || 0
            if(!year && s.season_number === 1) year = parseInt(((c.first_air_date || '') + '').slice(0, 4)) || 0

            list.push({
                number:   s.season_number,
                title:    s.name || (s.season_number === 0
                            ? Lang.translate('torrents_modal_specials')
                            : Lang.translate('torrents_modal_season') + ' ' + s.season_number),
                episodes: s.episode_count || 0,
                year:     year
            })
        })
    }

    if(!list.length){
        let n    = c.number_of_seasons || 1
        let year = parseInt(((c.first_air_date || '') + '').slice(0, 4)) || 0

        for(let i = 1; i <= n; i++){
            list.push({
                number:   i,
                title:    Lang.translate('torrents_modal_season') + ' ' + i,
                episodes: 0,
                year:     i === 1 ? year : 0
            })
        }
    }

    list.sort((a, b) => a.number - b.number)
    return list
}

function bodyEl(){ return html.find('.torrents-modal__body') }
function setTitle(t){ html.find('.torrents-modal__title').text(t || '') }

/**
 * Обновить коллекцию селекторов для Navigator + навести фокус.
 * Вызывается после КАЖДОГО рендера шага.
 */
function refocus(target){
    Controller.collectionSet(html)
    Controller.collectionFocus(target || false, html)
}

function addController(){
    Controller.add('torrents-modal', {
        toggle: ()=>{
            Controller.collectionSet(html)
            // last_focus — чтобы при возврате из long-press меню фокус
            // встал на ту же строку, а не на первую.
            Controller.collectionFocus(last_focus || false, html)
        },
        // Только Navigator.move — на краях no-op, фокус не покидает окно.
        up:    ()=> Navigator.move('up'),
        down:  ()=> Navigator.move('down'),
        left:  ()=> Navigator.move('left'),
        right: ()=> Navigator.move('right'),
        back:  onBack
    })

    Controller.toggle('torrents-modal')
}

function onBack(){
    // list → quality (если качеств >1)
    if(step === 'list' && buckets && buckets.length > 1) return renderQuality()
    // quality / search / empty / list(одно качество) → назад к выбору сезона
    if(step !== 'season' && seasons && seasons.length > 1) return renderSeasons()

    close()
}

// ===== Шаги =====

function renderSeasons(){
    step       = 'season'
    season_cur = null
    setTitle(Lang.translate('torrents_modal_season_choose'))

    let body = bodyEl().empty()
    body.append('<div class="torrents-modal__list"></div>')
    let list = body.find('.torrents-modal__list')

    seasons.forEach(season => {
        let el = $(
            '<div class="torrents-modal__season selector">' +
                '<div class="torrents-modal__season-label"></div>' +
                '<div class="torrents-modal__season-count"></div>' +
            '</div>'
        )
        el.find('.torrents-modal__season-label').text(season.title)

        if(season.episodes) el.find('.torrents-modal__season-count').text(season.episodes)
        else el.find('.torrents-modal__season-count').remove()

        el.on('hover:enter', ()=> pickSeason(season))
        list.append(el)
    })

    refocus(list.find('.selector').eq(0)[0])
}

function renderSearch(){
    step = 'search'
    setTitle(season_cur ? season_cur.title : (card.name || card.title || ''))

    bodyEl().html(
        '<div class="torrents-modal__status">' +
            '<div class="torrents-modal__spinner"></div>' +
            '<div class="torrents-modal__status-text">' +
                Lang.translate('torrents_modal_searching') +
            '</div>' +
        '</div>'
    )

    refocus(false)
}

function renderEmpty(msg){
    step = 'empty'
    setTitle(season_cur ? season_cur.title : (card.name || card.title || ''))

    bodyEl().html(
        '<div class="torrents-modal__status">' +
            '<div class="torrents-modal__status-text">' +
                (msg || Lang.translate('torrents_modal_nofound')) +
            '</div>' +
        '</div>'
    )

    refocus(false)
}

function renderQuality(){
    step = 'quality'
    setTitle(Lang.translate('torrents_modal_quality'))

    let body = bodyEl().empty()
    body.append('<div class="torrents-modal__list"></div>')
    let list = body.find('.torrents-modal__list')

    buckets.forEach(bucket => {
        let el = $(
            '<div class="torrents-modal__quality selector">' +
                '<div class="torrents-modal__quality-label"></div>' +
                '<div class="torrents-modal__quality-count"></div>' +
            '</div>'
        )
        el.find('.torrents-modal__quality-label').text(bucket.label)
        el.find('.torrents-modal__quality-count').text(bucket.items.length)
        el.on('hover:enter', ()=> renderList(bucket))
        list.append(el)
    })

    // При возврате со списка — фокус на ранее выбранном качестве.
    let idx = quality_bucket ? buckets.indexOf(quality_bucket) : 0
    refocus(list.find('.selector').eq(idx < 0 ? 0 : idx)[0])
}

function renderList(bucket){
    step = 'list'
    quality_bucket = bucket
    setTitle((season_cur ? season_cur.title + ' · ' : '') + bucket.label)

    let body = bodyEl().empty()
    body.append('<div class="torrents-modal__list"></div>')
    let list = body.find('.torrents-modal__list')

    bucket.items.forEach(item => {
        let row = $(
            '<div class="torrents-modal__torrent selector">' +
                '<div class="torrents-modal__torrent-title"></div>' +
                '<div class="torrents-modal__torrent-meta">' +
                    '<span class="torrents-modal__torrent-seeds"></span>' +
                    '<span class="torrents-modal__torrent-size"></span>' +
                    '<span class="torrents-modal__torrent-tracker"></span>' +
                '</div>' +
            '</div>'
        )
        row.find('.torrents-modal__torrent-title').text(item.Title || '')
        row.find('.torrents-modal__torrent-seeds').text(
            Lang.translate('torrent_item_seeds') + ': ' + (item.Seeders || 0)
        )
        row.find('.torrents-modal__torrent-size').text(Utils.bytesToSize(item.Size || 0))
        row.find('.torrents-modal__torrent-tracker').text(item.Tracker || '')

        row.on('hover:enter', ()=> pickTorrent(item))
        row.on('hover:long', ()=>{
            last_focus = row[0]
            Actions.openMenu(item, pickTorrent)
        })

        list.append(row)
    })

    refocus(list.find('.selector').eq(0)[0])
}

// ===== Поиск (весь сериал, в фоне) =====

function startSearch(){
    searching    = true
    results      = null
    search_error = ''

    let object = {
        url: '',
        component: 'torrents',
        search: seriesName(card),
        movie: card,
        page: 1
    }
    // Parser обращается к movie.genres — страхуемся.
    if(!object.movie.genres) object.movie.genres = []

    Parser.get(object, onResults, onError)
}

function onResults(data){
    if(!opened) return
    searching = false
    results   = (data && data.Results) || []

    // Пользователь уже выбрал сезон и ждёт на спиннере.
    if(season_cur && step === 'search') showSeason()
}

function onError(text){
    if(!opened) return
    searching    = false
    results      = []
    search_error = text || ''

    if(season_cur && step === 'search') showSeason()
}

// ===== Выбор сезона =====

function pickSeason(season){
    season_cur = season

    // Поиск ещё идёт — спиннер; showSeason() вызовется из onResults/onError.
    if(searching || results == null) return renderSearch()

    showSeason()
}

function showSeason(){
    if(search_error){
        return renderEmpty(Lang.translate('torrent_error_connect') + ': ' + search_error)
    }

    let items = Shared.filterSeries(results, season_cur.number, season_cur.year)

    // Точечных раздач сезона нет вовсе — запасной вариант: многосезонные
    // сборники, содержащие этот сезон (старые сериалы лежат только так).
    if(!items.length){
        items = Shared.filterSeriesPacks(results, season_cur.number, season_cur.year)
    }

    buckets = Shared.bucketize(items, 5)

    if(!buckets.length) return renderEmpty()
    // Одно качество — пропускаем выбор, сразу список.
    if(buckets.length === 1) return renderList(buckets[0])

    renderQuality()
}

// ===== Выбор торрента =====

function pickTorrent(item){
    let movie  = card
    let target = prev_ctrl   // контроллер страницы сериала ('full_start')

    // Torrent.start читает element.title (lowercase) и element.poster.
    item.title  = item.Title
    item.poster = movie.poster || movie.img || ''

    // Закрываем окно ДО Torrent.start — он откроет своё окно выбора серий.
    close()

    // Назад из окна выбора серий → фокус обратно на страницу сериала.
    Torrent.back(()=> { try{ Controller.toggle(target) }catch(e){} })

    Torrent.start(item, movie)
}

// ===== Открытие / закрытие =====

function open(series){
    if(opened) return
    opened       = true
    card         = series
    seasons      = buildSeasons(series)
    results      = null
    searching    = false
    search_error = ''
    season_cur   = null
    buckets      = null
    step         = ''
    last_focus   = null
    quality_bucket = null

    let enabled = Controller.enabled()
    prev_ctrl = (enabled && enabled.name) ? enabled.name : 'full_start'

    html = Template.get('torrents_modal')
    $('body').append(html)

    // Клик по затемнённому фону — закрыть.
    html.find('.torrents-modal__layer').on('click', (e)=>{
        if(DeviceInput.canClick(e.originalEvent)) close()
    })

    addController()

    // Поиск всего сериала — сразу, в фоне (пока выбирается сезон).
    startSearch()

    // Один сезон — шаг выбора пропускаем.
    if(seasons.length === 1) pickSeason(seasons[0])
    else renderSeasons()
}

function close(){
    if(!opened) return
    opened = false

    Parser.clear()

    if(html){
        html.remove()
        html = null
    }

    // Возврат к контроллеру страницы сериала.
    try{ Controller.toggle(prev_ctrl) }
    catch(e){ try{ Controller.toggle('content') }catch(e2){} }

    card         = null
    seasons      = null
    results      = null
    season_cur   = null
    buckets      = null
    step         = ''
}

export default {
    open,
    close
}
