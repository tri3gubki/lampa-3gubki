import Controller from '../core/controller'
import Scroll from '../interaction/scroll'
import Activity from '../interaction/activity/activity'
import Lang from '../core/lang'
import Background from '../interaction/background'
import Storage from '../core/storage/storage'
import Player from '../interaction/player'
import Select from '../interaction/select'
import Noty from '../interaction/noty'
import Loading from '../interaction/loading'
import TMDB from '../core/api/sources/tmdb'
import Utils from '../utils/utils'

const VIDEO_RE = /\.(mkv|mp4|avi|mov|m4v|webm|ts|m2ts|mpeg|mpg|wmv|flv|3gp|3g2|vob|ogv)$/i
const TMDB_CACHE_KEY = 'downloads_tmdb_cache'
const TMDB_CACHE_VERSION = 3
const TMDB_CACHE_MAX = 500
const TMDB_CACHE_TTL = 30 * 24 * 60 * 60 * 1000   // 30 дней
const SEASON_CACHE_KEY = 'downloads_season_cache'

function qbit_base(){
    return (Storage.field('qbittorrent_url') || '').replace(/\/+$/, '')
}

function delete_token(){
    return Storage.field('qbittorrent_delete_token') || ''
}

function files_url(rel_path){
    let base = qbit_base()
    if(!base) return ''
    let encoded = String(rel_path || '').split('/').map(s => s ? encodeURIComponent(s) : '').join('/')
    if(encoded.charAt(0) !== '/') encoded = '/' + encoded
    return base + '/files' + encoded
}

function size_human(bytes){
    if(!bytes || isNaN(bytes)) return ''
    let n = parseFloat(bytes), units = ['Б','КБ','МБ','ГБ','ТБ'], i = 0
    while(n >= 1024 && i < units.length - 1){ n /= 1024; i++ }
    let dec = (n < 10 && i > 0) ? 2 : (n < 100 ? 1 : 0)
    return n.toFixed(dec) + ' ' + units[i]
}

function strip_trail(p){
    if(!p || p === '/') return p
    return p.charAt(p.length - 1) === '/' ? p.slice(0, -1) : p
}

function normalize_qbit_path(content_path){
    if(typeof content_path !== 'string' || !content_path) return ''
    if(content_path.indexOf('/downloads') === 0){
        let rest = content_path.slice('/downloads'.length)
        return rest || '/'
    }
    return content_path
}

/**
 * Распарсить имя файла/папки в TMDB-запрос: чистое название + год.
 *   "Crime.101.2026.x265.WEB-DL.2160p.HDR10Plus.mkv"  → {title:"Crime 101", year:2026}
 *   "Kimetsu.no.Yaiba.s01.2019.BDRip.1080p"           → {title:"Kimetsu no Yaiba", year:2019}
 *   "ONE.PIECE.S02.2160p.DV.HDR"                       → {title:"ONE PIECE", year:null}
 */
function parseTitle(name, isDir){
    let s = name
    if(!isDir) s = s.replace(/\.[^.]+$/, '')               // убрать .mkv
    s = s.replace(/[._]+/g, ' ')                            // точки/подчёркивания → пробелы

    let yearMatch = s.match(/\b(19\d{2}|20\d{2})\b/)
    let year = yearMatch ? parseInt(yearMatch[1], 10) : null
    if(yearMatch) s = s.slice(0, yearMatch.index)           // отрезать всё после года

    s = s.replace(/\b[sS]\d{1,2}([eE]\d{1,3})?\b/g, '')     // S01E01
    s = s.replace(/\bseason\s*\d+\b/gi, '')                 // season 1
    s = s.replace(/\b(2160p|1080p|720p|480p|360p|UHD|HDR|HDR10\+?|HDR10Plus|DV|SDR|WEB-?DL|WEBRip|BDRip|BluRay|Blu-?ray|REMUX|HEVC|H\.?265|H\.?264|x265|x264|HQ|AC3|DTS|DDP|MULTi|Hybrid|Limited)\b/gi, '')

    s = s.replace(/[\(\[\{][^)\]\}]*[\)\]\}]/g, '')         // снести [GROUP], (TAG)
    s = s.replace(/[-_]+\w+$/, '')                          // -RELEASEGROUP в конце
    s = s.replace(/\s+/g, ' ').trim()

    return {title: s, year}
}

