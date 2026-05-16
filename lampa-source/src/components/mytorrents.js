import Category from '../interaction/items/category'
import Background from '../interaction/background'
import Utils from '../utils/utils'
import Torserver from '../interaction/torserver'
import Arrays from '../utils/arrays'
import CardModule from '../interaction/card/module/module'
import Torrent from '../interaction/torrent'
import Controller from '../core/controller'
import Lang from '../core/lang'
import Select from '../interaction/select'
import Router from '../core/router'
import EmptyRouter from '../interaction/empty/module/router'
import Qbittorrent from '../interaction/qbittorrent'
import Noty from '../interaction/noty'

/**
 * Компонент "Мои торренты"
 * @param {*} object 
 * @returns 
 */
function component(object){
    let comp = Utils.createInstance(Category, object, {
        empty: {
            router: 'mytorrents'
        }
    })

    comp.use(EmptyRouter, 0)

    comp.use({
        onCreate: function(){
            Torserver.my(result=>{
                result.forEach(item => {
                    item.title = item.title.replace('[LAMPA] ','')
                    item.data = Arrays.decodeJson(item.data,{})

                    if(item.data.movie && item.data.movie.poster) {
                        item.poster = item.data.movie.poster
                    }

                    if (item.data.movie && item.data.movie.release_date) {
                        item.release_date = item.data.movie.release_date;
                    }
                    
                    if (item.data.movie && item.data.movie.first_air_date) {
                        item.first_air_date = item.data.movie.first_air_date;
                    }

                    if (item.data.movie && item.data.movie.original_name) {
                        item.original_name = item.data.movie.original_name;
                    }

                    item.params = {
                        module: CardModule.only('Card', 'Release', 'Callback', 'Icons')
                    }
                })

                this.build({
                    results: result,
                })
            }, this.empty.bind(this))
        },
        onInstance: function(item, data){
            item.use({
                onEnter: function(){
                    if(!this.disabled) Torrent.open(data.hash, data.data.lampa && data.data.movie ? data.data.movie : false)
                },
                onFocus: function(){
                    Background.change(Utils.cardImgBackground(data))
                },
                onLong: function(){
                    if(this.disabled) return

                    let enabled = Controller.enabled().name
                    let menu    = []

                    // «Скачать в qBittorrent» — собираем magnet из hash+title
                    // (TorrServer не отдаёт нам исходный .torrent), отправляем
                    // через тот же qbittorrent.send что и из других мест.
                    if(data.hash){
                        menu.push({
                            title: Lang.translate('torrent_parser_qbittorrent_send'),
                            onSelect: ()=>{
                                if(!Qbittorrent.configured()){
                                    Noty.show(Lang.translate('qbittorrent_no_url'))
                                }
                                else{
                                    let magnet = 'magnet:?xt=urn:btih:' + String(data.hash).toLowerCase()
                                                + (data.title ? '&dn=' + encodeURIComponent(data.title) : '')
                                    Qbittorrent.send(magnet, {title: data.title})
                                }
                                Controller.toggle(enabled)
                            }
                        })
                    }

                    if(data.data.movie){
                        menu.push({
                            title: Lang.translate('title_card'),
                            onSelect: Router.call.bind(Router, 'full', data.data.movie)
                        })
                    }

                    menu.push({
                        title: Lang.translate('torrent_remove_title'),
                        del: true
                    })

                    Select.show({
                        title: Lang.translate('title_action'),
                        top: true,
                        items: menu,
                        onBack: ()=>{ Controller.toggle(enabled) },
                        onSelect: (a)=>{
                            // Подменю подтверждения удаления (как в Загрузках).
                            if(a.del){
                                Select.show({
                                    title: Lang.translate('downloads_delete_title').replace('%s', data.title || ''),
                                    top: true,
                                    items: [
                                        {title: Lang.translate('downloads_delete_confirm'), confirm: true},
                                        {title: Lang.translate('cancel')}
                                    ],
                                    onBack: ()=>{ Controller.toggle(enabled) },
                                    onSelect: (b)=>{
                                        if(b.confirm){
                                            Torserver.remove(data.hash)
                                            item.disable()
                                        }
                                        Controller.toggle(enabled)
                                    }
                                })
                            }
                            else if(a.onSelect){
                                a.onSelect()
                            }
                            else Controller.toggle(enabled)
                        }
                    })
                }
            })
        }
    })

    return comp
}

export default component
