import Define from './utils/define/define'
import PromisePolyfill from './utils/define/promise'
import Manifest from './core/manifest'
import Lang from './core/lang'
import Platform from './core/platform'
import Render from './interaction/render'
import Keypad from './core/keypad'
import Activity from './interaction/activity/activity'
import Controller from './core/controller'
import Layer from './core/layer'
import Select from './interaction/select'
import Favorite from './core/favorite'
import Background from './interaction/background'
import Head from './interaction/head/head'
import Menu from './interaction/menu/menu'
import Utils from './utils/utils'
import Params from './interaction/settings/params'
import Input from './interaction/settings/input'
import Android from './core/android'
import Subscribe from './utils/subscribe'
import Storage from './core/storage/storage'
import Template from './interaction/template'
import Component from './core/component'
import Reguest from './utils/reguest'
import Filter from './interaction/filter'
import Explorer from './interaction/explorer'
import Scroll from './interaction/scroll'
import Empty from './interaction/empty/empty'
import Arrays from './utils/arrays'
import Noty from './interaction/noty'
import Player from './interaction/player'
import PlayerVideo from './interaction/player/video'
import PlayerPanel from './interaction/player/panel'
import PlayerFooter from './interaction/player/footer'
import PlayerInfo from './interaction/player/info'
import PlayerPlaylist from './interaction/player/playlist'
import Timeline from './interaction/timeline'
import Settings from './interaction/settings/settings'
import SettingsApi from './interaction/settings/api'
import Modal from './interaction/modal'
import Api from './core/api/api'
import Card from './interaction/card'
import TimeTable from './core/timetable'
import Helper from './interaction/helper'
import Tizen from './core/tizen'
import Status from './utils/status'
import LangChoice from './interaction/lang'
import Parser from './core/api/sources/parser'
import TMDB from './core/tmdb/tmdb'
import Base64 from './utils/base64'
import Loading from './interaction/loading'
import Search from './interaction/search/global'
import DeviceInput from './interaction/device_input'
import AppWorker from './utils/worker'
import DB from './utils/db'
import NavigationBar from './interaction/navigation_bar'
import Endless from './interaction/endless'
import Color from './utils/color'
import Cache from './utils/cache'
import Torrent from './interaction/torrent'
import Torserver from './interaction/torserver'
import Bell from './interaction/bell'
import HoverSwitcher from './core/switcher'
import Task from './core/loading'
import App from './interaction/app'
import LoadingProgress from './interaction/loading_progress'
import StorageMenager from './interaction/storage_manager'
import Markers from './core/markers'
import RemoteHelper from './interaction/remote_helper'
import DataBase from './interaction/database'
import Maker from './interaction/maker'
import MaskHelper from './utils/mask'
import ContentRows from './core/content_rows'
import Emit from './utils/emit'
import Router from './core/router'
import Timer from './core/timer'

import ServiceTorserver from './services/torrserver'
import ServiceSettings from './services/settings'
import ServiceLibs from './services/libs'

window.screen_width  = window.innerWidth
window.screen_height = window.innerHeight

/**
 * Настройки приложения
 */

if(typeof window.lampa_settings == 'undefined'){
    window.lampa_settings = {}
}

let torrents_use = true
let agent        = navigator.userAgent.toLowerCase()
let conditions   = [
    agent.indexOf("lampa_client_yasha") > -1,
    typeof AndroidJS !== 'undefined' && (AndroidJS.appVersion() + '').toLowerCase().indexOf('rustore') > -1 && !localStorage.getItem('parser_use')
]

// Если есть условия из списка, то отключаем торренты, дабы пройти модерацию в сторе
if(conditions.indexOf(true) >= 0) torrents_use = false

Arrays.extend(window.lampa_settings,{
    // Показывать кнопку торрентов
    torrents_use: torrents_use,

    // Локальные DCMA / LGBT-блок-листы
    dcma: false,
    lgbt: false,

    // Подключить другие языки интерфейса
    lang_use: true,

    // Прочие флаги UI
    push_state:            true,
    blur_poster:           true,
    hide_important_params: true,
    read_only:             false,
    white_use:             false,
    fix_widget:            window.localStorage.getItem('fix_widget') ? true : false,
})