/**
 * Кеш TMDB-матчей в localStorage. Структура:
 *   {v: 1, items: { "<cache_key>": {poster, title, ts} }}
 * cache_key = название файла/папки (как есть). LRU не нужен — TTL обрезает.
 */
function loadCache(){
    try{
        let raw = window.localStorage.getItem(TMDB_CACHE_KEY)
        if(!raw) return {v: TMDB_CACHE_VERSION, items: {}}
        let parsed = JSON.parse(raw)
        if(parsed.v !== TMDB_CACHE_VERSION) return {v: TMDB_CACHE_VERSION, items: {}}
        return parsed
    }
    catch(e){
        return {v: TMDB_CACHE_VERSION, items: {}}
    }
}

function saveCache(cache){
    try{
        // Тримим до TMDB_CACHE_MAX по timestamp (старшее — выкидываем)
        let keys = Object.keys(cache.items)
        if(keys.length > TMDB_CACHE_MAX){
            let sorted = keys.sort((a, b) => (cache.items[a].ts || 0) - (cache.items[b].ts || 0))
            let drop = sorted.slice(0, keys.length - TMDB_CACHE_MAX)
            drop.forEach(k => delete cache.items[k])
        }
        window.localStorage.setItem(TMDB_CACHE_KEY, JSON.stringify(cache))
    }
    catch(e){}
}

let _cache = null
function cacheGet(name){
    if(!_cache) _cache = loadCache()
    let entry = _cache.items[name]
    if(!entry) return null
    if(Date.now() - (entry.ts || 0) > TMDB_CACHE_TTL) return null
    return entry
}
function cacheSet(name, data){
    if(!_cache) _cache = loadCache()
    _cache.items[name] = Object.assign({}, data, {ts: Date.now()})
    saveCache(_cache)
}

/**
 * Найти постер для имени через TMDB. Кешированно. Resolve(null) если не нашли.
 */
function lookupPoster(name, isDir){
    let cached = cacheGet(name)
    if(cached) return Promise.resolve(cached)

    let parsed = parseTitle(name, isDir)
    if(!parsed.title || parsed.title.length < 2){
        cacheSet(name, {poster: null, title: null, miss: true})
        return Promise.resolve({poster: null, title: null})
    }

    return new Promise((resolve) => {
        TMDB.multi({
            query: encodeURIComponent(parsed.title),
            language: Storage.field('tmdb_lang') || Storage.field('language') || 'en'
        }, (data) => {
            let pick = null

            if(data && data.results && data.results.length){
                // Приоритет: совпадение года, потом первый результат
                if(parsed.year){
                    pick = data.results.find(r => {
                        let d = (r.release_date || r.first_air_date || '') + ''
                        return d.slice(0, 4) === String(parsed.year)
                    }) || data.results[0]
                }
                else{
                    pick = data.results[0]
                }
            }

            let pickYear = ''
            if(pick){
                let d = (pick.release_date || pick.first_air_date || '') + ''
                pickYear = d.slice(0, 4)
            }

            let entry = {
                poster:     pick && pick.poster_path ? TMDB.img(pick.poster_path, 'w342') : null,
                title:      pick ? (pick.title || pick.name) : null,
                year:       pickYear || null,
                tmdb_id:    pick ? pick.id : null,
                media_type: pick ? pick.media_type : null,
                miss:       !pick
            }

            cacheSet(name, entry)
            resolve(entry)
        }, () => {
            // На ошибке TMDB просто резолвим без постера, не кешируем
            // (возможно сеть моргнула — пусть в следующий раз попробует)
            resolve({poster: null, title: null})
        })
    })
}

/**
 * Парсит номер сезона из имени папки. "Show.S02.HDR" → 2, "season 3" → 3.
 * Если не найдено — возвращает null (caller дефолтит в 1).
 */
function parseSeasonNum(name){
    let m = name.match(/[sS](\d{1,2})\b/)
    if(m) return parseInt(m[1], 10)
    m = name.match(/season\s*(\d{1,2})/i)
    if(m) return parseInt(m[1], 10)
    return null
}

