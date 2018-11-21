import { BrowserWindow } from "electron"
import ElectronStore = require("electron-store")
import fs = require("fs")
import path = require("path")
import url = require("url")
import querystring = require("querystring")
import { promisify } from "util"
import { Base64 } from "js-base64"
import { google as gapis } from "googleapis"
import { OAuth2Client, Credentials, auth } from "google-auth-library"

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

interface UserProfile {
    name?: string
    emails?: string[]
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
    private profile: UserProfile
    private store: ElectronStore
    private authWindow: BrowserWindow

    constructor() {
        this.store = new ElectronStore({ name: this.storeName })
    }

    public async GetUserProfile(): Promise<UserProfile> {
        try {
            const client = await this.getOAuth2Client()
            const profile = this.getUserProfile(client)
            return profile
        } catch (e) {
            throw new Error(e)
        }
    }

    private async getUserProfile(client: OAuth2Client): Promise<UserProfile> {
        const gplus = gapis.plus({version: "v1", auth: client})

        try {
            const resp = await gplus.people.get({userId: "me"})
            const user: UserProfile = {
                name: resp.data.displayName,
                emails: resp.data.emails,
            }
            this.profile = user
            return user
        } catch (e) {
            throw new Error(e)
        }
    }

    public async SendMailTo(subject: string, nick: string, email: string, message: string): Promise<void> {
        try {
            if (!this.profile) {
                await this.GetUserProfile()
            }
            const client = await this.getOAuth2Client()
            await this.sendMail(client, subject, nick, email, message)
        } catch (e) {
            throw new Error(e)
        }
    }

    private async sendMail(client: OAuth2Client, subject: string, toNick: string, to: string, msg: string): Promise<void> {
        const name = this.profile.name
        const email = this.profile.emails[0]
        const base64EncodedEmail = Base64.encodeURI(
`From: ${name} <${email}>\r\n\
To: ${to} <${toNick}>\r\n\
Subject: ${subject}\r\n\
Content-Language: zh-TW\r\n\
Content-Type: text/html; charset="utf-8"\r\n\
\r\n\
${msg}`)

        const gmail = gapis.gmail({version: "v1", auth: client})

        try {
            const resp = await gmail.users.messages.send({
                userId: "me",
                requestBody: {
                    raw: base64EncodedEmail,
                },
            })
            if (resp.statusText !== "OK") {
                console.error(resp)
            }
        } catch (e) {
            throw new Error(e)
        }
    }

    private async getOAuth2Client(): Promise<OAuth2Client> {
        const readFile = promisify(fs.readFile)

        try {
            const content = await readFile(APP_CREDENTIALS_PATH)
            const json = JSON.parse(content.toString())
            if (!json) {
                throw new Error("Error Unmarshal app credentials file:" + APP_CREDENTIALS_PATH)
            }
            if (!json.web) {
                throw new Error("Error Format app credentials file:" + APP_CREDENTIALS_PATH)
            }
            const client = await this.getAuth(json.web as ICredentials)
            return client
        } catch (err) {
            throw new Error(err)
        }
    }

    private async getAuth(credentials: ICredentials): Promise<OAuth2Client> {

        if (!credentials.redirect_uris) {
            throw new Error("Redirect Uris must be set.")
        }

        const oAuth2Client = new OAuth2Client(
            credentials.client_id,
            credentials.client_secret,
            credentials.redirect_uris[0])

        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: "offline",
            scope: this.SCOPES,
            prompt: "consent", // 顯示確認權限的按鈕
        })

        const code = this.store.get("code") as string

        if (!code) {
            // first authorization: 當使用者Accept之後，會取得access_token和refresh_token
            try {
                const c = await this.openAuthWindow(authUrl, oAuth2Client)
                const resp = await oAuth2Client.getToken(c)
                if (resp.tokens) {
                    this.store.set("code", c)
                    this.store.set("tokens", JSON.stringify(resp.tokens))
                    oAuth2Client.setCredentials(resp.tokens)
                    return oAuth2Client
                }
                throw new Error("Error retrieving access token")
            } catch (e) {
                throw new Error(e)
            }
        }

        return new Promise<OAuth2Client>((rs, rj) => {
            const oldTokens = JSON.parse(this.store.get("tokens")) as Credentials

            oAuth2Client.on("tokens", ((tokens: Credentials) => {
                tokens.refresh_token = oldTokens.refresh_token
                this.store.set("tokens", JSON.stringify(tokens))
                oAuth2Client.setCredentials(tokens)
                rs(oAuth2Client)
            }).bind(this))

            oAuth2Client.setCredentials({ refresh_token: oldTokens.refresh_token })
            // refresh the access_token
            oAuth2Client.getRequestHeaders(authUrl)
            .then(headers => {
            })
            .catch(e => {
                rj(e)
            })
        })
    }

    private async openAuthWindow(authUrl: string, oAuth2Client: OAuth2Client): Promise<string> {

        return new Promise<string>((rs, rj) => {

            const window = new BrowserWindow({
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

            let qs: querystring.ParsedUrlQuery

            window.webContents.on("will-navigate", (event: Event, newUrl: string) => {
                if (!newUrl.startsWith("https://localhost/?")) {
                    return
                }
                event.preventDefault()
                qs = querystring.parse(url.parse(newUrl).query)
                window.close()
            })
            window.on("closed", () => {
                this.authWindow = null

                if (!qs) {
                    rs("")
                    return
                }

                if (!qs.code) {
                    rj("CODE is not exist")
                    return
                }

                const code: string = qs["code"] as string

                rs(code)
                return
            })
            window.loadURL(authUrl)
            window.show()
        })
    }
}
