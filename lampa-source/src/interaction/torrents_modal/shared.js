// Общие утилиты для торрент-модалок (фильмы / сериалы / аниме).
// Детект качества, фильтр мусора, раскладка по бакетам качества.

const TRASH_TAGS_RE = /\b(cam|hdcam|ts|hdts|hdtc|tc|telesync|telecine|workprint|screener|dvdscr)\b/i
const MIN_MOVIE_SIZE = 3 * 1024 * 1024 * 1024   // 3 GB

// Порядок качеств — лучшее → худшее.
const QUALITY_ORDER = ['4khdr', '4k', '1080', '720']
const QUALITY_LABEL = {
    '4khdr': '4K HDR',
    '4k':    '4K',
    '1080':  '1080p',
    '720':   '720p'
}

/**
 * Определить качество раздачи по названию.
 * HDR/HDR10/HDR10+/Dolby Vision — всё считается HDR-бакетом 4khdr.
 * @returns {'4khdr'|'4k'|'1080'|'720'|null}
 */
function detectQuality(title){
    let t = (title || '').toLowerCase()
    let is4k   = /(^|[^a-z0-9])(2160p|4k|uhd)([^a-z0-9]|$)/.test(t)
    let is1080 = /(^|[^a-z0-9])1080p?([^a-z0-9]|$)/.test(t)
    let is720  = /(^|[^a-z0-9])720p?([^a-z0-9]|$)/.test(t)
    let hdr    = /(hdr10\+?|\bhdr\b|dolby[\s.]?vision|\bdv\b)/.test(t)

    if(is4k)   return hdr ? '4khdr' : '4k'
    if(is1080) return '1080'
    if(is720)  return '720'
    return null
}

/**
 * Фильтр мусора для фильмов: только живые (Seeders ≥ 1), с распознанным
 * качеством, не камрипы/сканы, размером ≥ 3 ГБ. Плюс дедуп — одинаковые
 * качество+размер с разных трекеров схлопываются в самый живой.
 * @param {Array} items — массив Results от Parser
 * @returns {Array}
 */
function filterMovies(items){
    if(!Array.isArray(items)) return []

    let clean = items.filter(it => {
        if((it.Seeders || 0) < 1) return false
        if(TRASH_TAGS_RE.test(it.Title || '')) return false
        if(!detectQuality(it.Title)) return false
        if((it.Size || 0) < MIN_MOVIE_SIZE) return false
        return true
    })

    // Дедуп по сигнатуре «качество|bucket-размера(100MB)».
    let seen = new Map()
    clean.forEach(it => {
        let q      = detectQuality(it.Title)
        let bucket = Math.round((it.Size || 0) / (100 * 1024 * 1024))
        let key    = q + '|' + bucket
        let prev   = seen.get(key)
        if(!prev || (it.Seeders || 0) > (prev.Seeders || 0)) seen.set(key, it)
    })

    return Array.from(seen.values())
}

/**
 * Определить сезон(ы) раздачи по названию.
 * Возвращает {from,to} (from==to — один сезон) либо null.
 * Форматы русских трекеров (Kinozal/NoNaMe/RUDUB):
 *   S2E1-7        — сезон 2
 *   S1-5E1-62     — сезоны 1-5 (сборник)
 *   S1-3E24       — сезоны 1-3
 * Плюс русское «Сезон N» / «N сезон» и одиночное «S2».
 * @returns {{from:number,to:number}|null}
 */
