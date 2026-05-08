import Utils from '../utils/utils'
import Manifest from '../core/manifest'
import Platform from '../core/platform'

/**
 * Инициализация дополнительных библиотек
 * @returns {void}
 */
function init(){
    let include = []

    // Видео библиотеки
    include = include.concat(['hls/hls.js', 'dash/dash.js', 'qrcode/qrcode.js'].map(lib=>{
        return window.location.protocol == 'file:' || window.location.href.indexOf('chrome-extension') > -1 ? Manifest.github_lampa + 'vender/' + lib : './vender/' + lib
    }))

    // CUB-плагины (sport, tsarea, shots) и YouTube IFrame API удалены.
    // Остаются только локальные video-библиотеки выше (hls/dash/qrcode).

    Utils.putScriptAsync(include,()=>{})
}

export default {
    init
}