/**
 * Парсит номер эпизода из имени файла. Поддерживает S01E05, 1x05, E05.
 */
function parseEpisodeNum(name){
    let m = name.match(/[sS]\d{1,2}[eE](\d{1,3})/)
    if(m) return parseInt(m[1], 10)
    m = name.match(/\b\d{1,2}x(\d{1,3})\b/)
    if(m) return parseInt(m[1], 10)
    m = name.match(/[eE](\d{1,3})/)
    if(m) return parseInt(m[1], 10)
    return null
}

/**
 * Кеш season-данных {tv_id_season → episodes[]} в localStorage.
 * Эпизоды в TMDB не часто меняются, длинный TTL.
 */
function loadSeasonCache(){
    try{
        let raw = window.localStorage.getItem(SEASON_CACHE_KEY)
        return raw ? JSON.parse(raw) : {}
    }
    catch(e){ return {} }
}
function saveSeasonCache(c){
    try{ window.localStorage.setItem(SEASON_CACHE_KEY, JSON.stringify(c)) }
    catch(e){}
}

function fetchSeason(tv_id, season, on_done){
    let cache = loadSeasonCache()
    let key = tv_id + '_' + season
    if(cache[key] && Date.now() - (cache[key].ts || 0) < TMDB_CACHE_TTL){
        return on_done(cache[key].episodes)
    }

    let lang = Storage.field('tmdb_lang') || Storage.field('language') || 'en'
    TMDB.get('tv/' + tv_id + '/season/' + season, {language: lang}, (data) => {
        if(data && Array.isArray(data.episodes)){
            cache[key] = {episodes: data.episodes, ts: Date.now()}
            saveSeasonCache(cache)
            on_done(data.episodes)
        }
        else on_done(null)
    }, () => on_done(null))
}

