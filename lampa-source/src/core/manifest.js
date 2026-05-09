// Manifest — версия и githab-fallback. Все CUB-mirrors (cub_domain,
// cub_mirrors, soc_mirrors, qr_*) удалены. Если что-то в коде ещё их
// читает — заменено заглушкой ('cub_domain' → пустая строка).

let object = {
    author: 'Yumata',
    github: 'https://github.com/yumata/lampa-source',
    css_version: '3.1.8',
    app_version: '3.1.8',
    cub_site: '',           // оставляю пустым на случай если кто-то читает
    apk_link_download: ''
}

let plugins = []

Object.defineProperty(object, 'app_digital', { get: ()=> parseInt(object.app_version.replace(/\./g,'')) })
Object.defineProperty(object, 'css_digital', { get: ()=> parseInt(object.css_version.replace(/\./g,'')) })

Object.defineProperty(object, 'plugins', {
    get: ()=> plugins,
    set: (plugin)=> {
        if(typeof plugin == 'object' && typeof plugin.type == 'string'){
            plugins.push(plugin)
        }
    }
})

/**
 * Ссылка на GitHub с файлами приложения (используется в putScriptAsync
 * для file:// и chrome-extension://)
 */
Object.defineProperty(object, 'github_lampa', {
    get: ()=> 'https://yumata.github.io/lampa/',
    set: ()=> {}
})

// Заглушка — некоторые места всё ещё читают Manifest.cub_domain через
// строковую конкатенацию URL. Вернём пустую строку, чтобы получались
// невалидные URL и запрос не уходил.
Object.defineProperty(object, 'cub_domain', { get: ()=> '' })
Object.defineProperty(object, 'cub_mirrors', { get: ()=> [] })
Object.defineProperty(object, 'cub_mirrors_only_https', { get: ()=> [] })

export default object
