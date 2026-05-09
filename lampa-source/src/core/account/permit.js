// CUB Permit удалён. Stub. Все флаги в "выключенном" состоянии,
// чтобы все условные ветки (`if(Permit.sync)`, `if(Permit.access)`,
// `if(Permit.child)`) уходили в else.
export default {
    sync: false,
    access: false,
    token: '',
    child: false,
    child_small: false,
    account: { profile: { id: 0, age: 0 } },
    user: { premium: 0 },
    profile: { age: 0 }
}
