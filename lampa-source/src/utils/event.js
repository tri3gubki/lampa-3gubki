// События через сокет — CUB-Socket удалён, класс превращён в no-op,
// чтобы существующие `this.event.call(...) / cancel(...) / destroy()` в
// full/start*.js не падали. Никаких реальных колбэков от сервера нет.

function Event(){
    this.call    = function(){}
    this.cancel  = function(){}
    this.destroy = function(){}
}

export default Event