// Миграция плеера v17 (2026-05-09):
// - убраны раздельные player_torrent / player_iptv (один глобальный 'player')
// - дефолт 'inner' заменён на 'none' для browser / iOS / macOS / desktop / android
// Существующие устройства имеют 'inner'/'android' в Storage от старых
// версий; если юзер не делал явного выбора — сбрасываем на 'none' раз.
if(!window.localStorage.getItem('player_migrated_v17')){
    window.localStorage.removeItem('player_torrent')
    window.localStorage.removeItem('player_iptv')

    let agent  = navigator.userAgent.toLowerCase()
    let is_tv  = agent.indexOf('tizen') >= 0 || agent.indexOf('webos') >= 0 ||
                 agent.indexOf('appletv') >= 0 || agent.indexOf('smarttv') >= 0 ||
                 agent.indexOf('googletv') >= 0 || agent.indexOf('android tv') >= 0

    if(!is_tv){
        let cur = window.localStorage.getItem('player')
        if(cur === 'inner' || cur === '"inner"') window.localStorage.removeItem('player')
    }

    window.localStorage.setItem('player_migrated_v17','1')
}

// Миграция интерфейса v18 (2026-05-09):
// - menu_always всегда видно (был toggle, стал зашитым)
// - background / background_type / card_interfice_poster / card_interfice_cover
//   убраны из UI настроек; их дефолты применятся только если в Storage пусто.
// Сбрасываем старые значения чтобы новые дефолты подхватились.
if(!window.localStorage.getItem('interface_simplified_v18')){
    ['menu_always','background','background_type','card_interfice_poster','card_interfice_cover'].forEach(k=>{
        window.localStorage.removeItem(k)
    })

    window.localStorage.setItem('interface_simplified_v18','1')
}

// v19: black_style убран из UI, дефолт false. Сбрасываем у тех, кто
// его раньше включил.
if(!window.localStorage.getItem('black_style_reset_v19')){
    window.localStorage.removeItem('black_style')
    window.localStorage.setItem('black_style_reset_v19','1')
}

// v20: раздел 'Остальное' минимизирован. Удалены screensaver / source /
// time_offset / device_name из UI. source форсим в 'tmdb' (CUB-source
// удалён ранее, других не осталось). Старые значения сбрасываем.
if(!window.localStorage.getItem('rest_simplified_v20')){
    ['screensaver','screensaver_type','screensaver_time','time_offset','device_name'].forEach(k=>{
        window.localStorage.removeItem(k)
    })
    window.localStorage.setItem('source','"tmdb"')
    window.localStorage.setItem('rest_simplified_v20','1')
}

// v21: card_quality удалён (TMDB не отдаёт quality поле — значок
// никогда не рисовался). card_episodes скрыт из UI, дефолт true —
// сбрасываем у тех, кто вручную выключил.
if(!window.localStorage.getItem('card_flags_v21')){
    window.localStorage.removeItem('card_quality')
    window.localStorage.removeItem('card_episodes')
    window.localStorage.setItem('card_flags_v21','1')
}

// v22: start_page скрыт из UI, всегда 'main'. Сбрасываем чтобы дефолт
// 'main' (из select() в params.js) применился.
if(!window.localStorage.getItem('start_page_main_v22')){
    window.localStorage.removeItem('start_page')
    window.localStorage.setItem('start_page_main_v22','1')
}

// v23: protocol-toggle удалён (всегда https). request_caching скрыт
// из UI, дефолт true. Сбрасываем старые значения у тех кто менял.
if(!window.localStorage.getItem('rest_more_v23')){
    window.localStorage.removeItem('protocol')
    window.localStorage.removeItem('request_caching')
    window.localStorage.setItem('rest_more_v23','1')
}

/**
 * Делаем классы доступными в глобальной области видимости
 */
function initClass(){
    window.Lampa = {
        Listener: Subscribe(),
        Lang,
        Subscribe,
        Storage,
        Platform,
        Utils,
        Params,
        Menu,
        Head,
        Background,
        Favorite,
        Select,
        Controller,
        Activity,
        Keypad,
        Template,
        Component,
        Reguest,
        Filter,
        Explorer,
        Scroll,
        Empty,
        Arrays,
        Noty,
        Player,
        PlayerVideo,
        PlayerInfo,
        PlayerPanel,
        PlayerFooter,
        PlayerPlaylist,
        Timeline,
        Modal,
        Api,
        Settings,
        SettingsApi,
        Android,
        Card,
        Input,
        TimeTable,
        Helper,
        Status,
        Tizen,
        Layer,
        Parser,
        Manifest,
        TMDB,
        Base64,
        Loading,
        Search,
        DeviceInput,
        Worker: AppWorker,
        DB,
        NavigationBar,
        Endless,
        Color,
        Cache,
        Torrent,
        Torserver,
        Bell,
        StorageMenager,
        RemoteHelper,
        Network: new Reguest(),
        Maker,
        MaskHelper,
        ContentRows,
        Emit,
        Router,
        Timer
    }
}

