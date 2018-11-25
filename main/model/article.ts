export enum ArticleType {
    一般,
    回覆,
    轉文,
    未定義,
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
