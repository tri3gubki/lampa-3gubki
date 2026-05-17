import Template from '../template'
import Controller from '../../core/controller'
import Lang from '../../core/lang'
import Parser from '../../core/api/sources/parser'
import Torrent from '../torrent'
import Utils from '../../utils/utils'
import DeviceInput from '../device_input'
import Shared from './shared'

/**
 * Movie Torrents Modal — поиск и выбор торрента для ФИЛЬМА.
 *
 * Многошаговое overlay-окно поверх страницы фильма (без Activity-стека):
 *   1. «Поиск»   — спиннер, в фоне Parser.get(оригинал + год)
 *   2. «Качество»— кнопки бакетов 4K HDR / 4K / 1080p / 720p (непустые)
 *   3. «Список»  — топ-5 выбранного качества по сидерам
 *   4. выбор     — Torrent.start → стандартный TorrServer-flow (плеер)
 *
 * Если качество одно — шаг 2 пропускается. Навигация замкнута внутри
 * окна: стрелки двигают фокус через Navigator, на краях — стоп (фокус
 * не уходит за окно). Контроллер 'torrents-modal' не конфликтует с
 * 'content' страницы фильма — на close возвращаемся к нему.
 */

let html       = null
let card       = null
let buckets    = null
let step       = ''        // search | quality | list | empty
let opened     = false
let prev_ctrl  = 'content'

function buildSearch(c){
    let year = ((c.release_date || '') + '').slice(0, 4)
    let orig = c.original_title || c.title || ''
    return (orig + (year ? ' ' + year : '')).trim()
}

function bodyEl(){ return html.find('.torrents-modal__body') }
function setTitle(t){ html.find('.torrents-modal__title').text(t || '') }

/**
 * Обновить коллекцию селекторов для Navigator + навести фокус.
 * Вызывается после КАЖДОГО рендера шага — иначе пульт/мышь не видят
 * новые элементы.
 */
function refocus(target){
    Controller.collectionSet(html)
    Controller.collectionFocus(target || false, html)
}

function addController(){
    Controller.add('torrents-modal', {
        toggle: ()=>{
            Controller.collectionSet(html)
            Controller.collectionFocus(false, html)
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
    // Из списка торрентов → назад к выбору качества (если качеств >1).
    if(step === 'list' && buckets && buckets.length > 1) renderQuality()
    else close()
}

// ===== Шаги =====

function renderSearch(){
    step = 'search'
    setTitle(card.title || card.name || '')

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
    setTitle(card.title || card.name || '')

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

    refocus(list.find('.selector').eq(0)[0])
}

function renderList(bucket){
    step = 'list'
    setTitle(bucket.label)

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

        list.append(row)
    })

    refocus(list.find('.selector').eq(0)[0])
}

// ===== Результат поиска =====

function onResults(data){
    if(!opened) return

    let items = Shared.filterMovies(data && data.Results)
    buckets   = Shared.bucketize(items, 5)

    if(!buckets.length) return renderEmpty()
    // Одно качество — пропускаем выбор, сразу список.
    if(buckets.length === 1) return renderList(buckets[0])

    renderQuality()
}

function onError(text){
    if(!opened) return
    renderEmpty(Lang.translate('torrent_error_connect') + ': ' + text)
}

// ===== Выбор торрента =====

function pickTorrent(item){
    let movie = card

    // Torrent.start читает element.title (lowercase) и element.poster.
    item.title  = item.Title
    item.poster = movie.poster || movie.img || ''

    // Закрываем окно ДО Torrent.start — он откроет свой Modal/контроллер.
    close()

    Torrent.start(item, movie)
}

// ===== Открытие / закрытие =====

function open(movie){
    if(opened) return
    opened  = true
    card    = movie
    buckets = null
    step    = ''

    let enabled = Controller.enabled()
    prev_ctrl = (enabled && enabled.name) ? enabled.name : 'content'

    let object = {
        url: '',
        component: 'torrents',
        search: buildSearch(card),
        movie: card,
        page: 1
    }
    // Parser обращается к movie.genres — страхуемся.
    if(!object.movie.genres) object.movie.genres = []

    html = Template.get('torrents_modal')
    $('body').append(html)

    // Клик по затемнённому фону — закрыть.
    html.find('.torrents-modal__layer').on('click', (e)=>{
        if(DeviceInput.canClick(e.originalEvent)) close()
    })

    addController()
    renderSearch()

    Parser.get(object, onResults, onError)
}

function close(){
    if(!opened) return
    opened = false

    Parser.clear()

    if(html){
        html.remove()
        html = null
    }

    // Возврат к контроллеру страницы фильма. Имя 'torrents-modal'
    // отдельное — 'content' страницы фильма не перетёрт, просто
    // переключаемся обратно.
    try{ Controller.toggle(prev_ctrl) }
    catch(e){ try{ Controller.toggle('content') }catch(e2){} }

    card    = null
    buckets = null
    step    = ''
}

export default {
    open,
    close
}
