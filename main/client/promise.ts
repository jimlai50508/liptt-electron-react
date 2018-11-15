import { EventEmitter } from "events"
import { Big5UAO } from "../encoding"
import { Terminal } from "../model/terminal"
import * as WebSocket from "ws"
import { Debug } from "../app"

export class PromiseClient extends EventEmitter {

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

    private messagePool: Buffer[]

    constructor() {
        super()
        this.queue = []
        this.port = 443
        this.security = true
        this.terminal = new Terminal()
        this.isconnected = false
        this.messagePool = []
    }

    public async connect(): Promise<SocketState> {
        if (this.security) {

            return new Promise<SocketState>((resolve => {
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
                        this.messagePool.push(e.data as Buffer)
                    }
                } else {
                    resolve(SocketState.Failed)
                }
            }))
        } else {
            return new Promise<SocketState>(resolve => {
                resolve(SocketState.Failed)
            })
        }
    }

    public async getMessage(): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject) => {
            if (this.isconnected) {
                if (this.messagePool.length > 0) {
                    resolve(this.messagePool.shift())
                } else {

                }
            } else {
                reject()
            }
        })
    }
}

export enum SocketState {
    Connected,
    Closed,
    Failed,
}
