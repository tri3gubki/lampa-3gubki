import Select from '../select'
import Controller from '../../core/controller'
import Lang from '../../core/lang'
import Noty from '../noty'
import Qbittorrent from '../qbittorrent'

/**
 * Контекстное меню торрента для movie/series торрент-модалок.
 *
 * Вызывается по long-press на строке раздачи. Пункты:
 *   «Смотреть»             — обычное воспроизведение (как тап)
 *   «Скачать в qBittorrent»— отправить раздачу в qBit на загрузку
 *
 * Фокус после меню возвращается контроллеру 'torrents-modal' (его toggle
 * наводится на last_focus — строку, с которой был вызван long-press).
 */

/** Лучшая ссылка для qBit: magnet → http-ссылка на .torrent. */
function torrentLink(item){
    return item.MagnetUri || item.magnet || item.Link
        || item.downloadUrl || item.link || item.url || item.guid || ''
}

function sendToQbit(item){
    if(!Qbittorrent.configured()){
        Noty.show(Lang.translate('qbittorrent_no_url'))
        return
    }

    let url = torrentLink(item)

    if(!url){
        Noty.show(Lang.translate('qbittorrent_error') + ': no link')
        return
    }

    Qbittorrent.send(url, {title: item.Title || item.title || ''})
}

/**
 * Показать меню действий для раздачи.
 * @param {object}   item   — раздача (Results-элемент Parser)
 * @param {function} onPlay — колбэк воспроизведения (pickTorrent модалки)
 */
function openMenu(item, onPlay){
    Select.show({
        title: Lang.translate('title_action'),
        top:   true,
        items: [
            {
                title: Lang.translate('torrents_modal_watch'),
                play:  true
            },
            {
                title:    Lang.translate('torrents_modal_download'),
                subtitle: Lang.translate('torrents_modal_download_descr'),
                qbit:     true
            }
        ],
        onBack: ()=>{
            Controller.toggle('torrents-modal')
        },
        onSelect: (a)=>{
            if(a.play){
                // pickTorrent сам закроет модалку и запустит Torrent.start.
                if(onPlay) onPlay(item)
            }
            else{
                Controller.toggle('torrents-modal')

                if(a.qbit) sendToQbit(item)
            }
        }
    })
}

export default {
    openMenu
}
