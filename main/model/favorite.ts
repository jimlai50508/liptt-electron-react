/** 我的最愛類型 */
export enum FavoriteItemType {
    /** 看板 */
    Board,
    /** 目錄 */
    Folder,
    /** 分隔線 */
    Horizontal,
}

/** 我的最愛項目 */
export interface FavoriteItem {
    key: number
    type: FavoriteItemType
    name?: string
    description?: string
    popularity?: number
}