/**
 * Подготовка приложения к запуску
 */
function prepareApp(){
    if(window.prepared_app) return

    LoadingProgress.init()

    document.body.append(Noty.render())

    Platform.init()

    LoadingProgress.status('Platform init')

    DeviceInput.init()

    LoadingProgress.status('DeviceInput init')

    Params.init()

    LoadingProgress.status('Params init')

    Controller.observe()

    LoadingProgress.status('Controller observe init')



    Keypad.init()

    LoadingProgress.status('Keypad init')

    Layer.init()

    LoadingProgress.status('Layer init')

    HoverSwitcher.init()

    // Передаем фокус в контроллер

    Navigator.follow('focus', (event)=>{
        Controller.focus(event.elem)
    })

    // Выход в начальном скрине

    Keypad.listener.follow('keydown',(e)=>{
        if(window.appready || Controller.enabled().name == 'modal' || (Platform.is('browser') || Platform.desktop())) return

        if (e.code == 8 || e.code == 27 || e.code == 461 || e.code == 10009 || e.code == 88) App.modalClose()
    })

    LoadingProgress.status('Subscribe on keydown')

    // Отключаем правый клик

    if(window.innerWidth > 1280) window.addEventListener("contextmenu", e => e.preventDefault())
    
    App.loadStyle()

    LoadingProgress.status('Loaded styles')

    Layer.update()

    LoadingProgress.status('Prepare ready')

    window.prepared_app = true
}

/**
 * Меню разработчика
 */
function developerApp(proceed){
    let expect  = true
    let pressed = 0

    let timer   = setTimeout(()=>{
        expect  = false

        proceed()
    }, 1000)

    let check = ()=>{
        pressed++

        // Точка входа в developer-mode удалена вместе с
        // interaction/developer.js. 3 нажатия больше ни во что не
        // открывают; основной поток продолжается через timer.
    }

    let keydown = (event)=>{
        if(expect){
            if(event.keyCode == 38 || event.keyCode == 29460 || event.keyCode == 50400012) check()
        }
        else{
            document.removeEventListener('keydown', keydown)
        }
    }

    $('.welcome').on('click', (e)=>{
        if(expect && DeviceInput.canClick(e.originalEvent)) check()
    })

    window.addEventListener("keydown", keydown)
}

/**
 * Старт приложения
 */
function startApp(){
    if(window.appready || window.app_time_launch) return

    window.app_time_launch = Date.now()
    window.app_time_end    = 0

    // Стартуем

    LoadingProgress.status('Launching the application')

    Lampa.Listener.send('app',{type:'start'})

    // Инициализируем классы

    Timer.init()
    LoadingProgress.status('Timer init')

    Storage.init()
    LoadingProgress.status('Storage init')

    Timeline.init()
    LoadingProgress.status('Timeline init')

    Head.init()
    LoadingProgress.status('Head init')

    Settings.init()
    LoadingProgress.status('Settings init')

    Select.init()
    LoadingProgress.status('Select init')

    Favorite.init()
    LoadingProgress.status('Favorite init')

    Background.init()
    LoadingProgress.status('Background init')

    Markers.init()
    LoadingProgress.status('Markers init')


    Bell.init()
    LoadingProgress.status('Bell init')

    Menu.init()
    LoadingProgress.status('Menu init')

    Activity.init()
    LoadingProgress.status('Activity init')






    TimeTable.init()
    LoadingProgress.status('Timetable init')

    Helper.init()
    LoadingProgress.status('Helper init')

    Tizen.init()
    LoadingProgress.status('Tizen init')

    Player.init()
    LoadingProgress.status('Player init')


    Parser.init()
    LoadingProgress.status('Parser init')


    NavigationBar.init()
    LoadingProgress.status('NavigationBar init')





    Android.init()
    LoadingProgress.status('Android init')

    Search.init()
    LoadingProgress.status('Search init')

    DataBase.init()
    LoadingProgress.status('DataBase init')

    ContentRows.init()
    LoadingProgress.status('ContentRows init')
    
    // Добавляем источники поиска


    LoadingProgress.status('Initialization successful')

    // Выводим информацию о приложении

    let ratio = window.devicePixelRatio || 1

    console.log('App','screen size:', Math.round(window.innerWidth * ratio) + ' / ' + Math.round(window.innerHeight * ratio))
    console.log('App','interface size:', window.innerWidth + ' / ' + window.innerHeight)
    console.log('App','pixel ratio:', window.devicePixelRatio)
    console.log('App','user agent:', navigator.userAgent)
    console.log('App','touch points:', navigator.maxTouchPoints)
    console.log('App','is tv:', Platform.screen('tv'))
    console.log('App','is mobile:', Platform.screen('mobile'))
    console.log('App','is touch:', Utils.isTouchDevice())
    console.log('App','is PWA:', Utils.isPWA())
    console.log('App','platform:', Storage.get('platform', 'noname'))
    console.log('App','version:', Manifest.app_version)
    console.log('App','build date:', '{__APP_BUILD__}')
    console.log('App','hash', '{__APP_HASH__}')
    console.log('App','location:', location.href)

    // Записываем uid

    if(!Storage.get('lampa_uid','')) Storage.set('lampa_uid', Utils.uid())

    // Ренедрим лампу

    Render.app()

    LoadingProgress.status('Render app')

    // Инициализируем остальные сервисы


    ServiceTorserver.init()
    LoadingProgress.status('ServiceTorserver init')


    ServiceSettings.init()
    LoadingProgress.status('ServiceSettings init')






    ServiceLibs.init()
    LoadingProgress.status('ServiceLibs init')




    // Обновляем слои

    Layer.update()

    LoadingProgress.status('Layer update')

    // Сообщаем о готовности

    LoadingProgress.status('Send app ready')

    // Лампа полностью готова

    window.appready = true

    window.app_time_end = Date.now()

    Lampa.Listener.send('app',{type:'ready'})
}

