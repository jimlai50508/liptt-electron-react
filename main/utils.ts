import { app, BrowserWindow } from "electron"
import ElectronStore = require("electron-store")
import { User } from "./model"
import fs = require("fs")
import path = require("path")
const { Base64 } = require("js-base64")
import { google as gapis } from "googleapis"
import { OAuth2Client, Credentials } from "google-auth-library"

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

/** https://github.com/googleapis/google-api-nodejs-client#getting-started */
export class Gmail {

    /// https://developers.google.com/+/web/api/rest/latest/people/get
    /// https://developers.google.com/+/web/api/rest/latest/people#emails
    /// https://developers.google.com/gmail/api/v1/reference/users/messages/send

    /** Google API 應用程式權限範圍 */
    private readonly SCOPES = [
        "https://www.googleapis.com/auth/plus.me",
        "https://www.googleapis.com/auth/plus.profile.emails.read",
        "https://www.googleapis.com/auth/gmail.send",
    ]

    private store: ElectronStore
    private authWindow: BrowserWindow

    constructor() {
        this.store = new ElectronStore({ name: "tokens" })
    }

    public GetMailAddress() {
        this.auth(this.getMailAddress)
    }

    private getMailAddress(auth: OAuth2Client) {
        gapis.plus({version: "v1", auth}).people.get({userId: "me"})
        .then((resp) => {
            console.log("ID: " + resp.data.id)
            console.log("Display Name: " + resp.data.displayName)
            const emails = resp.data.emails
            if (emails) {
                emails.forEach(addr => console.log(addr))
            }
        })
        .catch((e) => {
            if (e.message) {
                console.error(e.message)
            } else {
                console.error(e)
            }
        })
    }

    private auth(callback: (auth: OAuth2Client) => void) {
        fs.readFile(path.resolve(__dirname, "../../credentials.json"), (err, content) => {
            if (err) {
                return console.log("Error loading client secret file:", err)
            }
            // Authorize a client with credentials, then call the Gmail API.
            this.authorize(JSON.parse(content.toString()), callback)
        })
    }

    private sendMail(auth: OAuth2Client) {
        return
        const base64EncodedEmail = Base64.encodeURI(
'From: lightyen <lightyen0123@gmail.com>\r\n\
To: lightyen <lightyen0123@gmail.com>\r\n\
Subject: Hello\r\n\
Content-Language: zh-TW\r\n\
Content-Type: text/html; charset="utf-8"\r\n\
\r\n\
Hello')
        gapis.gmail({version: "v1", auth}).users.messages.send(
            {
                userId: "me",
                requestBody: {
                    raw: base64EncodedEmail,
                },
            }, (err: any, res: any) => {
              if (err) {
                return console.log("The API returned an error: " + err)
              } else if (res.statusText === "OK") {
                  console.log("Send Ok!!")
              }
            },
        )
    }

    private authorize(credentials: any, callback: (auth: OAuth2Client) => void) {
        const { client_secret, client_id, redirect_uris } = credentials.web
        const oAuth2Client = new gapis.auth.OAuth2(client_id, client_secret, redirect_uris[0])

        const token = this.store.get("gapis")
        if (!token) {
            this.getNewToken(oAuth2Client, callback)
            return
        }
        oAuth2Client.setCredentials(token)
        callback(oAuth2Client)
        // oAuth2Client.credentials = {...oAuth2Client.credentials, refresh_token: token.refresh_token}
        // oAuth2Client.refreshAccessToken((e, cred) => {
        //     if (e) {
        //         console.log(e)
        //         return
        //     }
        //     // save new token
        //     this.store.set("gapis", JSON.stringify(cred))
        //     oAuth2Client.setCredentials(cred)
        //     callback(oAuth2Client)
        // })
    }

    private getNewToken(oAuth2Client: OAuth2Client, callback: (auth: OAuth2Client) => void) {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: "offline",
            scope: this.SCOPES,
        })
        this.createAuthWindow(authUrl, oAuth2Client, callback)
    }

    private createAuthWindow(authUrl: string, oAuth2Client: OAuth2Client, callback: (auth: OAuth2Client) => void) {
        this.authWindow = new BrowserWindow({
            width: 600,
            height: 720,
            icon: path.resolve(__dirname, "../../resources/icons/256x256.png"),
            webPreferences: {
                nodeIntegration: true,
                webSecurity: false,
            },
            autoHideMenuBar: true,
        })
        this.authWindow.webContents.on("will-navigate", (event: Event, newUrl: string) => {
            if (!newUrl.startsWith("https://localhost/?")) {
                console.log("will-native:", newUrl)
                return
            }
            event.preventDefault()
            const param = newUrl.replace("https://localhost/?", "")
            let code = ""
            let scope = ""
            param.split("&").forEach((p) => {
                const a = p.split("=")
                if (a.length === 2) {
                    if (a[0] === "code") {
                        code = a[1]
                    } else if (a[0] === "scope") {
                        scope = a[1]
                    }
                }
            })
            // More complex code to handle tokens goes here
            this.authWindow.close()
            oAuth2Client.getToken(code, (err, token) => {
                if (err) {
                    console.error("Error retrieving access token", err)
                }
                // save token
                this.store.set("gapis", JSON.stringify(token))

                oAuth2Client.setCredentials(token)
                // oAuth2Client.credentials = {...oAuth2Client.credentials, refresh_token: token.refresh_token}
                // // refresh the token
                // oAuth2Client.refreshAccessToken((e, cred) => {
                //     if (e) {
                //         console.log(e)
                //         return
                //     }
                //     // save new token
                //     this.store.set("gapis", JSON.stringify(cred))
                //     oAuth2Client.setCredentials(cred)
                //     callback(oAuth2Client)
                // })
                callback(oAuth2Client)
            })
        })
        this.authWindow.on("closed", () => {
            this.authWindow = null
        })
        console.log(authUrl)
        this.authWindow.loadURL(authUrl)
        this.authWindow.show()
    }
}
