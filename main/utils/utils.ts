import { app, BrowserWindow } from "electron"
import ElectronStore = require("electron-store")

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
            this.window.webContents.send("console-warn", { message, optionalParams })
        }
    }

    /** 輸出錯誤訊息到Renderer */
    public static error(message?: any, ...optionalParams: any[]) {
        this.window.webContents.send("console-error", { message, optionalParams })
    }

    /** 清除Renderer console (Development Mode) */
    public static clear() {
        if (isDevMode()) {
            this.window.webContents.send("console-clear")
        }
    }
}

export class LogFile {
    private static readonly storeName = "user"
    private static store: ElectronStore = new ElectronStore({ name: LogFile.storeName })

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

    public static clear() {
        LogFile.store.set("log", [])
    }
}

function encodeBase64(s: string) {
    return btoa(encodeURI(s))
}

function decodeBase64(s: string) {
    return decodeURI(atob(s))
}
