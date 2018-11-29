import { Big5UAO, big5HalfWidthList } from "../../encoding"
import { Block } from "./block"
import { Color, Attribute } from "./color"

export const TerminalWidth = 80
export const TerminalHeight = 24

type byte = number

/** PTT的傳統Terminal畫面 */
export class Terminal {
    /** content : 終端畫面資料, 24 row, 80 column */
    private content: Block[][]
    /** 代表游標當前位置(X座標) */
    private col: number
     /** 代表游標當前位置(Y座標) */
    private row: number
    /** 暫存的游標位置(X座標) */
    private saveCol: number
    /** 暫存的游標位置(Y座標) */
    private saveRow: number
    /** 代表當前游標的顏色 */
    private curColor: Color

    constructor() {
        this.col = 0
        this.row = 0
        this.curColor = new Color()
        this.saveCol = 0
        this.saveRow = 0
        this.content = []
        for (let i = 0; i < TerminalHeight; i++) {
            this.content[i] = []
            for (let j = 0; j < TerminalWidth; j++) {
                this.content[i][j] = new Block()
            }
        }
    }

    get Content(): Block[][] {
        return this.content
    }

    /** 清除 */
    public Clear(typ?: number) {
        if (!typ) {
            typ = 0
        }

        switch (typ) {
            case 0: // clear after
                for (let j = this.col; j < TerminalWidth; j++) {
                    this.content[this.row][j].Default()
                }
                for (let i = this.row + 1; i < TerminalHeight; i++) {
                    for (let j = 0; j < TerminalWidth; j++) {
                        this.content[i][j].Default()
                    }
                }
                break
            case 1: // clear before
                for (let j = 0; j <= this.col; j++) {
                    this.content[this.row][j].Default()
                }
                for (let i = 0; i < this.row; i++) {
                    for (let j = 0; j < TerminalWidth; j++) {
                        this.content[i][j].Default()
                    }
                }
                break
            case 2: // clear entire
                for (let i = 0; i < TerminalHeight; i++) {
                    for (let j = 0; j < TerminalWidth; j++) {
                        this.content[i][j].Default()
                    }
                }
                break
        }
    }

    /** 抹除當前行 */
    public ClearLine(typ?: number) {
        if (!typ) {
            typ = 0
        }

        switch (typ) {
            case 0: // clear blocks after cursor
                for (let j = this.col; j < TerminalWidth; j++) {
                    this.content[this.row][j].Default()
                }
                break
            case 1: // clear blocks before cursor
                for (let j = 0; j <= this.col; j++) {
                    this.content[this.row][j].Default()
                }
                break
            case 2: // clear entire
                for (let j = 0; j < TerminalWidth; j++) {
                    this.content[this.row][j].Default()
                }
                break
        }
    }

    /** 倒退 */
    public Backspace() {
        if (this.col > 0) {
            this.col--
        } else if (this.row > 0) {
            this.row--
        }
    }

    /** 清除當前字塊 */
    public Delete() {
        this.content[this.row][this.col].Default()
    }

    /** CR */
    public CarriageReturn() {
        this.col = 0
    }

    /** 移動游標至指定位置, (0, 0)為起始位置 */
    public Move(row: number, col: number) {
        if (col >= 0 && col < TerminalWidth) {
            this.col = col
        }
        if (row >= 0 && row < TerminalHeight) {
            this.row = row
        }
    }

    /** 向下 */
    public Down(n: number) {
        if (this.row + n >= TerminalHeight) {
            const r = this.row + n - TerminalHeight + 1
            if (r < TerminalHeight) {
                for (let i = 0; i < (TerminalHeight - r); i++) {
                    const tmp = this.content[i]
                    this.content[i] = this.content[i + r]
                    this.content[i + r] = tmp
                }
                for (let k = TerminalHeight - r; k < TerminalHeight; k++) {
                    for (let j = 0; j < TerminalWidth; j++) {
                        this.content[k][j].Default()
                    }
                }
            } else {
                this.Clear(2)
            }
        } else {
            this.row++
        }
    }

