import { app, BrowserWindow } from "electron"
import ElectronStore = require("electron-store")
import { User } from "./model"
const { google } = require("googleapis")

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

interface GoogleApiOAuth2TokenObject {
    /**
     * The OAuth 2.0 token. Only present in successful responses
     */
    access_token: string
    /**
     * Details about the error. Only present in error responses
     */
    error: string
    /**
     * The duration, in seconds, the token is valid for. Only present in successful responses
     */
    expires_in: string
    /**
     * The Google API scopes related to this token
     */
    state: string
}

export class Gmail {
    /// https://console.developers.google.com
    /// https://github.com/gsuitedevs/node-samples/blob/master/gmail/quickstart/index.js
    /// https://developers.google.com/gmail/api/v1/reference/users/messages/send

    public static setToken(token: string) {
        gapi.client.setToken({access_token: token})
    }

    public static async Load(): Promise<void> {
        return gapi.client.load("gmail", "v1")
    }

    public static sendMessage(email: string, callback: () => void, userId?: string) {

        // Using the js-base64 library for encoding:
        // https://www.npmjs.com/package/js-base64
        // const base64EncodedEmail = Base64.encodeURI(email)
        // const request = gapi.client.g.users.messages.send({
        //     userId,
        //     resource: {
        //         raw: base64EncodedEmail,
        //     },
        // })
        // request.execute(callback)
      }
}
