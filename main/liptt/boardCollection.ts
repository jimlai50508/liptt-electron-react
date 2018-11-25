import { ArticleAbstract } from "../model"

/** 蒐集看板頁面資訊 */
export class BoardCache {

    public name: string
    public popularity: string
    /** key: 文章編號 */
    private collection: Map<number, ArticleAbstract>
    private masterCollection: Map<string, ArticleAbstract>
    private alreadyGet: number
    private minIndex: number

    constructor() {
        this.collection = new Map<number, ArticleAbstract>()
        this.masterCollection = new Map<string, ArticleAbstract>()
        this.clear()
    }

    public clear() {
        this.collection.clear()
        this.masterCollection.clear()
        this.alreadyGet = 0
        this.minIndex = Number.MAX_SAFE_INTEGER
        this.name = ""
        this.popularity = ""
    }

    public get isEmpty(): boolean {
        return this.collection.size === 0 && this.masterCollection.size === 0
    }

    /** 加入新的項目 */
    public add(abs: ArticleAbstract) {
        if (!abs) {
            return
        }
        const index = abs.key
        if (index === Number.MAX_SAFE_INTEGER) {
            // 置底文
            if (abs.aid) {
                this.masterCollection.set(abs.aid, abs)
                abs.key = Number.MAX_SAFE_INTEGER - this.masterCollection.size
            }
        } else {
            this.collection.set(abs.key, abs)
            this.minIndex = this.minIndex > abs.key ? abs.key : this.minIndex
        }
    }

    /** 剩餘未讀取的項目個數 */
    public get remain(): number {
        return this.masterCollection.size + this.collection.size - this.alreadyGet
    }

    public getMore(n: number): ArticleAbstract[] {
        const result: ArticleAbstract[] = []
        if (this.alreadyGet < this.masterCollection.size) {
            const it = this.masterCollection.entries()
            for (let i = 0; i < this.alreadyGet; i++) {
                it.next()
            }
            for (let item = it.next(); item.value && n > 0; item = it.next()) {
                const a = item.value[1]
                result.push({...a})
                n = n - 1
            }
        }

        if (n === 0) {
            this.alreadyGet += result.length
            return result
        }

        const skip = this.alreadyGet - this.masterCollection.size
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
}