    /** 向上 */
    public Up(n: number) {
        if (this.row === 0) {
            const r = n
            if (r < TerminalHeight) {
                for (let i = TerminalHeight - 1; i >= r; i--) {
                    const tmp = this.content[i]
                    this.content[i] = this.content[i - r]
                    this.content[i - r] = tmp
                }
                for (let k = 0; k < r; k++) {
                    for (let j = 0; j < TerminalWidth; j++) {
                        this.content[k][j].Default()
                    }
                }
            } else {
                this.Clear(2)
            }
        } else {
            this.row--
        }
    }

    /** 向右 */
    public Right(n: number) {
        if (this.col + n < TerminalWidth) {
            this.col += n
        } else {
            this.col = TerminalWidth - 1
        }
    }

    /** 向左 */
    public Left(n: number) {
        if (this.col - n >= 0) {
            this.col -= n
        } else {
            this.col = 0
        }
    }

    /** 往下一個Block */
    public Next() {
        if (this.col < TerminalWidth) {
            this.col++
        } else if (this.row < TerminalHeight) {
            this.DefaultCurrentStyle()
            this.col = 0
            this.row++
        }
    }

    /** 暫存游標 */
    public Save() {
        this.saveCol = this.col
        this.saveRow = this.row
    }

    /** 載入先前暫存游標 */
    public Load() {
        this.col = this.saveCol
        this.row = this.saveRow
    }

    /** 從當前字塊插入資料 */
    public Insert(data: number) {
        const b = this.content[this.row][this.col]
        b.Attribute = this.curColor.attribute
        b.Foreground = this.curColor.color
        b.Background = this.curColor.background
        b.Content = data
        this.Next()
    }

    /** 重設當前文字及背景 */
    public DefaultCurrentStyle() {
        this.curColor.default()
    }

    /** 設定當前字塊樣式(屬性, 文字, 背景 ...) */
    public SetCurrentStyle(style: number) {
        this.curColor.setStyle(style)
    }

    /** 深層副本 */
    public DeepCopy(): Terminal {
        const term = new Terminal()
        term.content = []
        for (let i = 0; i < TerminalHeight; i++) {
            term.content[i] = []
            for (let j = 0; j < TerminalWidth; j++) {
                term.content[i][j] = new Block()
                term.content[i][j].Copy(this.content[i][j])
            }
        }
        term.col = this.col
        term.row = this.row
        term.curColor = new Color()
        term.curColor.attribute = this.curColor.attribute
        term.curColor.color = this.curColor.color
        term.curColor.background = this.curColor.background
        term.saveCol = this.saveCol
        term.saveRow = this.saveRow
        return term
    }

    /** 獲得某行字串內容 */
    public GetString(row: number): string {
        if (row < 0 || row >= TerminalHeight) {
            return ""
        }
        const msg = new Uint8Array(TerminalWidth)
        for (let j = 0; j < TerminalWidth; j++) {
            msg[j] = this.content[row][j].Content
        }
        return Big5UAO.GetString(msg)
    }

    /** 獲得某行局部字串內容 */
    public GetSubstring(row: number, start: number, end: number): string {
        if (row < 0 || row >= TerminalHeight) {
            return ""
        }
        if (start < 0 || end < 0 || start > end || start >= TerminalWidth || end > TerminalWidth) {
            return ""
        }

        const msg = new Uint8Array(end - start)
        for (let j = 0; j < end - start; j++) {
            msg[j] = this.content[row][start + j].Content
        }
        return Big5UAO.GetString(msg)
    }

    /** 取得特定的字塊內容 */
    public GetBlock(row: number, col: number): Block {
        return this.content[row][col]
    }

    public GetLines(): string[] {
        const lines: string[] = []
        for (let i = 0; i < TerminalHeight; i++) {
            lines.push(this.GetString(i))
        }
        return lines
    }

    public GetRenderString(): string {
        if (!this.content) {
            return ""
        }

        let str: string = ""
        for (let i = 0; i < TerminalHeight; i++) {
            str += Terminal.GetRenderStringLine(this.content[i])
        }
        return str
    }