function fetch_listing(dir, on_ok, on_err){
    let url = files_url(dir)
    if(!url) return on_err('no_url')
    if(url.charAt(url.length - 1) !== '/') url += '/'

    fetch(url, {headers: {'Accept': 'application/json'}}).then(res => {
        if(!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
    }).then(data => on_ok(Array.isArray(data) ? data : []))
      .catch(err => on_err(err.message || 'fetch_failed'))
}

function match_torrent(target_rel, torrents){
    let target = strip_trail(target_rel)
    if(!target) return null
    let best = null, best_len = -1
    torrents.forEach(t => {
        let qrel = strip_trail(normalize_qbit_path(t.content_path))
        if(!qrel) return
        let kind = null
        if(qrel === target) kind = 'exact'
        else if(target.indexOf(qrel + '/') === 0) kind = 'parent_of_target'
        else if(qrel.indexOf(target + '/') === 0) kind = 'child_of_target'
        if(kind && qrel.length > best_len){
            best = {torrent: t, kind}
            best_len = qrel.length
        }
    })
    return best
}

// ===== qBit-state кеш на 8 сек =====
// Один GET /torrents/info на load() страницы используется всеми карточками
// для определения play/pause-state. После toggle инвалидируем.
const QBIT_TTL = 8 * 1000
let _torrents_cache = {data: null, ts: 0}
let _files_cache    = {}     // {hash: {data, ts}}

function qbit_invalidate(){
    _torrents_cache = {data: null, ts: 0}
    _files_cache    = {}
}

function qbit_get_torrents(on_done, force){
    let base = qbit_base()
    if(!base) return on_done('no_url', [])

    let now = Date.now()
    if(!force && _torrents_cache.data && (now - _torrents_cache.ts) < QBIT_TTL){
        return on_done(null, _torrents_cache.data)
    }

    fetch(base + '/api/v2/torrents/info').then(res => {
        if(!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
    }).then(data => {
        let arr = Array.isArray(data) ? data : []
        _torrents_cache = {data: arr, ts: Date.now()}
        on_done(null, arr)
    }).catch(err => on_done(err.message, []))
}

function qbit_get_files(hash, on_done, force){
    if(!hash) return on_done('no_hash', [])

    let now = Date.now()
    let cached = _files_cache[hash]
    if(!force && cached && (now - cached.ts) < QBIT_TTL){
        return on_done(null, cached.data)
    }

    let url = qbit_base() + '/api/v2/torrents/files?hash=' + encodeURIComponent(hash)
    fetch(url).then(res => {
        if(!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
    }).then(data => {
        let arr = Array.isArray(data) ? data : []
        // qBit ниже 4.5 не отдаёт index в /files — добавляем позиционный
        // (нужен для filePrio)
        arr.forEach((f, i) => { if(typeof f.index !== 'number') f.index = i })
        _files_cache[hash] = {data: arr, ts: Date.now()}
        on_done(null, arr)
    }).catch(err => on_done(err.message, []))
}

function qbit_set_torrent_state(hash, action, on_done){
    let body = new URLSearchParams()
    body.set('hashes', hash)
    fetch(qbit_base() + '/api/v2/torrents/' + action, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: body.toString()
    }).then(res => {
        if(!res.ok) throw new Error('HTTP ' + res.status)
        qbit_invalidate()
        on_done(null)
    }).catch(err => on_done(err.message))
}

function qbit_set_file_priority(hash, file_index, priority, on_done){
    let body = new URLSearchParams()
    body.set('hash', hash)
    body.set('id', String(file_index))
    body.set('priority', String(priority))
    fetch(qbit_base() + '/api/v2/torrents/filePrio', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: body.toString()
    }).then(res => {
        if(!res.ok) throw new Error('HTTP ' + res.status)
        delete _files_cache[hash]
        on_done(null)
    }).catch(err => on_done(err.message))
}

/**
 * Внутри списка files торрента ищет файл соответствующий target_rel.
 * qBit отдаёт file.name относительно save_path ('Show/E01.mkv'),
 * target — абсолютный rel-путь '/Show/E01.mkv'.
 */
function match_file_in_torrent(target_rel, torrent, files){
    if(!files || !files.length) return null
    let t_rel = strip_trail(target_rel)
    let t_no_slash = t_rel.replace(/^\/+/, '')
    let qrel = strip_trail(normalize_qbit_path(torrent.content_path))
    let t_under_root = (t_rel.indexOf(qrel + '/') === 0) ? t_rel.slice(qrel.length + 1) : ''

    for(let i = 0; i < files.length; i++){
        let f = files[i]
        let n = String(f.name || '')
        if(n === t_no_slash)   return f
        if(n === t_under_root) return f
        // suffix-match как fallback
        if(n.length && t_no_slash.length && t_no_slash.slice(-n.length) === n) return f
    }
    return null
}

function torrent_paused(t){
    if(!t) return false
    let s = String(t.state || '')
    return s === 'pausedDL' || s === 'pausedUP' ||
           s === 'stoppedDL' || s === 'stoppedUP' ||
           s === 'paused' || s === 'stopped'
}

function torrent_downloading(t){
    if(!t) return false
    let s = String(t.state || '')
    return s === 'downloading' || s === 'stalledDL' || s === 'metaDL' ||
           s === 'queuedDL' || s === 'forcedDL'
}

function progress_completed(obj){
    if(!obj) return false
    let p = parseFloat(obj.progress)
    return !isNaN(p) && p >= 0.999
}

/**
 * Возвращает {ctrl, paused} для карточки или null если кнопку показывать
 * не нужно (нет в qBit / уже скачано / неподдерживаемое state как error/checking).
 *   ctrl = {mode:'torrent'|'file', hash, file_index?}  — что отправлять при toggle
 *   paused = текущее состояние paused/downloading
 */
function compute_state(rel_path, torrents, files_by_hash){
    let m = match_torrent(rel_path, torrents)
    if(!m) return null

    let t = m.torrent

    if(m.kind === 'parent_of_target'){
        // Файл-внутри-multi-file торрента — per-file state
        let files = files_by_hash[t.hash]
        if(!files) return null
        let f = match_file_in_torrent(rel_path, t, files)
        if(!f) return null
        if(progress_completed(f)) return null   // файл уже скачан → кнопки нет
        // priority=0 → файл на паузе; >0 → качается
        let paused = (f.priority === 0)
        return {
            ctrl: {mode: 'file', hash: t.hash, file_index: f.index},
            paused
        }
    }

    // exact или child_of_target → весь торрент
    if(progress_completed(t)) return null
    if(!torrent_paused(t) && !torrent_downloading(t)) return null   // error/checking/seeding-of-complete

    return {
        ctrl: {mode: 'torrent', hash: t.hash},
        paused: torrent_paused(t)
    }
}

function qbit_delete(hash, on_ok, on_err){
    let body = new URLSearchParams()
    body.set('hashes', hash)
    body.set('deleteFiles', 'true')
    fetch(qbit_base() + '/api/v2/torrents/delete', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: body.toString()
    }).then(res => {
        if(!res.ok) throw new Error('HTTP ' + res.status)
        on_ok()
    }).catch(err => on_err(err.message))
}

