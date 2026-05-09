import Controller from '../../../../core/controller'
import Lang from '../../../../core/lang'
import More from '../../../more'


export default {
    // Кнопка 'Ещё' в углу шапки row (onVisible) убрана —
    // юзер не хочет дублирующую кнопку. More-карточка в конце ряда
    // (onScroll) сохранена — появляется когда доскроллил до последней
    // карточки и работает как 'загрузить следующую страницу'.

    onScroll: function(){
        if(!this.more && this.data.results.length == this.items.length && this.data.total_pages > 1){
            this.more = new More(this.params.more)

            this.more.create()
            this.more.size(this.items[this.items.length - 1].render(true))

            this.more.html.on('hover:focus hover:touch', ()=>{
                this.last = this.more.render(true)

                this.active = this.items.indexOf(this.more)

                this.scroll.update(this.more.render(true), this.params.items.align_left ? false : true)
            })

            this.more.html.on('hover:enter', this.emit.bind(this, 'more', this.data))

            this.scroll.append(this.more.render(true))

            this.items.push(this.more)

            if(Controller.own(this)) Controller.collectionAppend(this.more.render(true))
        }
    }
}