/**
 * Показать приложение в любом случае
 */
function showApp(){
    LoadingProgress.status('Show app')
    
    // Скрытие логотипа
    setTimeout(()=>{
        if(window.show_app) return

        window.show_app = true

        LoadingProgress.destroy()

        Keypad.enable()


        $('.welcome').fadeOut(500,()=>{
            $(this).remove()
        })
    },1000)

    // Старт приложения
    startApp()
}

/**
 * Приоритетная загрузка
 */
function loadTask(){
    Task.queue((next)=>{
        LoadingProgress.status('Open cache database')

        Cache.openDatabase().then(()=>{
            console.log('Cache', 'worked')

            next()
        }).catch(()=>{
            console.log('Cache', 'error', 'no open database')

            next()
        })
    })

    Task.queue((next)=>{
        LoadingProgress.status('Storage load reserve')
        
        Storage.task(next)
    })

    // Mirrors / Plugins / Proxy / VPN / Account тэски удалены — пустые
    // queue-шаги превращены в no-op с немедленным next(), чтобы цепочка
    // не зависала на 5 секунд (раньше fallback-таймер showApp вытягивал).
    Task.queue((next)=>{ LoadingProgress.step(2); next() })
    Task.queue((next)=>{ LoadingProgress.step(3); next() })
    Task.queue((next)=>{ LoadingProgress.step(4); next() })
    Task.queue((next)=>{ LoadingProgress.step(5); next() })

    Task.secondary(()=>{
        setTimeout(showApp, 200)
    })

    Task.start()
}

/**
 * Загрузка языка
 */
function loadLang(){
    let code = window.localStorage.getItem('language') || 'ru'

    LoadingProgress.step(1)
    
    if(['ru','en'].indexOf(code) >= 0) loadTask()
    else{
        LoadingProgress.status('Loading language')

        $.ajax({
            url: './lang/' + code + '.js',
            dataType: 'text',
            timeout: 10000,
            success: (data)=>{
                try{
                    let translate = {}

                    eval((data + '').replace(/export default/g,'translate = ').trim())

                    Lang.AddTranslation(code, translate)
                }
                catch(e){}

                loadTask()
            },
            error: loadTask
        })
    }
}

/**
 * Первая загрузка приложения
 */
function loadApp(){
    prepareApp() // Готовим приложение

    // Если язык уже установлен, то запускаем приложение
    if(window.localStorage.getItem('language') || !window.lampa_settings.lang_use){
        // Но сперва ожидаем не вызвали ли пользователь меню разработчика, затем подгружаем язык
        developerApp(loadLang)
    }
    else{
        // Иначе предлагаем выбрать язык
        LangChoice.open((code)=>{
            Storage.set('language', code, true)
            Storage.set('tmdb_lang',code, true)

            Keypad.disable()

            loadLang()
        })

        Keypad.enable()
    }
}

if(!window.fitst_load){
    window.fitst_load = true

    initClass()
    
    if(navigator.userAgent.toLowerCase().indexOf('lampa_client') > -1){
        function checkReady(){
            if(window.innerWidth > 0) loadApp()
            else{
                setTimeout(checkReady,100)
            }
        }

        checkReady()
    }
    else loadApp()
}
