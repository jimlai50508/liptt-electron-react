import { Block } from "./terminal/block"
import { Url } from "url"

export enum ReadState {
    未讀    = 0b0000_0001,
    已讀    = 0b0000_0010,
    已標記  = 0b0000_0100,
    新推文  = 0b0000_1000,
    鎖定    = 0b0001_0000,
    待處理  = 0b0010_0000,
    未定義  = 0b1000_0000,
}

export enum ArticleType {
    一般,
    回覆,
    轉文,
    未定義,
}

export interface ArticleAbstract {
    key: number
    like: number
    date: string
    state: ReadState
    deleted: boolean
    board: string
    author?: string
    type?: ArticleType
    category?: string
    title?: string
    aid?: string
    url?: string
    coin?: number // undefined表示沒有價格紀錄
}

export interface ArticleHeader {
    author?: string
    nickname?: string
    date?: string
    type?: ArticleType
    category?: string
    title?: string
    board?: string
    deleted?: boolean
    hasHeader?: boolean
    // from ArticleAbstract
    aid?: string
    url?: string
    coin?: number
}

// export interface Article {
//     key: number
//     like: number
//     date: Date
//     state: ReadState
//     deleted: boolean
//     author?: string
//     type?: ArticleType
//     subtitle?: string
//     title?: string
//     url?: Url
//     content?: Block[][]
//     echoes?: Block[][]
// }
