import TorrentsMovieModal from '../../../interaction/torrents_modal/movie'
import TorrentsSeriesModal from '../../../interaction/torrents_modal/series'

export default {
    onCreate: function(){
        let button = this.html.find('.view--torrent')

        // Парсер всегда включён — кнопка «Смотреть» доступна, если торренты
        // вообще разрешены в сборке (lampa_settings.torrents_use).
        if(window.lampa_settings.torrents_use) button.addClass('selector').removeClass('hide')

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
