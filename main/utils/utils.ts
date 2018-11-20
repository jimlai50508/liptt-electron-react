import { app, BrowserWindow } from "electron"
import ElectronStore = require("electron-store")
import { User } from "../model"

export function isDevMode() {
    return !app.isPackaged
}

export class RendererConsole {
    public static window: BrowserWindow
    /** 輸出偵錯訊息到Renderer (Development Mode) */
    public static log(message?: any, ...optionalParams: any[]) {
        if (isDevMode()) {
            this.window.webContents.send("console-log", { message, optionalParams })
        }
    }

    /** 輸出警告訊息到Renderer (Development Mode) */
    public static warn(message?: any, ...optionalParams: any[]) {
        if (isDevMode()) {
            this.window.webContents.send("console-warn", {message, optionalParams})
        }
    }

    /** 輸出錯誤訊息到Renderer */
    public static error(message?: any, ...optionalParams: any[]) {
        this.window.webContents.send("console-error", {message, optionalParams})
    }

    /** 清除Renderer console (Development Mode) */
    public static clear() {
        if (isDevMode()) {
            this.window.webContents.send("console-clear")
        }
    }
}

/// 存放位置：app.getPath("userData")
export class Storage {

    private static store: ElectronStore = new ElectronStore({ name: "storage" })

    public static set User(u: User) {
        Storage.store.set("user", u)
    }

    public static get User(): User {
        return Storage.store.get("user")
    }
}

export class LogFile {

    private static store: ElectronStore = new ElectronStore({ name: "log" })

    constructor(name: string) {
        LogFile.store = new ElectronStore({
            name,
        })
    }

    public static log(message?: any) {
        if (message) {
            const log = LogFile.store.get("log") as any[]
            if (log) {
                log.push(message)
                LogFile.store.set("log", log)
            } else {
                const l: any[] = []
                l.push(message)
                LogFile.store.set("log", l)
            }
        }
    }
}
