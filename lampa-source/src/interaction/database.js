import Settings from './settings/api'
import Lang from '../core/lang'
import Storage from '../core/storage/storage'
import Cache from '../utils/cache'
import Favorite from '../core/favorite'
import Noty from './noty'
import Select from './select'
import Controller from '../core/controller'

function init(){
    // Кнопки 'Очистить историю' и 'Очистить кэш' добавляются динамически
    // в раздел 'Интерфейс' (settings_main_interface) под подзаголовком
    // 'Кеш и данные'. Раньше был отдельный компонент data — удалён.
    let component = 'interface'

    Settings.addParam({
        component,
        param: {
            type: 'title'
        },
        field: {
            name: Lang.translate('settings_rest_cache_all')
        }
    })

    Settings.addParam({
        component,
        param: {
            type: 'button'
        },
        field: {
            name: Lang.translate('fav_clear_title')
        },
        onChange: ()=>{
            Favorite.clear('history')
            Noty.show(Lang.translate('torrent_error_made'))
        }
    })

    Settings.addParam({
        component,
        param: {
            type: 'button'
        },
        field: {
            name: Lang.translate('settings_rest_cache')
        },
        onChange: ()=>{
            Select.show({
                title: Lang.translate('settings_rest_cache'),
                items: [
                    {
                        title: Lang.translate('settings_rest_cache_only'),
                        subtitle: Lang.translate('settings_rest_cache_only_descr')
                    },
                    {
                        title: Lang.translate('settings_rest_cache_all'),
                        subtitle: Lang.translate('settings_rest_cache_all_descr'),
                        full: true
                    }
                ],
                onSelect: (a)=>{
                    Controller.toggle('settings_component')

                    Storage.clear(a.full)
                    Cache.clearAll()
                },
                onBack: ()=>{
                    Controller.toggle('settings_component')
                }
            })
        }
    })
}

export default {
    init
}
