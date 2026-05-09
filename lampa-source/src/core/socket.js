// CUB-Socket удалён. Файл оставлен как no-op-stub только потому что его
// импортируют core/storage/workers.js, core/account/* и app.js — чтобы
// эти импорты резолвились и build не падал.
// Никаких подключений к wss://cub.rip больше не устанавливается.

import Subscribe from '../utils/subscribe'

let listener = Subscribe()

export default {
    listener,
    init:           function(){},
    send:           function(){},
    restart:        function(){},
    uid:            ()=> '',
    devices:        ()=> [],
    terminalAccess: ()=> false
}
