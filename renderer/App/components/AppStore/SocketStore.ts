import { observable, action } from "mobx"
import { SocketState } from "model"

export class SocketStore {
    @observable
    public socketState: SocketState

    constructor() {
        this.socketState = SocketState.Closed
    }

    @action
    public setSocketState(s: SocketState) {
        this.socketState = s
    }
}
