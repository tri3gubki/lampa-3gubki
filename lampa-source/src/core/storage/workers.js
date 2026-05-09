import Utils from '../../utils/utils'
import Storage from './storage'
import Arrays from '../../utils/arrays'


class WorkerArray{
    constructor(field){
        this.field  = field
        this.empty  = []
        this.data   = []
        this.limit  = 3000
        this.loaded = false
        this.update_time = 0
    }

    init(class_type){
        // CUB-Socket / Account-event'ы удалены — listener'ы Storage и
        // Socket больше не нужны. Помечаем worker как loaded, ничего
        // удалённо не загружаем.
        this.class_type = class_type
        this.loaded     = true
    }

    restrict(result){
        if(Arrays.isObject(result)){
            let keys = Arrays.getKeys(result)

            if(keys.length > this.limit){
                let remv = keys.slice(0, keys.length - this.limit)

                remv.forEach(k=>{
                    delete result[k]
                })
            }
        }
        else if(result.length > this.limit){
            result = result.slice(result.length - this.limit)
        }

        return result
    }

    parse(from, nolisten){
        let to = Storage.cache(this.field, this.limit, Arrays.clone(this.empty))

        this.filter(from, to)

        Storage.set(this.field, to, nolisten)

        this.data = this.restrict(Arrays.decodeJson(localStorage.getItem(this.field),Arrays.clone(this.empty)))

        Lampa.Listener.send('worker_storage',{type:'insert', name:this.field, from, to})
    }

    filter(from, to){
        from.forEach(a=>{
            if(to.indexOf(a) == -1) to.push(a)
        })
    }

    update(full, nolisten){
        // CUB-sync удалён → загружать с сервера нечего, помечаем loaded
        // чтобы остальной флоу не блокировался ожиданием remote-данных.
        this.loaded = true
    }

    removeFromSocket(data){
        Arrays.remove(this.data, data.value)

        let store = Storage.cache(this.field, this.limit, Arrays.clone(this.empty))

        Arrays.remove(store, data.value)

        Storage.set(this.field, store, true)
    }

    updateFromSocket(data){
        let from = [data.value]

        this.parse(from, true)
    }

    send(id, value){}
    sendRemove(id, value){}
    sendClean(){}

    save(value){
        let uniq = value.filter(a=>this.data.indexOf(a) == -1)

        uniq.forEach(val=>{
            this.data.push(val)

            this.send(null, val)
        })
    }

    remove(value){
        Arrays.remove(this.data, value)

        this.sendRemove(null, value)
    }

    clean(){
        this.data = []

        this.sendClean()
    }
}

class WorkerFilterID extends WorkerArray {
    filter(from, to) {
        from.forEach(a=>{
            let find = to.find(b=>b.id == a.id)

            if(!find) to.push(a)
            else{
                to[to.indexOf(find)] = a
            }
        })
    }

    removeFromSocket(data){
        let find = this.data.find(a=>a.id == data.id)

        if(find) Arrays.remove(this.data, find)

        let store = Storage.cache(this.field, this.limit, Arrays.clone(this.empty))

        find = store.find(a=>a.id == data.id)

        if(find) Arrays.remove(store, find)

        Storage.set(this.field, store, true)
    }

    updateFromSocket(data){
        let from = [data.value]

        this.parse(from, true)
    }

    save(value){
        let uniq = []

        value.forEach(val=>{
            let find = this.data.find(a=>a.id == val.id)

            if(!find){
                this.data.push(typeof val == 'object' ? Arrays.clone(val) : val)

                uniq.push(val)
            } 
            else if(JSON.stringify(val) !== JSON.stringify(find)){
                this.data[this.data.indexOf(find)] = typeof val == 'object' ? Arrays.clone(val) : val
                
                uniq.push(val)
            }
        })

        uniq.forEach(val=>{
            this.send(val.id, val)
        })
    }

    remove(id){
        let find = this.data.find(a=>a.id == id)

        if(find) Arrays.remove(this.data, find)

        this.sendRemove(id, null)
    }
}

class WorkerObject extends WorkerArray {
    constructor(params){
        super(params)
        
        this.data  = {}
        this.empty = {}
    }

    filter(from, to) {
        for(let id in from){
            to[id] = from[id]
        }
    }

    removeFromSocket(data){
        delete this.data[id]

        let store = Storage.cache(this.field, this.limit, Arrays.clone(this.empty))

        delete store[id]

        Storage.set(this.field, store, true)
    }

    updateFromSocket(data){
        let object = {}
            object[data.id] = data.value

        this.parse(object, true)
    }

    save(value){
        let uniq = []

        for(let id in value){
            let a = value[id]
            let b = this.data[id]

            if(!this.data[id]){
                this.data[id] = typeof a == 'object' ? Arrays.clone(a) : a

                uniq.push(id)
            }
            else{
                a = JSON.stringify(a)
                b = JSON.stringify(b)

                if(a !== b){
                    this.data[id] = typeof value[id] == 'object' ? Arrays.clone(value[id]) : value[id]

                    uniq.push(id)
                }
            }
        }

        uniq.forEach(id=>{
            this.send(id, value[id])
        })
    }

    remove(id){
        delete this.data[id]

        this.sendRemove(id, null)
    }

    clean(){
        this.data = {}

        this.sendClean()
    }
}

export default {
    //['string',0499383]
    array_string: WorkerArray,

    //[{'id':'049994',...}]
    array_object_id: WorkerFilterID,

    //{'id048994':{...}, ...}
    object_object: WorkerObject,

    //{'id399884':'string', ...}
    object_string: WorkerObject
}