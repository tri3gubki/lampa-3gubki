// CUB Account удалён. Stub чтобы импорты в card.js/empty.js/timetable.js/
// bookmarks.js/full/start*/components/* и app.js резолвились. Все методы
// no-op, .Permit / .Bookmarks / .Modal / .Api — пустые объекты с
// безопасными значениями.

let Permit = {
    sync: false,
    access: false,
    token: '',
    child: false,
    child_small: false,
    account: { profile: { id: 0, age: 0 } },
    user: { premium: 0 }
}

let noop = function(){}

export default {
    init:         noop,
    task:         noop,
    hasPremium:   ()=> false,
    showCubPremium: noop,
    logoff:       noop,
    Permit:       Permit,
    Bookmarks:    {
        find:   ()=> null,
        get:    ()=> [],
        all:    ()=> [],
        clear:  noop,
        update: noop
    },
    Modal:        {
        account: noop,
        premium: noop,
        limited: noop
    },
    Api:          new Proxy({}, { get: ()=> noop })
}
