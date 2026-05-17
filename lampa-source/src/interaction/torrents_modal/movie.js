import Template from '../template'
import Controller from '../../core/controller'
import Activity from '../activity/activity'
import DeviceInput from '../device_input'
import TorrentsComponent from '../../components/torrents'

/**
 * Movie Torrents Modal — overlay-обёртка над компонентом torrents.
 *
 * Вместо Activity.push('torrents') открывает торрент-список модальным
 * окном поверх страницы фильма. Сам компонент torrents.js переиспользуется
 * целиком (вся логика парсинга/фильтра/сортировки/long-press отлажена) —
 * ему лишь подсовывается фейковый this.activity и флаг modal_mode, чтобы
 * он не дёргал Activity-инфраструктуру.
 *
 * Используется только для ФИЛЬМОВ. Сериалы пока идут старым путём
 * Activity.push (см. components/full/start/torrents.js).
 */

let html      = null
let instance  = null
let opened    = false
let prev_activity = null

function buildSearch(card){
    let year = ((card.release_date || '') + '').slice(0, 4)
    let orig = card.original_title || card.title || ''
    return (orig + (year ? ' ' + year : '')).trim()
}

/**
 * Открыть окно торрентов для фильма.
 * @param {object} card — TMDB-карточка фильма
 * @param {string} [forced_search] — переопределённый поисковый запрос
 *                  (используется при «Уточнить поиск»)
 */
function open(card, forced_search){
    if(opened) return
    opened = true

    // Запоминаем активную активность (страницу фильма) — после close
    // нужно вернуть ей фокус и перерегистрировать её controller.
    prev_activity = Activity.active()

    let object = {
        url: '',
        component: 'torrents',
        search: forced_search || buildSearch(card),
        search_one: card.title,
        search_two: card.original_title,
        movie: card,
        page: 1,
        modal_mode: true,
        onModalResearch: (value) => research(card, value)
    }

    html = Template.get('torrents_modal')
    $('body').append(html)

    // Клик по затемнённому фону — закрыть.
    html.find('.torrents-modal__layer').on('click', (e) => {
        if(DeviceInput.canClick(e.originalEvent)) close()
    })

    instance = new TorrentsComponent(object)

    // Фейковый activity-объект: loader → наш спиннер, toggle → рефокус
    // контроллера 'content' который регистрирует сам компонент.
    instance.activity = {
        loader: (status) => html && html.toggleClass('torrents-modal--loading', !!status),
        toggle: () => { try{ Controller.toggle('content') }catch(e){} },
        ready:  () => {}
    }

    // Перехватываем back компонента — вместо Activity.backward закрываем окно.
    instance.back = close

    // Монтируем контент компонента (.explorer--modal) в overlay.
    html.append(instance.create())

    $('body').addClass('movie-torrents--open')

    // start() компонента: initialize → parse → регистрация controller'а
    // 'content' (навигация по списку) + toggle на него.
    instance.start()
}

/**
 * Переоткрыть окно с новым поисковым запросом («Уточнить поиск»).
 */
function research(card, value){
    close()
    setTimeout(() => open(card, value), 50)
}

function close(){
    if(!opened) return
    opened = false

    try{ if(instance && instance.destroy) instance.destroy() }
    catch(e){ console.log('TorrentsModal', 'destroy error', e) }
    instance = null

    if(html){
        html.remove()
        html = null
    }

    $('body').removeClass('movie-torrents--open')

    // Возвращаем управление странице фильма — перерегистрируем её
    // controller через рестарт ActivitySlide (компонент торрентов
    // перетёр 'content', нужно вернуть фулловский).
    if(prev_activity && prev_activity.activity && typeof prev_activity.activity.start === 'function'){
        prev_activity.activity.start()
    }
    else{
        try{ Controller.toggle('content') }catch(e){}
    }

    prev_activity = null
}

export default {
    open,
    close
}
