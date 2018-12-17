import { observable, action } from "mobx"
import { SocketStore } from "./SocketStore"

export interface ISocket {
    socket?: SocketStore
}

export class AppStore {
    public socket: SocketStore

    constructor() {
        this.socket = new SocketStore()
    }
}
