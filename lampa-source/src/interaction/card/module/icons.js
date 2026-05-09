import Template from '../../template'

export default {
    onCreate: function(){
        let data = this.data

        if(data.original_name){
            this.html.find('.card__view')?.append(Template.elem('div', {class: 'card__type', text: data.original_name ? 'TV' : 'MOV'}))
            this.html.addClass(data.original_name ? 'card--tv' : 'card--movie')
        }
    }
}
