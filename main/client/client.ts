import { EventEmitter } from "events"
import { Big5UAO } from "../encoding"
import { Terminal } from "../model/terminal"
import * as WebSocket from "ws"
import { SocketState } from "../model"

/** PTT 客戶端 */
export class Client extends EventEmitter {

    private terminal: Terminal
    private esc: boolean
    private cut: boolean
    private isCache: boolean
    private cache: number
    private n: number
    private hasN: boolean
    private queue: number[]

    private port: number
    private security: boolean
    private ws: WebSocket
    private timeout: NodeJS.Timeout

    private isconnected: boolean

    constructor() {
        super()
        this.queue = []
        this.port = 443
        this.security = true
        this.terminal = new Terminal()
        this.isconnected = false
    }

    /** 開始連線 */
    public async connect(): Promise<SocketState> {
        return new Promise<SocketState>((resolve, reject) => {
            if (this.security) {
                const ws = new WebSocket("wss://ws.ptt.cc/bbs", {
                    origin: "https://www.ptt.cc",
                })
                if (ws) {
                    ws.onopen = (e) => {
                        this.ws = e.target
                        this.isconnected = true
                        resolve(SocketState.Connected)
                        this.emit("socket", SocketState.Connected)
                    }
                    ws.onclose = (e) => {
                        this.isconnected = false
                        resolve(SocketState.Closed)
                        this.emit("socket", SocketState.Closed)
                    }
                    ws.onmessage = (e) => {
                        this.read(e.data as Buffer)
                    }
                    ws.on("error", () => {
                        resolve(SocketState.Failed)
                    })
                } else {
                    resolve(SocketState.Failed)
                }
            } else {
                resolve(SocketState.Failed)
            }
        })
    }

    /** 中斷連線 */
    public close() {
        if (this.ws) {
            this.ws.close()
            this.ws = null
        }
    }

    /** 是否以連接 */
    public get isOpen() {
        return this.isconnected
    }

    /** 送出資料 */
    protected send(data: Buffer | Uint8Array | string | number, ...optionalParams: any[]) {
        let buffer: Buffer
        if (optionalParams.length === 0) {
            if (typeof data === "object") {
                buffer = Buffer.from(data)
            } else if (typeof data === "string") {
                buffer = Buffer.from(Big5UAO.GetBytes(data))
            } else if (typeof data === "number") {
                buffer = Buffer.from([data])
            } else {
                buffer = data
            }
        } else {
            const arr: number[] = []
            if (typeof data === "object") {
                data.forEach((value) => {
                    arr.push(value)
                })
            } else if (typeof data === "string") {
                Big5UAO.GetBytes(data).forEach((v) => {
                    arr.push(v)
                })
            } else if (typeof data === "number") {
                arr.push(data)
            }
            optionalParams.forEach((value) => {
                if (typeof value === "object") {
                    const a: Uint8Array = value
                    a.forEach((v) => {
                        arr.push(v)
                    })
                } else if (typeof value === "string") {
                    const a: string = value
                    Big5UAO.GetBytes(a).forEach((v) => {
                        arr.push(v)
                    })
                } else if (typeof value === "number") {
                    arr.push(value)
                }
            })
            buffer = Buffer.from(arr)
        }

        try {
            if (this.security) {
                this.ws.send(buffer)
            } else {
                // this.tcp_socket.write(buffer)
            }
        } catch (e) {
            console.error("send: " + e)
        }
    }

    private read(buffer: Buffer) {
        const data = new Uint8Array(buffer)
        if (data.length === 0) {
            return
        }
        this.parse(data, 0, data.length)

        if (this.timeout) {
            clearTimeout(this.timeout)
            this.timeout = null
        }
        if (data.length < 1024) {
            this.emit("Updated", this.terminal)
        } else {
            this.timeout = setTimeout(() => {
                this.emit("Updated", this.terminal)
            }, 1000)
        }
    }

