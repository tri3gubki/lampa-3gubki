import Utils from '../utils/utils'

function init(){
    Utils.putScriptAsync([
        './vender/hls/hls.js',
        './vender/dash/dash.js',
        './vender/qrcode/qrcode.js'
    ], ()=>{})
}

export default {
    init
}