function detectSeason(title){
    let t = (title || '')
    let m

    // Основной формат: S<n>[-<m>] перед блоком E<цифра>.
    m = t.match(/(?:^|[^a-z0-9])s(\d{1,2})(?:\s*-\s*(\d{1,2}))?e\d/i)
    // Русское «Сезон N» / «Сезоны N-M».
    if(!m) m = t.match(/сезон[ыа]?\s*[:№]?\s*(\d{1,2})(?:\s*-\s*(\d{1,2}))?/i)
    // «N-й сезон» / «N-M сезоны».
    if(!m) m = t.match(/(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s*-?\s*[йяе]?\s*сезон/i)
    // Одиночное «S2» без блока E (аниме / нестандарт).
    if(!m) m = t.match(/(?:^|[^a-z0-9])s(\d{1,2})(?:\s*-\s*(\d{1,2}))?(?:[^a-z0-9]|$)/i)

    if(!m) return null

    let from = parseInt(m[1])
    let to   = m[2] ? parseInt(m[2]) : from

    if(isNaN(from)) return null
    if(isNaN(to))   to = from

    return {from: Math.min(from, to), to: Math.max(from, to)}
}

/**
 * Фильтр для сериалов: ТОЛЬКО точный сезон (season_number). Живые
 * (Seeders ≥ 1), с распознанным качеством, не камрипы. Многосезонные
 * сборники (диапазон сезонов) отбрасываются целиком. Дедуп — как у фильмов.
 *
 * season_year — год выхода сезона (из TMDB). Нужен, чтобы отсеять чужие
 * сериалы с похожим названием (спин-оффы, одноимённые шоу): у русских
 * трекеров год выпуска всегда есть в названии, поэтому требуем совпадение
 * года ±1. Без года (season_year не задан) проверка пропускается.
 * @param {Array} items — массив Results от Parser
 * @param {number} season_number — нужный сезон
 * @param {number} [season_year] — год выхода сезона
 * @returns {Array}
 */
function filterSeries(items, season_number, season_year){
    if(!Array.isArray(items)) return []

    let clean = items.filter(it => {
        if((it.Seeders || 0) < 1) return false
        if(TRASH_TAGS_RE.test(it.Title || '')) return false
        if(!detectQuality(it.Title)) return false

        let s = detectSeason(it.Title || '')
        if(!s) return false
        // Только точный сезон — диапазоны (сборники) отбрасываем.
        if(s.from !== s.to) return false
        if(s.from !== season_number) return false

        // Год сезона — дисамбигуация одноимённых сериалов/спин-оффов.
        if(season_year){
            let years = (it.Title || '').match(/\b(?:19|20)\d{2}\b/g) || []
            let hit   = years.some(y => Math.abs(parseInt(y) - season_year) <= 1)
            if(!hit) return false
        }

        return true
    })

    return dedupeQuality(clean)
}

/**
 * Запасной фильтр для сериалов: многосезонные сборники (диапазон сезонов),
 * содержащие нужный сезон. Используется, когда точечных раздач сезона нет
 * вовсе — старые завершённые сериалы (GoT, Breaking Bad) на трекерах лежат
 * почти только полными сборниками S1-8.
 *
 * season_year проверяется как попадание в диапазон годов сборника
 * (у сборника в названии обычно «2011-2019») — отсекает чужие сериалы.
 * @param {Array} items
 * @param {number} season_number
 * @param {number} [season_year]
 * @returns {Array}
 */
function filterSeriesPacks(items, season_number, season_year){
    if(!Array.isArray(items)) return []

    let clean = items.filter(it => {
        if((it.Seeders || 0) < 1) return false
        if(TRASH_TAGS_RE.test(it.Title || '')) return false
        if(!detectQuality(it.Title)) return false

        let s = detectSeason(it.Title || '')
        if(!s) return false
        // Только сборники (диапазон сезонов), включающие нужный сезон.
        if(s.from === s.to) return false
        if(season_number < s.from || season_number > s.to) return false

        // Год сезона должен попадать в диапазон годов сборника (±1).
        if(season_year){
            let years = ((it.Title || '').match(/\b(?:19|20)\d{2}\b/g) || []).map(y => parseInt(y))
            if(years.length){
                let lo = Math.min.apply(null, years) - 1
                let hi = Math.max.apply(null, years) + 1
                if(season_year < lo || season_year > hi) return false
            }
        }

        return true
    })

    return dedupeQuality(clean)
}

/** Дедуп раздач по сигнатуре «качество|bucket-размера(100MB)». */
function dedupeQuality(items){
    let seen = new Map()

    items.forEach(it => {
        let q      = detectQuality(it.Title)
        let bucket = Math.round((it.Size || 0) / (100 * 1024 * 1024))
        let key    = q + '|' + bucket
        let prev   = seen.get(key)
        if(!prev || (it.Seeders || 0) > (prev.Seeders || 0)) seen.set(key, it)
    })

    return Array.from(seen.values())
}

/**
 * Разложить раздачи по бакетам качества. Возвращает только непустые
 * бакеты в порядке лучшее→худшее, внутри — топ-N. Логика единая для
 * фильмов и сериалов.
 *
 * Сортировка внутри бакета:
 *   4K HDR / 4K — по сидерам (при равенстве по размеру).
 *   1080p      — по размеру ≈ битрейту (при равенстве по сидерам).
 *   720p       — по сидерам.
 *
 * 720p показывается только когда нет качества лучше: если есть хоть один
 * бакет 4K HDR / 4K / 1080p — бакет 720p отбрасывается целиком.
 * @param {Array} items
 * @param {number} [top_n] — ограничение на бакет; без него — все
 * @returns {[{key:string, label:string, items:Array}]}
 */
function bucketize(items, top_n){
    let buckets = {}

    items.forEach(it => {
        let q = detectQuality(it.Title)
        if(!q) return
        if(!buckets[q]) buckets[q] = []
        buckets[q].push(it)
    })

    // 720p — только когда нет ничего лучше.
    if(buckets['720'] && (buckets['4khdr'] || buckets['4k'] || buckets['1080'])){
        delete buckets['720']
    }

    let out = []

    QUALITY_ORDER.forEach(key => {
        let list = buckets[key]
        if(!list || !list.length) return

        list.sort((a, b) => {
            if(key === '1080'){
                // 1080p — по размеру (≈ битрейту).
                let zd = (b.Size || 0) - (a.Size || 0)
                if(zd) return zd
                return (b.Seeders || 0) - (a.Seeders || 0)
            }
            // 4K HDR / 4K / 720p — по сидерам.
            let sd = (b.Seeders || 0) - (a.Seeders || 0)
            if(sd) return sd
            return (b.Size || 0) - (a.Size || 0)
        })

        out.push({
            key:   key,
            label: QUALITY_LABEL[key],
            items: top_n ? list.slice(0, top_n) : list
        })
    })

    return out
}

export default {
    detectQuality,
    detectSeason,
    filterMovies,
    filterSeries,
    filterSeriesPacks,
    bucketize,
    QUALITY_LABEL
}
