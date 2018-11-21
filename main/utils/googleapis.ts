import ElectronStore = require("electron-store")
import { BrowserWindow } from "electron"
import fs = require("fs")
import path = require("path")
import url = require("url")
import querystring = require("querystring")
const { Base64 } = require("js-base64")
import { google as gapis } from "googleapis"
import { OAuth2Client, Credentials } from "google-auth-library"

/// https://console.developers.google.com

interface ICredentials {
    client_id?: string
    project_id?: string
    auth_uri?: string
    token_uri?: string
    auth_provider_x509_cert_url?: string
    client_secret?: string
    redirect_uris?: string[]
}

const ICON_PATH = path.resolve(__dirname, "../../../resources/icons/256x256.png")
const APP_CREDENTIALS_PATH = path.resolve(__dirname, "../../../resources/credentials.json")

/** https://github.com/googleapis/google-api-nodejs-client#getting-started */
export class Google {

    /// https://myaccount.google.com/permissions 第三方應用程式權限
    /// https://developers.google.com/+/web/api/rest/latest/people/get
    /// https://developers.google.com/+/web/api/rest/latest/people#emails
    /// https://developers.google.com/gmail/api/v1/reference/users/messages/send

    /** Google API 應用程式權限範圍 */
    private readonly SCOPES = [
        "https://www.googleapis.com/auth/plus.me",
        "https://www.googleapis.com/auth/plus.profile.emails.read",
        "https://www.googleapis.com/auth/gmail.send",
    ]

    private readonly storeName = "googleTokens"

    private store: ElectronStore
    private authWindow: BrowserWindow

    constructor() {
        this.store = new ElectronStore({ name: this.storeName })
    }

    public GetMailAddress() {
        this.auth(this.getMailAddress)
    }

    private getMailAddress(auth: OAuth2Client) {
        gapis.plus({version: "v1", auth}).people.get({userId: "me"})
        .then((resp) => {
            console.log("Name: " + resp.data.displayName)
            const emails = resp.data.emails
            if (emails && emails[0]) {
                console.log(emails[0])
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

    public SendTestMail() {
        this.auth(this.sendMail)
    }

    private sendMail(auth: OAuth2Client) {
        const name = "lightyen"
        const email = "lightyen0123@gmail.com"
        const base64EncodedEmail = Base64.encodeURI(
`From: ${name} <${email}>\r\n\
To: ${name} <${email}>\r\n\
Subject: Test Gmail API\r\n\
Content-Language: zh-TW\r\n\
Content-Type: text/html; charset="utf-8"\r\n\
\r\n\
Hello World`)
        gapis.gmail({version: "v1", auth}).users.messages.send(
            {
                userId: "me",
                requestBody: {
                    raw: base64EncodedEmail,
                },
            }, (err: any, res: any) => {
                if (err) {
                    return console.error("The API returned an error: " + err)
                } else if (res.statusText === "OK") {
                    console.log("Send Ok!!")
                }
            },
        )
    }

    private auth(callback: (auth: OAuth2Client) => void) {
        fs.readFile(APP_CREDENTIALS_PATH, async (err, content) => {
            if (err) {
                return console.error("Error loading app credentials file:", err)
            }
            const json = JSON.parse(content.toString())
            if (json) {
                await this.authorize(json.web as ICredentials, callback)
            } else {
                return console.error("Error Unmarshal app credentials file:", APP_CREDENTIALS_PATH)
            }
        })
    }

    private async authorize(cred: ICredentials, callback: (auth: OAuth2Client) => void) {
        if (!cred.redirect_uris) {
            console.error("Redirect Uris must be set.")
            return
        }

        const oAuth2Client = new OAuth2Client(cred.client_id, cred.client_secret, cred.redirect_uris[0])

        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: "offline",
            scope: this.SCOPES,
            prompt: "consent", // 顯示確認權限的按鈕
        })

        const code = this.store.get("code") as string
        if (!code) {
            // first authorization: 當使用者Accept之後，會取得access_token和refresh_token
            this.createAuthWindow(authUrl, oAuth2Client, callback)
            return
        }

        const oldTokens = JSON.parse(this.store.get("tokens")) as Credentials

        oAuth2Client.on("tokens", ((tokens: Credentials) => {
            tokens.refresh_token = oldTokens.refresh_token
            this.store.set("tokens", JSON.stringify(tokens))
            oAuth2Client.setCredentials(tokens)
            callback(oAuth2Client)
        }).bind(this))

        oAuth2Client.setCredentials({ refresh_token: oldTokens.refresh_token })
        // refresh the access_token
        oAuth2Client.getRequestHeaders(authUrl)
        .then(headers => {
        })
        .catch(e => {
            console.error(e)
        })
    }

    private createAuthWindow(authUrl: string, oAuth2Client: OAuth2Client, callback: (auth: OAuth2Client) => void) {
        this.authWindow = new BrowserWindow({
            width: 600,
            height: 720,
            icon: ICON_PATH,
            show: false,
            webPreferences: {
                nodeIntegration: false,
                webSecurity: false,
            },
            autoHideMenuBar: true,
        })

        this.authWindow.webContents.on("will-navigate", (event: Event, newUrl: string) => {
            if (!newUrl.startsWith("https://localhost/?")) {
                return
            }
            event.preventDefault()
            const qs = querystring.parse(url.parse(newUrl).query)
            this.authWindow.close()

            if (!qs.code) {
                return
            }

            const code: string = qs["code"] as string

            oAuth2Client.getToken(code, (err, tokens) => {
                if (err) {
                    console.error("Error retrieving access token", err)
                }
                this.store.set("code", code)
                this.store.set("tokens", JSON.stringify(tokens))
                console.log(code)
                console.log(tokens)
                oAuth2Client.setCredentials(tokens)
                callback(oAuth2Client)
            })
        })
        this.authWindow.on("closed", () => {
            this.authWindow = null
        })
        this.authWindow.loadURL(authUrl)
        this.authWindow.show()
    }
}
