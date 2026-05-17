import Storage from '../../storage/storage'
import Utils from '../../../utils/utils'
import Reguest from '../../../utils/reguest'
import Lang from '../../lang'

let network = new Reguest()

function viewed(hash){
    let view = Storage.cache('torrents_view', 5000, [])

    return view.indexOf(hash) > -1
}

/**
 * Поиск раздач. Единственный источник — Prowlarr (адрес и ключ из настроек).
 */
function get(params = {}, oncomplite, onerror){
    let base = Utils.checkEmptyUrl(Storage.field('prowlarr_url') || '')

    if(!base){
        onerror(Lang.translate('torrent_parser_set_link') + ': Prowlarr')
        return
    }

    prowlarr(params, base, Storage.field('prowlarr_key'), 0, oncomplite, onerror)
}

// доки https://wiki.servarr.com/en/prowlarr/search#search-feed
function prowlarr(params = {}, base_url, api_key, source_rank, oncomplite, onerror){
    let q = []

    q.push({name: 'apikey', value: api_key || ''})
    q.push({name: 'query', value: params.search})

    if(!params.from_search){
        const isSerial = !!(params.movie.original_name)

        if(params.movie.number_of_seasons > 0) q.push({name: 'categories', value: '5000'})
        if(params.movie.original_language == 'ja') q.push({name: 'categories', value: '5070'})

        q.push({name: 'type', value: isSerial ? 'tvsearch' : 'search'})
    }

    let u = Utils.buildUrl(base_url, '/api/v1/search', q)

    network.timeout(1000 * Storage.field('parse_timeout'))

    network.native(u,(json)=>{
        if(Array.isArray(json)){
            let checked_at = Date.now()

            oncomplite({
                Results: json
                    .filter((e) => e.protocol === 'torrent')
                    .map((e) => {
                        const hash      = Utils.hash(e.title)
                        const timeValue = Utils.strToTime(e.publishDate)

                        return {
                            Title:       e.title,
                            Tracker:     e.indexer,
                            Size:        e.size,
                            PublishDate: Utils.strToTime(e.publishDate),
                            PublisTime:  timeValue,
                            Seeders:     parseInt(e.seeders),
                            Peers:       parseInt(e.leechers),
                            MagnetUri:   e.downloadUrl,
                            viewed:      viewed(hash),
                            checked_at,
                            source_rank,
                            hash
                        }
                    })
            })
        }
        else onerror(Lang.translate('torrent_parser_request_error') + ' (' + JSON.stringify(json) + ')')
    },()=>{
        onerror(Lang.translate('torrent_parser_no_responce') + ' (' + base_url + ')')
    })
}

function clear(){
    network.clear()
}

export default {
    get,
    clear
}
