import { observable, action } from "mobx"
import { SocketState } from "model"
import { SocketStore } from "./SocketStore"

export interface ISocket {
    socket?: SocketStore
}

export class AppStore {

    public socket: SocketStore

    @observable
    public isDevMode: boolean

    constructor() {
        this.socket = new SocketStore()
        this.isDevMode = false
    }

    public setDevMode(dev: boolean) {
        this.isDevMode = dev
    }
}
