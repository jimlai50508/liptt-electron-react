import { MailAbstract } from "../model"

//   編號   日 期 作 者          信  件  標  題                  (容量:201/200篇)

export class MailCache {

    public maxSize: number
    private _size: number
    private minIndex: number
    private collection: Map<number, MailAbstract>
    private alreadyGet: number

    constructor() {
        this.collection = new Map<number, MailAbstract>()
        this.clear()
    }

    public clear() {
        this.collection.clear()
        this.alreadyGet = 0
        this._size = 0
        this.maxSize = 0
        this.minIndex = Number.MAX_SAFE_INTEGER
    }

    public set size(n: number) {
        this._size = n
        if (n === 0) {
            this.minIndex = 0
        }
    }

    public get size(): number {
        return this._size
    }

    public get isEmpty(): boolean {
        return this.collection.size === 0
    }

    /** 加入新的項目 */
    public add(abs: MailAbstract) {
        if (!abs) {
            return
        }
        this.collection.set(abs.key, abs)
        this.minIndex = this.minIndex > abs.key ? abs.key : this.minIndex
    }

    /** 剩餘未讀取的項目個數 */
    public get remain(): number {
        return this.collection.size - this.alreadyGet
    }

    public getMore(n: number): MailAbstract[] {
        const result: MailAbstract[] = []
        const skip = this.alreadyGet
        const iterator = this.collection.entries()
        for (let i = 0; i < skip; i++) {
            iterator.next()
        }
        for (let item = iterator.next(); item.value && n > 0; item = iterator.next()) {
            const a = item.value[1]
            result.push({...a})
            n = n - 1
        }

        this.alreadyGet += result.length
        return result
    }

    public get hasMore(): boolean {
        return this.minIndex > 1
    }

    public get isOverflow(): boolean {
        return this.size > this.maxSize
    }
}