    private parse(data: Uint8Array, start: number, count: number) {
        // let RAW = ""
        for (let i = start; i < start + count; i++) {
            const b = data[i]
            if (this.esc) {
                if (b >= 0x30 && b <= 0x39) {
                    this.hasN = true
                    this.n = 10 * this.n + (b - 0x30)
                    continue
                }
                switch (b) {
                case 0x5B: // '['
                    // RAW += "["
                    continue
                case 0x3B: // ';'
                    if (this.hasN) {
                        this.queue.push(this.n)
                    } else {
                        this.queue.push(0)
                    }
                    this.hasN = false
                    this.n = 0
                    continue
                case 0x6D: // 'm': Text Color
                    if (this.hasN) {
                        this.queue.push(this.n)
                    }
                    if (this.queue.length === 0) {
                        this.terminal.DefaultCurrentAttribute()
                        this.terminal.DefaultCurrentColor()
                    }

                    while (this.queue.length > 0) {
                        const c = this.queue.shift()
                        this.terminal.SetCurrentStyle(c)
                        // RAW += `${c}`
                        // if (this.queue.length > 0) {
                        //     RAW += ";"
                        // }
                    }
                    // RAW += "m"
                    break
                case 0x4A: // 'J': Clear Screen
                    if (this.hasN) {
                        // RAW += fmt.Sprintf("CLEAR%d]", this.n)
                        this.terminal.Clear(this.n)
                    } else {
                        // RAW += "CLEAR]"
                        this.terminal.Clear(0)
                    }
                    break
                case 0x48: // 'H': Move Cursor
                case 0x66: // 'f': Move Cursor
                    const row: number = this.queue.length > 0 ? this.queue.shift() : 1
                    const col: number = this.hasN ? this.n : 1
                    // RAW += fmt.Sprintf("MOVE%d,%d]", row, col)
                    this.terminal.Move(row - 1, col - 1)
                    break
                case 0x41: // 'A': Move Cursor upLines
                    // RAW += fmt.Sprintf("UP%d]", this.n)
                    if (this.hasN) {
                        this.terminal.Up(this.n)
                    }
                    break
                case 0x42: // 'B': Move Cursor DownLines
                    // RAW += fmt.Sprintf("DOWN%d]", this.n)
                    if (this.hasN) {
                        this.terminal.Down(this.n)
                    }
                    break
                case 0x43: // 'C': Move Cursor Right
                    // RAW += fmt.Sprintf("RIGHT%d]", this.n)
                    if (this.hasN) {
                        this.terminal.Right(this.n)
                    }
                    break
                case 0x44: // 'D': Move Cursor Left
                    // RAW += fmt.Sprintf("LEFT%d]", this.n)
                    if (this.hasN) {
                        this.terminal.Left(this.n)
                    }
                    break
                case 0x52: // 'R': Current Cursor
                    // RAW += fmt.Sprintf("CURRENT%d,%d]", this.terminal.col, this.terminal.row)
                    break
                case 0x73: // 's': Save Cursor
                    // RAW += "SAVE]"
                    this.terminal.Save()
                    break
                case 0x75: // 'u': Load Cursor
                    // RAW += "LOAD]"
                    this.terminal.Load()
                    break
                case 0x4B: // 'K': Clear Line
                    if (this.hasN) {
                        // RAW += fmt.Sprintf("CLEARLINE%d]", this.n)
                        this.terminal.ClearLine(this.n)
                    } else {
                        // RAW += "CLEARLINE]"
                        this.terminal.ClearLine(0)
                    }
                    break
                case 0x4D: // 'M': Move the cursor up in scrolling region.
                    // RAW += "SCROLL UP]"
                    this.terminal.Up(1)
                    break
                default:
                    // RAW += fmt.Sprintf("unknown 0x%X]", b)
                    break
                }
                this.hasN = false
                this.n = 0
                this.esc = false
            } else {
                switch (b) {
                case 0x08: // BS - backspace
                    // RAW += "(BS)"
                    this.terminal.Backspace()
                    break
                case 0x0A: // LF - line feed (\n)
                    // RAW += "(LF)"
                    this.terminal.Down(1)
                    break
                case 0x0D: // CR - enter/carriage return
                    // RAW += "(CR)"
                    this.terminal.CarriageReturn()
                    break
                case 0x1B: // ESC - escape
                    this.esc = true
                    if (this.isCache) {
                        // 填左半個
                        this.cut = true
                        this.terminal.Insert(this.cache)
                        // RAW += `{0x${this.cache.toString(16)}}`
                    }
                    break
                case 0x7F: // DEL - delete
                    // RAW += "(DEL)"
                    this.terminal.Delete()
                    break
                default:
                    // printable characters
                    if (this.cut) {
                        // 填右半個
                        // RAW += fmt.Sprintf("{0x%X}", b)
                        this.terminal.Insert(b)
                        this.isCache = false
                        this.cut = false
                    } else {
                        if (this.isCache) {
                            // 沒半色字，填整個
                            this.isCache = false
                            this.terminal.Insert(this.cache)
                            this.terminal.Insert(b)
                            // RAW += fmt.Sprintf("%s", encoding.GetString([]byte{c.cache, b}))
                        } else if (b < 0x7F) {
                            // RAW += fmt.Sprintf("%s", encoding.GetString([]byte{b}))
                            this.terminal.Insert(b)
                        } else {
                            this.isCache = true
                            this.cache = b
                        }
                    }
                    break
                }
            }
        }
    }

    /** TCP 位址 */
    get Host(): string {
        return "ptt.cc"
    }

    /** TCP 通訊埠 */
    get TCPPort(): number {
        return this.port
    }

    set TCPPort(port: number) {
        this.port = port
    }
}
