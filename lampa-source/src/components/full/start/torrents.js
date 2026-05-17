import Storage from '../../../core/storage/storage'
import TorrentsMovieModal from '../../../interaction/torrents_modal/movie'
import TorrentsSeriesModal from '../../../interaction/torrents_modal/series'

export default {
    onCreate: function(){
        let status = Storage.field('parser_use')
        let button = this.html.find('.view--torrent')

        if(window.lampa_settings.torrents_use) button.toggleClass('selector', status).toggleClass('hide',!status)

        button.on('hover:enter',()=>{
            // Сериал (есть .name / .original_name) → series-модал с выбором
            // сезона. Фильм → movie-модал. Оба — overlay поверх текущей
            // страницы, без перехода на отдельную Activity.
            let isSeries = !!(this.card.name || this.card.original_name)

            if(isSeries) TorrentsSeriesModal.open(this.card)
            else TorrentsMovieModal.open(this.card)
        })
    }
}
