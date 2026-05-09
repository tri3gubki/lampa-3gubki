import Utils from '../../utils/utils'

/**
 * URL для API-запроса TMDB
 */
function api(url){
    return Utils.protocol() + 'api.themoviedb.org/3/' + url
}

/**
 * URL для изображения TMDB. Нормализуем двойные слеши после "https://"
 * — TMDB API часто возвращает poster_path с leading "/", из-за чего
 * получалось image.tmdb.org/t/p/w300//qKK...jpg → Safari ругался на CORS.
 */
function image(url){
    let full = Utils.protocol() + 'image.tmdb.org/' + url
    return full.slice(0, 8) + full.slice(8).replace(/\/+/g, '/')
}

/**
 * Заглушка — раньше счётчик битых картинок переключал на TMDB-прокси.
 * Прокси удалены, но image.onerror в карточках всё ещё дёргает функцию.
 */
function broken(){}

function key(){
    return '4ef0d7355d9ffb5151e987764708ce96'
}

export default {
    api,
    key,
    image,
    broken
}
