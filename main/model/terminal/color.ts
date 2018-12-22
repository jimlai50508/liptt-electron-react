export class Color {
    public attribute: Attribute
    public color: ForeColor
    public background: BackColor

    constructor() {
        this.default()
    }

    public default() {
        this.attribute = Attribute.None
        this.color = ForeColor.White
        this.background = BackColor.Black
    }

    public setStyle(style: number) {
        switch (style) {
            case 0:
                this.default()
                break
            case 1:
                this.attribute |= Attribute.Bold
                break
            case 4:
                this.attribute |= Attribute.Underline
                break
            case 5:
                this.attribute |= Attribute.Blink
                break
            case 7:
                this.attribute |= Attribute.Reverse
                break
            case 8:
                this.attribute |= Attribute.Invisible
                break
            case 30:
                this.color = ForeColor.Black
                break
            case 31:
                this.color = ForeColor.Red
                break
            case 32:
                this.color = ForeColor.Green
                break
            case 33:
                this.color = ForeColor.Yellow
                break
            case 34:
                this.color = ForeColor.Blue
                break
            case 35:
                this.color = ForeColor.Purple
                break
            case 36:
                this.color = ForeColor.Cyan
                break
            case 37:
                this.color = ForeColor.White
                break
            case 40:
                this.background = BackColor.Black
                break
            case 41:
                this.background = BackColor.Red
                break
            case 42:
                this.background = BackColor.Green
                break
            case 43:
                this.background = BackColor.Yellow
                break
            case 44:
                this.background = BackColor.Blue
                break
            case 45:
                this.background = BackColor.Purple
                break
            case 46:
                this.background = BackColor.Cyan
                break
            case 47:
                this.background = BackColor.White
                break
            case 48:
                this.background = BackColor.HighRed
                break
        }
    }
}

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
    Black = 30,
    /** 紅 */
    Red = 31,
    /** 綠 */
    Green = 32,
    /** 黃 */
    Yellow = 33,
    /** 藍 */
    Blue = 34,
    /** 紫 */
    Purple = 35,
    /** 靛 */
    Cyan = 36,
    /** 白 */
    White = 37,
}

/** 背景顏色控制碼 */
export enum BackColor {
    /** 黑 */
    Black = 40,
    /** 紅 */
    Red = 41,
    /** 綠 */
    Green = 42,
    /** 黃 */
    Yellow = 43,
    /** 藍 */
    Blue = 44,
    /** 紫 */
    Purple = 45,
    /** 靛 */
    Cyan = 46,
    /** 白 */
    White = 47,
    /** 亮紅 */
    HighRed = 48,
}