    /** 取得渲染成HTML的單行資料 */
    public static GetRenderStringLine(line: Block[]): string {
        let str: string = ""
        str += "<span class=\"line\">"
        let fg: number = line[0].Foreground
        let bg: number = line[0].Background
        let attr: Attribute = line[0].Attribute
        let data: byte[] = []
        let cache: Block
        let isWChar: boolean = false
        for (let j = 0; j < TerminalWidth; j++) {
            const b = line[j]
            if (isWChar) {
                if ((cache.Foreground !== b.Foreground) || (cache.Background !== b.Background) || (cache.Attribute !== b.Attribute)) {
                    if (data.length > 0) {
                        str += this.getGroup(data, fg, bg, attr)
                        data = []
                    }
                    str += this.getHalfColorContent(cache.Content, b.Content, cache.Foreground, cache.Background, cache.Attribute, b.Foreground, b.Background, b.Attribute)
                    fg = b.Foreground
                    bg = b.Background
                    attr = b.Attribute
                } else if ((fg !== b.Foreground) || (bg !== b.Background) || (attr !== b.Attribute)) {
                    if (data.length > 0) {
                        str += this.getGroup(data, fg, bg, attr)
                        data = []
                    }
                    data.push(cache.Content)
                    data.push(b.Content)
                    fg = b.Foreground
                    bg = b.Background
                    attr = b.Attribute
                } else if (big5HalfWidthList.includes((cache.Content << 8) + b.Content)) {
                    // push to data
                    str += this.getGroup(data, fg, bg, attr)
                    str += this.getFullWidthContent(cache.Content, b.Content, fg, bg, attr)
                    data = []
                } else {
                    data.push(cache.Content)
                    data.push(b.Content)
                }

                isWChar = false
            } else if (b.Content >= 0x7F) {
                cache = b
                isWChar = true
            } else {

                if ((fg !== b.Foreground) || (bg !== b.Background) || (attr !== b.Attribute)) {

                    if (data.length > 0) {
                        str += this.getGroup(data, fg, bg, attr)
                        data = []
                    }

                    fg = b.Foreground
                    bg = b.Background
                    attr = b.Attribute
                }

                data.push(b.Content)
            }
        }

        if (data.length > 0) {
            str += this.getGroup(data, fg, bg, attr)
            data = null
        }

        str += "</span>"
        return str
    }

    private static getGroup(data: byte[], foreground: number, background: number, attr: Attribute): string {
        const bytes = Uint8Array.from(data)
        const fg = attr & Attribute.Bold ? `bf${attr & Attribute.Reverse ? 67 - foreground : foreground}` : `f${attr & Attribute.Reverse ? 67 - foreground : foreground}`
        const bg = `b${attr & Attribute.Reverse ? (87 - background) : background}`
        const s = Big5UAO.GetString(bytes)
        let width = 0
        for (let k = 0; k < s.length; k++) {
            if (s.charCodeAt(k) < 0x7F) {
                width += 0.5
            } else {
                width += 1
            }
        }

        return `<span class="keepSpace ${fg} ${bg}" style=\"width: ${width}em\">` + Terminal.convertHTML(s) + "</span>"
    }

    private static getHalfColorContent(ldata: byte, rdata: byte, lfg: number, lbg: number, lattr: Attribute, rfg: number, rbg: number, rattr: Attribute): string {
        const bytes = Uint8Array.from([ldata, rdata])
        let lfgcolor = lattr & Attribute.Bold ? "b" : ""
        let rfgcolor = rattr & Attribute.Bold ? "b" : ""

        lfgcolor += lattr & Attribute.Reverse ? `f${(67 - lfg)}` : `f${lfg}`
        rfgcolor += rattr & Attribute.Reverse ? `f${(67 - rfg)}` : `f${rfg}`

        const lbgcolor = `b${lattr & Attribute.Reverse ? (87 - lbg) : lbg}`
        const rbgcolor = `b${rattr & Attribute.Reverse ? (87 - rbg) : rbg}`

        const s = Big5UAO.GetString(bytes)
        const code = (ldata << 8) + rdata
        const style = big5HalfWidthList.includes(code) ? `style="width: 1em;"` : ""
        const text = Terminal.convertHTML(s)
        return `<span class="halfTextContainer"><span ${style} class="halfText left_${lfgcolor} right_${rfgcolor} left_${lbgcolor} right_${rbgcolor}" text="${text}">${text}</span></span>`
    }

