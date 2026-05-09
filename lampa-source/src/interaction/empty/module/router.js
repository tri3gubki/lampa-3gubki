import Lang from '../../../core/lang'
import Template from '../../template'
import Arrays from '../../../utils/arrays'

export default {
    onEmpty: function(e){
        Arrays.extend(this.params, {
            empty: {
                width: 'medium',
                buttons: []
            }
        })

        let params = this.params.empty

        if(params.router == 'bookmarks'){
            params.title  = Lang.translate('empty_bookmark_title')
            params.descr  = Lang.translate('empty_bookmark_text')
            params.icon   = Template.string('icon_empty_bookmarks')
        }

        if(params.router == 'favorites'){
            params.title  = Lang.translate(params.type == 'history' ? 'empty_history_title' : 'empty_bookmark_title')
            params.icon   = Template.string(params.type == 'history' ? 'icon_empty_history' : 'icon_empty_bookmarks')

            if(params.type == 'history') params.descr  = Lang.translate('empty_history_text')
            else params.descr  = Lang.translate('empty_bookmark_text')
        }

        if(params.router == 'mytorrents'){
            params.title  = Lang.translate('empty_mytorrents_title')
            params.descr  = Lang.translate('empty_mytorrents_text')
            params.icon   = Template.string('icon_empty_torrents')
        }

        // CUB Device.login удалён — кнопка «Войти в CUB» больше не показывается.
    }
}