function webdav_delete(rel_path, is_dir, on_ok, on_err){
    let url = files_url(rel_path)
    if(is_dir && url.charAt(url.length - 1) !== '/') url += '/'
    let token = delete_token()
    if(!token) return on_err('пустой токен в настройках qBittorrent')

    let headers = {'X-Delete-Token': token}
    if(is_dir) headers['Depth'] = 'infinity'
    fetch(url, {method: 'DELETE', headers}).then(res => {
        if(res.ok || res.status === 204 || res.status === 404) on_ok()
        else if(res.status === 403) throw new Error('403 — неверный токен удаления')
        else throw new Error('HTTP ' + res.status)
    }).catch(err => {
        // "Failed to fetch" в Chrome/Safari означает CORS-блок: nginx вернул
        // 403 без CORS-заголовков. Подсказываем пользователю что искать.
        let msg = err.message || String(err)
        if(/failed to fetch/i.test(msg)) msg = 'CORS-блок (вероятно неверный токен удаления)'
        on_err(msg)
    })
}

/**
 * Компонент «Загрузки».
 * @param {*} object — { path?: string }
 */
function component(object){
    let self = this
    let scroll = new Scroll({mask: true, over: true, step: 250})
    let html   = $('<div class="downloads"></div>')
    let path   = (object && object.path) || '/'
    let last
    // Контекст TV-сериала когда мы внутри папки сезона. {tv_id, episodes_by_num}
    // или null. Используется в buildCard чтобы для эпизодов вытащить
    // настоящее название серии и стоп-кадр (still_path) вместо постера шоу.
    let tv_context = null

    self.create = function(){
        Background.change('')
        html.append(scroll.render())
        scroll.minus()
        self.load()
        return html
    }

    self.load = function(){
        if(!qbit_base()){
            renderUnconfigured()
            self.activity.loader(false)
            self.activity.toggle()
            return
        }

        self.activity.loader(true)

        fetch_listing(path, (data) => {
            resolveTvContext(() => {
                renderList(data)
                self.activity.loader(false)
                self.activity.toggle()
            })
        }, (err) => {
            renderError(err)
            self.activity.loader(false)
            self.activity.toggle()
        })
    }

    /**
     * Резолвит TV-контекст по имени папки в которой мы находимся:
     * lookupPoster(folder) → если media_type='tv', тянем season episodes.
     * Колбэк вызывается всегда — с tv_context установленным или null.
     */
    function resolveTvContext(done){
        tv_context = null
        if(path === '/') return done()

        let segs = path.replace(/\/+$/, '').split('/').filter(Boolean)
        if(!segs.length) return done()
        let folder = segs[segs.length - 1]

        lookupPoster(folder, true).then(entry => {
            if(!entry || entry.miss || !entry.tmdb_id || entry.media_type !== 'tv') return done()

            let season = parseSeasonNum(folder) || 1
            fetchSeason(entry.tmdb_id, season, (eps) => {
                if(eps && eps.length){
                    let by_num = {}
                    eps.forEach(ep => {
                        if(typeof ep.episode_number === 'number') by_num[ep.episode_number] = ep
                    })
                    tv_context = {tv_id: entry.tmdb_id, season, episodes: by_num}
                }
                done()
            })
        })
    }

    function renderUnconfigured(){
        let body = $('<div class="downloads__state"></div>')
        body.html('<div class="downloads__state-title">' + Lang.translate('downloads_unconfigured_title') + '</div>'
                + '<div class="downloads__state-descr">' + Lang.translate('downloads_unconfigured_descr') + '</div>')
        scroll.body().empty().append(body)
    }

    function renderError(msg){
        let body = $('<div class="downloads__state downloads__state--err"></div>')
        body.html('<div class="downloads__state-title">' + Lang.translate('downloads_error') + ': ' + msg + '</div>')
        scroll.body().empty().append(body)
    }

    function renderEmpty(){
        let body = $('<div class="downloads__state"></div>')
        body.html('<div class="downloads__state-title">' + Lang.translate('downloads_empty') + '</div>')
        scroll.body().empty().append(body)
    }

    function renderList(data){
        scroll.body().empty()
        let visible = data.filter(e => e && e.name && (e.type === 'directory' || VIDEO_RE.test(e.name)))
        if(!visible.length) return renderEmpty()
        visible.sort((a, b) => {
            let ad = a.type === 'directory', bd = b.type === 'directory'
            if(ad !== bd) return ad ? -1 : 1
            return String(a.name).localeCompare(String(b.name), undefined, {numeric: true})
        })

        // Внутри сезона сериала (tv_context) — карточки 16:9 (стоп-кадры),
        // в ряд по 4. Снаружи — стандартные постеры 2:3 по 7.
        let cols_class = tv_context ? 'cols--4' : 'cols--7'
        let grid = $('<div class="mapping--grid"></div>').addClass(cols_class)
        if(tv_context) grid.addClass('downloads-grid--episodes')
        scroll.append(grid)

        // Префетч qBit-state для всех карточек одним запросом + параллельные
        // /files для уникальных hash'ей где есть multi-file совпадения.
        // На время префетча карточки рендерятся без оверлей-иконок —
        // overlay-render идёт после resolve.
        prefetchStates(visible, (torrents, files_by_hash) => {
            visible.forEach(entry => {
                let rel_path = (path === '/' ? '/' : path) + entry.name + (entry.type === 'directory' ? '/' : '')
                let state = compute_state(rel_path, torrents, files_by_hash)
                let card = buildCard(entry, state, torrents, files_by_hash)
                grid.append(card)
            })
        })
    }

    /**
     * Один GET /torrents/info, потом параллельные /files для всех hash'ей
     * где entry — файл-в-multi-file-торренте (parent_of_target).
     */
    function prefetchStates(visible, on_done){
        qbit_get_torrents((err, torrents) => {
            if(err){
                // qBit недоступен — рендерим без play/pause кнопок, удаление
                // всё равно проверит qBit при подтверждении.
                return on_done([], {})
            }

            let need_files = {}
            visible.forEach(entry => {
                let rel = (path === '/' ? '/' : path) + entry.name + (entry.type === 'directory' ? '/' : '')
                let m = match_torrent(rel, torrents)
                if(m && m.kind === 'parent_of_target') need_files[m.torrent.hash] = true
            })

            let hashes = Object.keys(need_files)
            if(!hashes.length) return on_done(torrents, {})

            let pending = hashes.length
            let by_hash = {}
            hashes.forEach(h => {
                qbit_get_files(h, (ferr, files) => {
                    if(!ferr) by_hash[h] = files
                    if(--pending === 0) on_done(torrents, by_hash)
                })
            })
        })
    }

    function buildCard(entry, state, torrents, files_by_hash){
        let is_dir   = entry.type === 'directory'
        let rel_path = (path === '/' ? '/' : path) + entry.name + (is_dir ? '/' : '')

        let parsed       = parseTitle(entry.name, is_dir)
        let displayTitle = parsed.title || entry.name

        // Структура совпадает с .card из Lampa-шаблона card.js — получаем
        // готовое позиционирование/aspect-ratio постера, focus-обводку
        // и единообразный с остальными страницами вид. Внутрь добавляем
        // emoji-плейсхолдер 📁/🎬 чтобы пустые карточки до загрузки
        // постера не были чёрными плашками. Поверх — оверлей-иконка
        // play/pause если торрент качается (информативная, не selector).
        let icon = state ? (state.paused ? 'play' : 'pause') : null
        let icon_html = icon
            ? `<div class="downloads-card__state downloads-card__state--${icon}"><svg><use xlink:href="#sprite-${icon}"></use></svg></div>`
            : ''

        let card = $(`<div class="card selector downloads-card">
            <div class="card__view">
                <img class="card__img" />
                <div class="downloads-card__placeholder">${is_dir ? '📁' : '🎬'}</div>
                ${icon_html}
            </div>
            <div class="card__title"></div>
            <div class="card__age"></div>
        </div>`)

        let img = card.find('.card__img')[0]
        img.style.opacity = '0'
        img.onload  = () => { img.style.opacity = '1'; card.addClass('downloads-card--loaded') }
        img.onerror = () => { img.removeAttribute('src') }

        // ===== Случай 1: внутри сезона сериала, файл — эпизод =====
        if(!is_dir && tv_context){
            card.addClass('downloads-card--episode')

            let ep_num = parseEpisodeNum(entry.name)
            let ep     = ep_num != null ? tv_context.episodes[ep_num] : null

            if(ep){
                let title = (ep_num ? 'E' + String(ep_num).padStart(2, '0') + ' · ' : '')
                          + (ep.name || displayTitle)
                card.find('.card__title').text(title)
                if(ep.air_date) card.find('.card__age').text(ep.air_date.slice(0, 4))

                if(ep.still_path){
                    img.src = TMDB.img(ep.still_path, 'w300')
                }
            }
            else{
                card.find('.card__title').text(displayTitle)
                if(parsed.year) card.find('.card__age').text(parsed.year)
            }
        }
        // ===== Случай 2: остальное (фильм/папка-сериал/файл-вне-сезона) =====
        else{
            card.find('.card__title').text(displayTitle)
            if(parsed.year) card.find('.card__age').text(parsed.year)

            lookupPoster(entry.name, is_dir).then(entry_data => {
                if(!entry_data) return
                if(entry_data.poster) img.src = entry_data.poster
                if(entry_data.title)  card.find('.card__title').text(entry_data.title)
                if(entry_data.year)   card.find('.card__age').text(entry_data.year)
            })
        }

        card.on('hover:focus', (e) => {
            last = e.target
            scroll.update($(e.target), true)
        })

        card.on('hover:enter', () => {
            if(is_dir){
                Activity.push({
                    url: '',
                    title: parsed.title || entry.name,
                    component: 'downloads',
                    path: rel_path,
                    page: 1
                })
            }
            else{
                let url = files_url(rel_path)
                Player.play({
                    url,
                    title: displayTitle,
                    timeline: {hash: 'dl:' + rel_path, time: 0, duration: 0, percent: 0}
                })
            }
        })

        card.on('hover:long', () => promptActions(entry, rel_path, card, state))

        return card
    }

    function promptActions(entry, rel_path, row, state){
        let enabled = Controller.enabled().name

        Loading.start()
        qbit_get_torrents((err, torrents) => {
            Loading.stop()

            let m = err ? null : match_torrent(rel_path, torrents)
            let fresh_state = err ? null : compute_state(rel_path, torrents, _files_cache_to_data())

            let items = []

            if(fresh_state){
                items.push({
                    title: fresh_state.paused
                        ? Lang.translate('downloads_resume')
                        : Lang.translate('downloads_pause'),
                    subtitle: fresh_state.ctrl.mode === 'file'
                        ? Lang.translate('downloads_pause_file_descr')
                        : Lang.translate('downloads_pause_torrent_descr'),
                    toggle: true,
                    state: fresh_state
                })
            }

            // Удаление — без подзаголовка-простыни, подтверждение в подменю.
            items.push({
                title: Lang.translate('downloads_delete'),
                del: true
            })

            Select.show({
                title: Lang.translate('title_action'),
                top: true,
                items,
                onBack:   () => Controller.toggle(enabled),
                onSelect: (a) => {
                    if(a.toggle){
                        performToggle(a.state, row, enabled)
                    }
                    else if(a.del){
                        confirmDelete(entry, rel_path, m, row, enabled)
                    }
                    else Controller.toggle(enabled)
                }
            })
        })
    }

    /**
     * Подменю подтверждения удаления — Да / Отмена. Открывается из
     * promptActions при выборе пункта «Удалить».
     */
    function confirmDelete(entry, rel_path, m, row, enabled){
        Select.show({
            title: Lang.translate('downloads_delete_title').replace('%s', entry.name),
            top: true,
            items: [
                {title: Lang.translate('downloads_delete_confirm'), confirm: true},
                {title: Lang.translate('cancel')}
            ],
            onBack:   () => Controller.toggle(enabled),
            onSelect: (a) => {
                if(a.confirm) performDelete(entry, rel_path, m, row, enabled)
                else Controller.toggle(enabled)
            }
        })
    }

    /**
     * Helper для compute_state — мы не передаём files_by_hash в promptActions,
     * но в кеше _files_cache они уже есть после prefetch'а. Конвертируем в
     * формат который compute_state ожидает.
     */
    function _files_cache_to_data(){
        let out = {}
        for(let h in _files_cache){
            if(_files_cache[h] && _files_cache[h].data) out[h] = _files_cache[h].data
        }
        return out
    }

    function performToggle(state, row, enabled){
        let was_paused = state.paused
        let new_paused = !was_paused
        let ctrl = state.ctrl

        // Optimistic UI — мгновенная замена иконки на карточке.
        let icon_el = row.find('.downloads-card__state')
        if(icon_el.length){
            icon_el.removeClass('downloads-card__state--play downloads-card__state--pause')
            icon_el.addClass(new_paused ? 'downloads-card__state--play' : 'downloads-card__state--pause')
            icon_el.find('use').attr('xlink:href', new_paused ? '#sprite-play' : '#sprite-pause')
        }

        let revert = () => {
            if(icon_el.length){
                icon_el.removeClass('downloads-card__state--play downloads-card__state--pause')
                icon_el.addClass(was_paused ? 'downloads-card__state--play' : 'downloads-card__state--pause')
                icon_el.find('use').attr('xlink:href', was_paused ? '#sprite-play' : '#sprite-pause')
            }
        }

        let on_done = (err) => {
            Controller.toggle(enabled)
            if(err){
                revert()
                Noty.show(Lang.translate('downloads_toggle_error') + ': ' + err)
            }
            else{
                Noty.show(was_paused ? Lang.translate('downloads_resumed') : Lang.translate('downloads_paused'))
            }
        }

        if(ctrl.mode === 'torrent'){
            qbit_set_torrent_state(ctrl.hash, was_paused ? 'start' : 'stop', on_done)
        }
        else if(ctrl.mode === 'file'){
            // priority 0 = пауза, 1 = Normal (возобновить)
            let prio = was_paused ? 1 : 0
            qbit_set_file_priority(ctrl.hash, ctrl.file_index, prio, on_done)
        }
    }

    function performDelete(entry, rel_path, m, row, enabled){
        let is_dir = entry.type === 'directory'
        Loading.start()

        let on_ok = () => {
            Loading.stop()
            Noty.show(Lang.translate('downloads_deleted'))
            try{ row.remove() }catch(e){}
            Controller.toggle(enabled)
            setTimeout(() => self.load(), m ? 1500 : 0)
        }

        let on_err = (err) => {
            Loading.stop()
            Noty.show(Lang.translate('downloads_delete_error') + ': ' + err)
            Controller.toggle(enabled)
        }

        if(m){
            qbit_delete(m.torrent.hash, () => {
                if(m.kind === 'child_of_target') webdav_delete(rel_path, true, on_ok, on_ok)
                else on_ok()
            }, on_err)
        }
        else{
            webdav_delete(rel_path, is_dir, on_ok, on_err)
        }
    }

    self.start = function(){
        Controller.add('content', {
            link: self,
            toggle: () => {
                Controller.collectionSet(scroll.render())
                Controller.collectionFocus(last || false, scroll.render())
            },
            up:    () => { if(Navigator.canmove('up'))    Navigator.move('up');    else Controller.toggle('head') },
            down:  () => { if(Navigator.canmove('down'))  Navigator.move('down') },
            left:  () => { if(Navigator.canmove('left'))  Navigator.move('left');  else Controller.toggle('menu') },
            right: () => { if(Navigator.canmove('right')) Navigator.move('right') },
            back:  () => Activity.backward()
        })

        Controller.toggle('content')
    }

    self.pause   = () => {}
    self.resume  = () => {}
    self.stop    = () => {}
    self.render  = () => html
    self.destroy = () => {
        scroll.destroy()
        html.remove()
    }
}

export default component
