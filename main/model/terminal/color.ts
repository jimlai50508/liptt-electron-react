/** 字塊屬性 */
export enum Attribute {
    /** 無效果 */
    None = 0,
    /** 高亮的 */
    Bold = 1 << 0,
    /** 有底線的 */
    Underline = 1 << 1,
    /** 閃爍的 */
    Blink = 1 << 2,
    /** 反白的 */
    Reverse = 1 << 3,
    /** 不可見的 */
    Invisible = 1 << 4,
}

/** 文字顏色控制碼 */
export enum ForeColor {
    /** 黑 */
    Black     = 30,
    /** 紅 */
    Red       = 31,
    /** 綠 */
    Green     = 32,
    /** 黃 */
    Yellow    = 33,
    /** 藍 */
    Blue      = 34,
    /** 紫 */
    Purple    = 35,
    /** 靛 */
    Cyan      = 36,
    /** 白 */
    White     = 37,
}

/** 背景顏色控制碼 */
export enum BackColor {
    /** 黑 */
    Black     = 40,
    /** 紅 */
    Red       = 41,
    /** 綠 */
    Green     = 42,
    /** 黃 */
    Yellow    = 43,
    /** 藍 */
    Blue      = 44,
    /** 紫 */
    Purple    = 45,
    /** 靛 */
    Cyan      = 46,
    /** 白 */
    White     = 47,
    /** 亮紅 */
    HighRed   = 48,
}
