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
 * Разложить раздачи по бакетам качества. Возвращает только непустые
 * бакеты в порядке лучшее→худшее, внутри — топ-N по сидерам
 * (при равенстве — по размеру).
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

    let out = []

    QUALITY_ORDER.forEach(key => {
        let list = buckets[key]
        if(!list || !list.length) return

        list.sort((a, b) => {
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
    filterMovies,
    bucketize,
    QUALITY_LABEL
}
