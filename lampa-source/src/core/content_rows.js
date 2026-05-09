import Arrays from '../utils/arrays'
import Storage from '../core/storage/storage'

let rows = []
let component = 'content_rows'

function init(){
    // Раздел 'Каналы' (settings.addComponent) убран из UI. Сами rows
    // (Закладки/Расписание/etc) регистрируются через add() и
    // отрабатывают в call(), Storage.get(component+'_'+name, 'true')
    // даёт дефолт true — все rows показываются.
}

function add(row){
    if(typeof row == 'object' && typeof row.call == 'function'){
        if(rows.indexOf(row) == -1){
            rows.push(row)

            if(!row.name || !row.title){
                console.warn('Content row must have name and title', row)
            }
        }
    }
    else {
        console.warn('Content row must be an object with a call function', row)
    }
}

function remove(row){
    let index = rows.indexOf(row)

    if(index > -1){
        rows.splice(index, 1)
    }
}

function call(screen, params, calls){
    let stop = ['genres', 'keywords']

    if(stop.find(a=>params[a])) return

    rows.filter(row=>{
        return row.screen ? (Arrays.isArray(row.screen) ? row.screen.indexOf(screen) >= 0 : row.screen == screen) : false
    }).filter(row=>{
        return Storage.get(component + '_' + (row.name || 'unknown'), 'true')
    }).forEach((row)=>{
        let result = row.call(params, screen)

        if(Arrays.isArray(result)){
            result.forEach((callback, i)=>{
                if(typeof callback == 'function'){
                    Arrays.insert(calls, (row.index || 0) + i, callback)
                }
                else if(Arrays.isObject(callback)){
                    Arrays.insert(calls, (row.index || 0) + i, callback)
                }
            })
        }
        else if(Arrays.isObject(result)){
            Arrays.insert(calls, row.index || 0, result)
        }
        else if(typeof result == 'function'){
            Arrays.insert(calls, row.index || 0, result)
        }
    })
}

export default {
    init,
    add,
    remove,
    call
}