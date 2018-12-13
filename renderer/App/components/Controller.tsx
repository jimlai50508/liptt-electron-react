import React, { Component } from "react"
import { ipcRenderer, EventEmitter } from "electron"
import { SocketState } from "model"
import { action } from "mobx"
import { observer, inject } from "mobx-react"
import { ISocket } from "./AppStore"

interface ComponentProps extends ISocket {
}

interface ComponentState {

}

@inject("socket")
@observer
export default class extends Component<ComponentProps, ComponentState> {

    public componentDidMount() {
        ipcRenderer.on("console-log", (_e: EventEmitter, obj: {message: any, optionalParams: any[]}) => {
            if (obj.message || obj.optionalParams.length) {
                console.log(obj.message, ...obj.optionalParams)
            }
        })
        ipcRenderer.on("console-warn", (_e: EventEmitter, obj: {message: any, optionalParams: any[]}) => {
            if (obj.message || obj.optionalParams.length) {
                console.warn(obj.message, ...obj.optionalParams)
            }
        })
        ipcRenderer.on("console-error", (_e: EventEmitter, obj: {message: any, optionalParams: any[]}) => {
            if (obj.message || obj.optionalParams.length) {
                console.error(obj.message, ...obj.optionalParams)
            }
        })
        ipcRenderer.on("console-clear", (_e: EventEmitter) => {
            console.clear()
        })
        ipcRenderer.on("/socket", (_e: EventEmitter, state: SocketState) => {
            this.setSocketState(state)
        })
        ipcRenderer.on("/notification", (_: EventEmitter, options: NotificationOptions) => {
        if (!("Notification" in window)) {
            alert("你這個瀏覽器不支援 Notification")
            } else if (Notification.permission === "granted") {
                const noti = new Notification("liptt", options)
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission((permission) => {
                    if (permission === "granted") {
                        const noti = new Notification("liptt", options)
                    }
                })
            }
        })
    }

    @action
    private setSocketState(s: SocketState) {
        this.props.socket.setSocketState(s)
    }

    public render(): JSX.Element {
        return null
    }
}
