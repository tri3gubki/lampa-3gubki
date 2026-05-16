import Storage from '../core/storage/storage'
import Lang from '../core/lang'
import Noty from './noty'
import SettingsApi from './settings/api'
import Subscribe from '../utils/subscribe'

let listener = Subscribe()

const ICON = `<svg width="37" height="37" viewBox="0 0 37 37" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.5 4 L18.5 22" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M11 14.5 L18.5 22 L26 14.5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6 28 L31 28" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
</svg>`

/**
 * Default URL — берём хост откуда открыта Lampa и порт nginx-обёртки 8092.
 * Юзер открывает Lampa с http://192.168.0.160:8095 → default qBit будет
 * http://192.168.0.160:8092. Это куда удобнее жёстко-вшитого localhost
 * (который у браузера резолвится в его собственную машину, не в сервер).
 */
function defaultUrl(){
    try{
        let host = window.location.hostname || 'localhost'
        return window.location.protocol + '//' + host + ':8092'
    }
    catch(e){
        return 'http://localhost:8092'
    }
}

/**
 * Зарегистрировать секцию настроек qBittorrent.
 */
function init(){
    // Прямая проверка через localStorage — Storage.field() на этом этапе
    // вернул бы строку "undefined" (defaults ещё не зарегистрированы) и
    // закешировал её в readed-карте, после чего и Storage.set, и
    // Storage.get выдавали бы "undefined" вместо настоящего значения.
    // Также чиним legacy-состояние когда туда уже записалось "undefined"
    // или старый localhost-default (который не работает с другого хоста).
    let cur_url = window.localStorage.getItem('qbittorrent_url')
    // Legacy-detect: пустое, "undefined", localhost (резолвится на машину
    // браузера, не сервер) или старый порт 8091 (nginx-обёртка проброшена
    // снаружи на 8092 — внутри :8091, но это deployment-detail).
    if(!cur_url || cur_url === 'undefined' || /\/\/localhost:/.test(cur_url) || /:8091(\/|$)/.test(cur_url)){
        window.localStorage.setItem('qbittorrent_url', defaultUrl())
    }

    // Токен по дефолту совпадает с тем что в nginx.conf qBit-прокси.
    // Без него все DELETE возвращают 403 без CORS-заголовков — fetch
    // в браузере падает в "Failed to fetch" вместо понятного 403.
    let cur_token = window.localStorage.getItem('qbittorrent_delete_token')
    if(!cur_token || cur_token === 'undefined'){
        window.localStorage.setItem('qbittorrent_delete_token', 'homelab-fb-2026')
    }

    SettingsApi.addComponent({
        component: 'qbittorrent',
        icon: ICON,
        name: 'qBittorrent'
    })

    SettingsApi.addParam({
        component: 'qbittorrent',
        param: {
            name: 'qbittorrent_url',
            type: 'input',
            values: 'http://localhost:8092',
            default: 'http://localhost:8092',
            placeholder: 'http://localhost:8092'
        },
        field: {
            name: Lang.translate('settings_qbittorrent_url'),
            description: Lang.translate('settings_qbittorrent_url_descr')
        }
    })

    SettingsApi.addParam({
        component: 'qbittorrent',
        param: {
            name: 'qbittorrent_delete_token',
            type: 'input',
            values: '',
            default: '',
            placeholder: 'homelab-fb-2026'
        },
        field: {
            name: Lang.translate('settings_qbittorrent_delete_token'),
            description: Lang.translate('settings_qbittorrent_delete_token_descr')
        }
    })

    SettingsApi.addParam({
        component: 'qbittorrent',
        param: {
            name: 'qbittorrent_test',
            type: 'button'
        },
        field: {
            name: Lang.translate('settings_qbittorrent_test')
        },
        onRender: (item) => {
            item.on('hover:enter', () => {
                test()
            })
        }
    })
}

/**
 * Конфигурация настроек. Логин/пароль не используются — qBit должен быть
 * настроен на bypass auth для локальной сети (Web UI → Authentication →
 * "Bypass authentication for clients in whitelisted IP subnets").
 */
function config(){
    let url = (Storage.field('qbittorrent_url') || '').trim()

    return {
        url: url.replace(/\/+$/, '')
    }
}

/**
 * Сконфигурирован ли клиент (минимум — задан URL).
 */
function configured(){
    return !!config().url
}

/**
 * Добавить торрент. magnet: либо http(s)://*.torrent.
 * Авторизация ожидается отключённой в qBit для локальной сети.
 * @returns {Promise<void>}
 */
