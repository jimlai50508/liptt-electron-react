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
        return new Promise<UserProfile>((rs, rj) => {
            this.getOAuth2Client()
            .then(client => {
                this.getUserProfile(client)
                .then(u => rs(u))
                .catch(e => rj(e))
            })
            .catch(e => {
                rj(e)
            })
        })

    }

    private async getUserProfile(auth: OAuth2Client): Promise<UserProfile> {
        return new Promise<UserProfile>((rs, rj) => {
            gapis.plus({version: "v1", auth}).people.get({userId: "me"})
            .then((resp) => {
                const user: UserProfile = {}
                user.name = resp.data.displayName
                const emails = resp.data.emails
                if (emails) {
                    user.emails = resp.data.emails
                }
                this.profile = user
                rs(user)
            })
            .catch((e) => {
                if (e.message) {
                    rj(e.message)
                } else {
                    rj(e)
                }
            })
        })
    }

    public async SendMailTo(subject: string, nick: string, email: string, message: string): Promise<void> {

        return new Promise<void>((rs, rj) => {

            if (!this.profile) {
                this.GetUserProfile()
                .then(u => {
                    this.getOAuth2Client()
                    .then(client => {
                        this.sendMail(client, subject, nick, email, message)
                        .then(() => {rs()})
                        .catch(e => rj(e))
                    })
                    .catch(e => {
                        rj(e)
                    })
                })
                .catch(e => rj(e))
            }
        })
    }

    private async sendMail(auth: OAuth2Client, subject: string, toNick: string, to: string, msg: string): Promise<void> {
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

        return new Promise<void>((rs, rj) => {
            gapis.gmail({version: "v1", auth}).users.messages.send(
                {
                    userId: "me",
                    requestBody: {
                        raw: base64EncodedEmail,
                    },
                }, (err: Error, res: any) => {
                    if (err) {
                        rj("The API returned an error: " + err)
                        return
                    } else if (res.statusText === "OK") {
                        rs()
                    }
                },
            )
        })
    }

    private async getOAuth2Client(): Promise<OAuth2Client> {
        return new Promise<OAuth2Client>((rs, rj) => {
            fs.readFile(APP_CREDENTIALS_PATH, async (err, content) => {
                if (err) {
                    rj("Error loading app credentials file: " + err)
                    return
                }
                const json = JSON.parse(content.toString())
                if (!json) {
                    rj("Error Unmarshal app credentials file:" + APP_CREDENTIALS_PATH)
                    return
                }
                if (!json.web) {
                    rj("Error Format app credentials file:" + APP_CREDENTIALS_PATH)
                    return
                }
                this.getAuth(json.web as ICredentials)
                .then(c => rs(c))
                .catch(e => rj(e))
            })
        })
    }

    private async getAuth(credentials: ICredentials): Promise<OAuth2Client> {
        return new Promise<OAuth2Client>((rs, rj) => {
            if (!credentials.redirect_uris) {
                rj("Redirect Uris must be set.")
                return
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
                this.openAuthWindow(authUrl, oAuth2Client)
                .then(c => {
                    if (!c) {
                        return
                    }
                    oAuth2Client.getToken(c, (err, tokens) => {
                        if (err) {
                            rj("Error retrieving access token: " + err)
                            return
                        }
                        this.store.set("code", c)
                        this.store.set("tokens", JSON.stringify(tokens))
                        oAuth2Client.setCredentials(tokens)
                        rs(oAuth2Client)
                    })
                })
                .catch(e => rj(e))
                return
            }

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
