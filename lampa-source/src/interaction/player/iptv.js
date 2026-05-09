// IPTV-плеер удалён (core/iptv.js уже снесён). Stub чтобы импорты
// `import TV from './iptv'` в player.js / video.js / panel.js
// резолвились. Все методы no-op, playning() возвращает false, listener —
// пустой Subscribe (никто на него ничего не пошлёт).

import Subscribe from '../../utils/subscribe'

let listener = Subscribe()
let noop     = function(){}

export default {
    listener,
    init:            noop,
    start:           noop,
    playning:        ()=> false,
    channel:         noop,
    programReady:    noop,
    reset:           noop,
    play:            noop,
    select:          noop,
    nextChannel:     noop,
    prevChannel:     noop,
    prevProgram:     noop,
    nextProgram:     noop,
    drawProgram:     noop,
    playlistProgram: noop,
    openMenu:        noop,
    redrawChannel:   noop,
    destroy:         noop
}