    private static getFullWidthContent(ldata: byte, rdata: byte, foreground: number, background: number, attr: Attribute): string {
        const bytes = Uint8Array.from([ldata, rdata])
        const fg = attr & Attribute.Bold ? `bf${attr & Attribute.Reverse ? 67 - foreground : foreground}` : `f${attr & Attribute.Reverse ? 67 - foreground : foreground}`
        const bg = `b${attr & Attribute.Reverse ? (87 - background) : background}`
        const s = Big5UAO.GetString(bytes)
        const text = Terminal.convertHTML(s)
        return `<span class="keepSpace ${fg} ${bg}" style=\"width: ${1}em\">${text}</span>`
    }

    private static convertHTML(s: string): string {
        s = s.replace("&", "&amp;")
        s = s.replace("\"", "&quot;")
        s = s.replace("<", "&lt;")
        s = s.replace(">", "&gt;")
        s = s.replace("®", "&reg;")
        s = s.replace("©", "&copy;")
        s = s.replace("™", "&trade;")
        return s
    }

    private static GetBytesWriteColor(s: string, color: Color): byte[] {
        const b = [0x03, 0x1B, 0x5B, 0x44]
        if ("attribute" in color) {
            if (color.attribute & Attribute.Bold) {
                b.push(0x31, 0x3B)
            }
            if (color.attribute & Attribute.Underline) {
                b.push(0x34, 0x3B)
            }
            if (color.attribute & Attribute.Blink) {
                b.push(0x35, 0x3B)
            }
            if (color.attribute & Attribute.Reverse) {
                b.push(0x37, 0x3B)
            }
            if (color.attribute & Attribute.Invisible) {
                b.push(0x38, 0x3B)
            }
        }
        if ("color" in color) {
            const n = color.color
            b.push(n / 10 + 0x30, n % 10 + 0x30, 0x3B)
        }
        if ("background" in color) {
            const n = color.background
            b.push(n / 10 + 0x30, n % 10 + 0x30, 0x3B)
        }
        b.push(0x1B, 0x5B, 0x43)
        b.push(...Big5UAO.GetBytes(s))
        b.push(0x03)
        return b
    }

    public static GetBytesFromContent(s: string): Uint8Array {
        const lines = s.split("\n")
        const data: number[] = []

        for (const l of lines) {
            if (l) {
                for (const seg of l.split(/(\*\[(?:\d+)?(?:;\d+)*m.*?\*\[m)/)) {
                    if (/^\*\[(?:\d+)?(?:;\d+)*m.*?\*\[m$/.test(seg)) {
                        const color: Color = new Color()
                        let start = 2
                        let c = 0
                        for (; start < seg.length; start++) {
                            if (seg[start] === "m") {
                                break
                            }
                            if (seg[start] === ";") {
                                color.setStyle(c)
                                c = 0
                                continue
                            }
                            const t = parseInt(seg[start], 10)
                            if (t) {
                                c = c * 10 + t
                            }
                        }
                        const a = start + 1
                        const b = seg.length - a - 3
                        data.push(...Terminal.GetBytesWriteColor(seg.substr(a, b), color))

                    } else {
                        data.push(...Big5UAO.GetBytes(seg))
                    }
                }
            }
            data.push(0x0D)
        }
        return new Uint8Array(data)
    }
}

/** Block[] 轉字串 */
export function toString(s: Block[]): string {
    if (s) {
        const msg = new Uint8Array(s.length)
        for (let j = 0; j < TerminalWidth; j++) {
            msg[j] = s[j].Content
        }
        return Big5UAO.GetString(msg)
    }
    return ""
}
