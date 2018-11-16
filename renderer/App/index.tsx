import React, { Component } from "react"
import { ipcRenderer, EventEmitter } from "electron"
import { HashRouter } from "react-router-dom"
import { Switch, Route } from "react-router-dom"
import { notification } from "antd"
import MobXDevTools from "mobx-react-devtools"
import { MainPage, LoginPage } from "./pages"
// let globalStore = createStore(combineReducers(collection), window['__REDUX_DEVTOOLS_EXTENSION__'] && window['__REDUX_DEVTOOLS_EXTENSION__']())

enum SocketState {
    Connected,
    Closed,
    Failed,
}

export default class extends Component {

    public componentDidMount() {
        ipcRenderer.on("debug:log", (_e: EventEmitter, obj: {message: string, optionalParams: any[]}) => {
            if (obj.message || obj.optionalParams.length) {
                console.log(obj.message, ...obj.optionalParams)
            }
        })
        ipcRenderer.on("debug:warn", (_e: EventEmitter, obj: {message: string, optionalParams: any[]}) => {
            if (obj.message || obj.optionalParams.length) {
                console.warn(obj.message, ...obj.optionalParams)
            }
        })
        ipcRenderer.on("debug:error", (_e: EventEmitter, obj: {message: string, optionalParams: any[]}) => {
            if (obj.message || obj.optionalParams.length) {
                console.error(obj.message, ...obj.optionalParams)
            }
        })
        ipcRenderer.on("debug:clear", (_e: EventEmitter) => {
            console.clear()
        })
        ipcRenderer.on("/socket", (_e: EventEmitter, state: SocketState) => {
            if (state === SocketState.Closed) {
                console.warn("socket is closed.")
                notification.config({placement: "bottomRight"})
                setTimeout(() => {
                    notification.error({
                        message: "liptt 通知",
                        description: "連線已斷開",
                        // icon: <Icon type="mail" style={{ color: "#108ee9" }} />,
                    })
                }, 100)
            }
        })
        ipcRenderer.on("/notification", (_: EventEmitter, options: NotificationOptions) => {
        if (!("Notification" in window)) {
            alert("這個瀏覽器不支援 Notification")
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

    public render() {
        return (
            <div>
                <MobXDevTools />
                <HashRouter>
                    <Switch>
                        <Route exact path="/">
                            <LoginPage />
                        </Route>
                        <Route path="/Main">
                            <MainPage />
                        </Route>
                    </Switch>
                </HashRouter>
            </div>
        )
    }
}
