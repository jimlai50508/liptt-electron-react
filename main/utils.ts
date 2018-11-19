import { app, BrowserWindow } from "electron"
import ElectronStore = require("electron-store")
import { User } from "./model"
import fs = require("fs")
import path = require("path")
const { Base64 } = require("js-base64")
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

export class GGmail {
    /// https://console.developers.google.com
    /// https://github.com/gsuitedevs/node-samples/blob/master/gmail/quickstart/index.js
    /// https://developers.google.com/gmail/api/v1/reference/users/messages/send

    public static setToken(token: string) {
        // gapi.client.setToken({access_token: token})
    }

    public static async Load(): Promise<void> {
       //  return gapi.client.load("gmail", "v1")
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

interface GoogleToken {
    code?: string
    scope?: string
}

export class Gmail {

    private authWindow: BrowserWindow
    private authToken: GoogleToken

    private createAuthWindow(url: string) {
        this.authWindow = new BrowserWindow({
            width: 600,
            height: 720,
            webPreferences: {
                nodeIntegration: true,
                webSecurity: false,
            },
            autoHideMenuBar: true,
        })
        this.authWindow.loadURL(url)
        this.authWindow.webContents.on("will-navigate", (event: Event, newUrl: string) => {
            if (newUrl.startsWith("https://localhost/?")) {
                const param = newUrl.replace("https://localhost/?", "")
                this.authToken = {}
                param.split("&").forEach((p) => {
                    const a = p.split("=")
                    if (a.length === 2) {
                        if (a[0] === "code") {
                            this.authToken.code = a[1]
                        } else if (a[0] === "scope") {
                            this.authToken.scope = a[1]
                        }
                    }
                })
                event.preventDefault()
                console.log("token: ", this.authToken)
                // More complex code to handle tokens goes here
                // ...
                this.authWindow.close()
            }
        })
        this.authWindow.show()
    }

    private auth() {
        fs.readFile(path.resolve(__dirname, "../credentials.json"), (err, content) => {
            if (err) {
                return console.log("Error loading client secret file:", err)
            }
            // Authorize a client with credentials, then call the Gmail API.
            this.authorize(JSON.parse(content.toString()), this.sendMail)
        })
    }

    public SendMail() {
        fs.readFile(path.resolve(__dirname, "../../credentials.json"), (err, content) => {
            if (err) {
                return console.log("Error loading client secret file:", err)
            }
            // Authorize a client with credentials, then call the Gmail API.
            this.authorize(JSON.parse(content.toString()), this.sendMail)
        })
    }

    private sendMail(auth: any) {
        return
        const gmail = google.gmail({version: "v1", auth})

        const base64EncodedEmail = Base64.encodeURI(
'From: lightyen <lightyen0123@gmail.com>\r\n\
To: lightyen <lightyen0123@gmail.com>\r\n\
Subject: Hello\r\n\
Content-Language: zh-TW\r\n\
Content-Type: text/html; charset="utf-8"\r\n\
\r\n\
Hello')
        const request = gmail.users.messages.send(
            {
                userId: "me",
                resource: {
                    raw: base64EncodedEmail,
                },
            }, (err: any, res: any) => {
              if (err) {
                return console.log("The API returned an error: " + err)
              } else if (res.statusText === "OK") {
                  console.log("Send Ok!!")
              }
          })
        if (request) {
            request.execute(() => {})
        }
    }

    /** Google API 應用程式權限範圍 */
    private readonly SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

    private authorize(credentials: any, callback: any) {
        const {client_secret, client_id, redirect_uris} = credentials.web
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

        // Check if we have previously stored a token.
        this.getNewToken(oAuth2Client, callback)
        // oAuth2Client.setCredentials(JSON.parse(token))
    }

    private getNewToken(client: any, callback: any) {
        const authUrl = client.generateAuthUrl({
            access_type: "offline",
            scope: this.SCOPES,
        })
        this.createAuthWindow(authUrl)
    }
}
