import Template from "../../interaction/template"
import Controller from '../../core/controller'
import Utils from '../../utils/utils'
import Lang from '../../core/lang'
import Emit from '../../utils/emit'
import TMDB from '../../core/api/sources/tmdb'
import Warning from '../../interaction/warning'
import Modal from '../../interaction/modal'
import Storage from '../../core/storage/storage'

class Descriptiopn extends Emit{
    constructor(data) {
        super()

        this.data = data
        this.card = data.movie

        this.emit('init')
    }
    
    create(){
        this.html = Template.get('items_line',{title: Lang.translate('full_detail')})

        let countries = TMDB.parseCountries(this.card)
        let date      = (this.card.release_date || this.card.first_air_date || '') + ''

        this.body = Template.get('full_descr',{
            text: (this.card.overview || Lang.translate('full_notext')) + '<br><br>',
            relise: date.length > 3 ? Utils.parseTime(date).full : date.length > 0 ? date : Lang.translate('player_unknown'),
            budget: '$ ' + Utils.numberWithSpaces(this.card.budget || 0),
            countries: countries.join(', ')
        })

        if(!this.card.budget) $('.full--budget', this.body).remove()
        if(!countries.length) $('.full--countries', this.body).remove()

        this.body.find('.selector').on('hover:focus hover:enter hover:hover hover:touch',(e)=>{
            this.last = e.target
        })

        if(this.card.adult){
            let warning = new Warning({
                type: 'full-adult',
                title: Lang.translate('adult_content_title'),
                text: Lang.translate('adult_content_text_warning'),
                icon: '<svg><use xlink:href="#sprite-adult"></use></svg>',
                button: {
                    title: Lang.translate('title_watch')
                },
                onSelect: () => {
                    Modal.open({
                        title: Lang.translate('adult_content_title'),
                        size: 'small',
                        scroll: {
                            nopadding: true
                        },
                        html: $('<div class="about">' + Lang.translate('adult_content_text_modal') + '</div>'),
                        buttons: [
                            {
                                name: Lang.translate('adult_content_confirm'),
                                onSelect: () => {
                                    Modal.close()

                                    Controller.toggle('full_descr')

                                    Storage.set('adult_content_view', true)

                                    Lampa.Activity.refresh()
                                }
                            },
                            {
                                name: Lang.translate('adult_content_deny'),
                                onSelect: () => {
                                    Modal.close()

                                    Controller.toggle('full_descr')
                                }
                            }
                        ],
                        onBack: () => {
                            Modal.close()
                            
                            Controller.toggle('full_descr')
                        }
                    })
                }
            })

            $('.full-descr__left', this.body).append(warning.render())
        }

        this.html.find('.items-line__body').append(this.body)

        this.emit('create')
    }

    toggle(){
        let controller = {
            link: this,
            toggle: ()=>{
                Controller.collectionSet(this.render())
                Controller.collectionFocus(this.last, this.render())

                this.emit('toggle')
            },
            update: ()=>{},
            right: ()=>{
                Navigator.move('right')
            },
            left: ()=>{
                if(Navigator.canmove('left')) Navigator.move('left')
                else this.emit('left')
            },
            down: ()=>{
                if(Navigator.canmove('down')) Navigator.move('down')
                else this.emit('down')
            },
            up: ()=>{
                if(Navigator.canmove('up')) Navigator.move('up')
                else this.emit('up')
            },
            back: this.emit.bind(this, 'back')
        }

        this.emit('controller', controller)

        Controller.add('full_descr', controller)

        Controller.toggle('full_descr')
    }

    render(js){
        return js ? this.html[0] : this.html
    }

    destroy(){
        this.body.remove()
        this.html.remove()

        this.emit('destroy')
    }
}

export default Descriptiopn