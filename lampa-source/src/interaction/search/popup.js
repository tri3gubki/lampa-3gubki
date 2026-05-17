import Template from '../template'
import Controller from '../../core/controller'
import Storage from '../../core/storage/storage'
import Lang from '../../core/lang'
import Keyboard from '../keyboard/keyboard'
import Activity from '../activity/activity'
import Utils from '../../utils/utils'
import Line from '../items/line/line'
import LineModule from '../items/line/module/module'
import Router from '../../core/router'
import TMDB from '../../core/api/sources/tmdb'
import Head from '../head/head'
import Layer from '../../core/layer'
import DeviceInput from '../device_input'

let html
let keyboard
let line

// Кеш состояния — query/results последнего поиска. Используется чтобы
// при backward с детальной страницы фильма восстановить попап с теми же
// результатами без повторного запроса.
let cache_query = ''
let cache_results = null
let restore_pending = false
let saved_count = 0

function init(){
    html = Template.get('search_popup')

    Head.render().find('.open--search').on('hover:enter', () => open())

    // Клик по бекдропу закрывает попап (как у других модалок)
    html.find('.search-popup__layer').on('click', (e) => {
        if(DeviceInput.canClick(e.originalEvent)) close()
    })

    Activity.listener.follow('backward', (e) => {
        if(restore_pending && e.count === saved_count){
            restore_pending = false
            setTimeout(() => open(true), 50)
        }
    })
}

function open(restoring){
    $('body').toggleClass('search-popup--open', true)

    createKeyboard()

    if(restoring && cache_results){
        keyboard.value(cache_query)

        rebuildLine(cache_results)
    }
    else{
        cache_query = ''
        cache_results = null
        keyboard.value('')

        clearBody()
    }

    toggle()
}

function createKeyboard(){
    if(keyboard) return

    // Используем simple-режим клавиатуры — нативный <input>, который
    // на TV/мобиле триггерит OS-клавиатуру (Tizen/WebOS/Apple/Google).
    // Виртуальная клавиатура Lampa здесь намеренно НЕ используется.
    keyboard = new Keyboard({keyboard: 'simple', nomic: true})

    keyboard.create()

    keyboard.listener.follow('change', (e) => {
        cache_query = (e.value || '').trim()
    })

    keyboard.listener.follow('enter', () => {
        runSearch(cache_query)
    })

    keyboard.listener.follow('blur', () => {
        // На TV закрытие OS-клавиатуры (стрелкой вниз/готово) триггерит blur
        if(cache_query) runSearch(cache_query)
    })

    keyboard.listener.follow('down', () => {
        if(line) line.toggle()
    })

    keyboard.listener.follow('back', close)
}

function runSearch(query){
    query = (query || '').trim()

    if(!query){
        cache_results = null
        clearBody()
        return
    }

    cache_query = query

    showStatus(Lang.translate('search_searching'))

    TMDB.multi({
        query: encodeURIComponent(query),
        language: Storage.field('tmdb_lang') || Storage.field('language')
    }, (data) => {
        cache_results = data

        if(!data.results.length) showStatus(Lang.translate('search_nofound'))
        else rebuildLine(data)
    }, () => {
        showStatus(Lang.translate('search_nofound'))
    })
}

function rebuildLine(data){
    destroyLine()

    line = Utils.createInstance(Line, {
        results: data.results,
        params: {}
    }, {
        module: LineModule.MASK.base
    })

    line.use({
        onInstance: function(item, item_data){
            item.use({
                onEnter: () => {
                    saved_count = Activity.all().length + 1
                    restore_pending = true

                    close()

                    Router.call('full', item_data)
                }
            })
        },
        onUp: () => {
            if(keyboard) keyboard.toggle()
        },
        onBack: () => {
            if(keyboard) keyboard.toggle()
        }
    })

    line.create()

    let body = html.find('.search-popup__body')

    body.removeClass('search-popup__body--empty')
    body.empty().append(line.render(true))

    // Триггерим первичную проверку видимости — иначе постеры карточек
    // ленятся загружаться до первого скролла (Layer.visible вешает
    // listener на 'visible' событие .layer--render элементов).
    Layer.visible(line.render(true))
}

function showStatus(text){
    destroyLine()

    let body = html.find('.search-popup__body')

    body.removeClass('search-popup__body--empty')
    body.empty().append('<div class="search-popup__status">' + text + '</div>')
}

function clearBody(){
    destroyLine()

    let body = html.find('.search-popup__body')

    body.empty().addClass('search-popup__body--empty')
}

function destroyLine(){
    if(line){
        line.destroy()
        line = null
    }
}

function toggle(){
    Controller.add('search-popup', {
        invisible: true,
        toggle: () => {
            if(keyboard) keyboard.toggle()
        },
        update: () => {},
        back: close
    })

    Controller.toggle('search-popup')
}

function close(){
    $('body').toggleClass('search-popup--open', false)

    if(keyboard){
        keyboard.destroy()
        keyboard = null
    }

    // keyboard.destroy() в simple-режиме удаляет только сам <input>; кнопки
    // «Готово/Отменить» (.simple-keyboard-buttons) и микрофон остаются в
    // контейнере. html попапа постоянный (создаётся один раз в init) —
    // без очистки контейнера кнопки накапливаются при каждом открытии.
    html.find('.simple-keyboard').empty()

    destroyLine()

    if(!restore_pending) Controller.toggle('head')
}

function render(js){
    return js ? html[0] : html
}

export default {
    init,
    open,
    close,
    render
}