/**
 * Отправить body в qBit /api/v2/torrents/add. body — готовый FormData.
 */
function postAdd(cfg, body){
    return fetch(cfg.url + '/api/v2/torrents/add', {method: 'POST', body})
        .then((res) => {
            console.log('Qbittorrent: add response status', res.status)
            if(!res.ok) throw new Error('http_' + res.status)
            return res.text()
        })
        .then((text) => {
            console.log('Qbittorrent: add response body', text)
            if(typeof text === 'string' && text.trim().toLowerCase() === 'fails.'){
                throw new Error('add_failed')
            }
        })
}

/**
 * Добавить торрент. magnet: либо http(s)://*.torrent.
 * Для HTTP-ссылки: сначала пытаемся fetch'нуть из браузера (Lampa имеет
 * сетевой доступ к Prowlarr/Jackett), полученный .torrent блоб шлём в
 * qBit как multipart-file. Это обходит ситуацию когда qBit-контейнер
 * не может достучаться до индексера напрямую (разные docker-сети).
 */
function add(magnetOrUrl, opts = {}){
    let cfg = config()

    if(!cfg.url) return Promise.reject(new Error('no_url'))
    if(!magnetOrUrl) return Promise.reject(new Error('no_url'))

    console.log('Qbittorrent: adding', magnetOrUrl.slice(0, 100), 'to', cfg.url)

    let isMagnet = /^magnet:/i.test(magnetOrUrl)

    if(isMagnet){
        let body = new FormData()
        body.append('urls', magnetOrUrl)
        body.append('firstLastPiecePrio', 'true')
        body.append('sequentialDownload', 'true')
        if(opts.title) body.append('rename', opts.title)
        return postAdd(cfg, body)
    }

    // HTTP-link: тянем .torrent через браузер, потом шлём в qBit как файл.
    // Если индексер вернул magnet (Content-Type text/...), достаём из тела.
    return fetch(magnetOrUrl).then((res) => {
        if(!res.ok) throw new Error('fetch_torrent_http_' + res.status)
        let ct = (res.headers.get('content-type') || '').toLowerCase()
        return res.blob().then(blob => ({blob, ct}))
    }).then(({blob, ct}) => {
        let body = new FormData()
        body.append('firstLastPiecePrio', 'true')
        body.append('sequentialDownload', 'true')
        if(opts.title) body.append('rename', opts.title)

        // Иногда индексер отдаёт magnet текстом (Content-Type text/plain),
        // а не .torrent файл. Распознаём и шлём как urls.
        if(ct.startsWith('text/') || ct.includes('json')){
            return blob.text().then(text => {
                let trimmed = text.trim()
                if(/^magnet:/i.test(trimmed)){
                    body.append('urls', trimmed)
                    return postAdd(cfg, body)
                }
                throw new Error('unexpected_response')
            })
        }

        // .torrent файл — отправляем как multipart-file.
        let filename = (opts.title || 'torrent') + '.torrent'
        body.append('torrents', blob, filename)
        return postAdd(cfg, body)
    })
}

/**
 * Кнопка «Проверка» в настройках — дёргает /api/v2/app/version.
 */
function test(){
    let cfg = config()

    if(!cfg.url){
        Noty.show(Lang.translate('qbittorrent_no_url'))
        return
    }

    Noty.show(Lang.translate('qbittorrent_testing'))

    fetch(cfg.url + '/api/v2/app/version').then((res) => {
        if(!res.ok) throw new Error('http_' + res.status)
        return res.text()
    }).then((version) => {
        Noty.show(Lang.translate('qbittorrent_test_ok') + (version ? ' v' + version.trim() : ''))
    }).catch((err) => {
        Noty.show(Lang.translate('qbittorrent_test_fail') + (err && err.message ? ' (' + err.message + ')' : ''))
    })
}

/**
 * Отправить торрент с UI-нотификацией.
 */
function send(magnetOrUrl, opts = {}){
    Noty.show(Lang.translate('qbittorrent_sending'))

    add(magnetOrUrl, opts).then(() => {
        Noty.show(Lang.translate('qbittorrent_sent'))
        listener.send('sent', {url: magnetOrUrl, opts})
    }).catch((err) => {
        let msg = Lang.translate('qbittorrent_error')
        if(err && err.message) msg += ' (' + err.message + ')'
        Noty.show(msg)
    })
}

export default {
    init,
    listener,
    configured,
    add,
    send,
    test
}
