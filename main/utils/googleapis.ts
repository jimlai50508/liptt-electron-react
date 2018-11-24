import { BrowserWindow, globalShortcut } from "electron"
import ElectronStore = require("electron-store")
import fs = require("fs")
import path = require("path")
import url = require("url")
import querystring = require("querystring")
import { promisify } from "util"
import { plus_v1, gmail_v1 } from "googleapis"
import { Base64 } from "js-base64"
import { OAuth2Client, Credentials } from "google-auth-library"
const libmime = require("libmime")
const readFile = promisify(fs.readFile)

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

interface Email {
    type?: string
    value?: string
}

interface UserProfile {
    name?: string
    emails?: Email[]
}

const ICON_PATH = path.resolve(__dirname, "../../../resources/icons/256x256.png")
const APP_CREDENTIALS_PATH = path.resolve(__dirname, "../../../resources/credentials.json")

/** https://github.com/googleapis/google-api-nodejs-client#getting-started */
export class Google {

    /// https://myaccount.google.com/permissions 第三方應用程式權限
    /// https://developers.google.com/+/web/api/rest/latest/people/get
    /// https://developers.google.com/+/web/api/rest/latest/people#emails
    /// https://developers.google.com/gmail/api/v1/reference/users/messages/send
    /// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Complete_list_of_MIME_types

    /** Google API 應用程式權限範圍 */
    private readonly SCOPES = [
        "https://www.googleapis.com/auth/plus.me",
        "https://www.googleapis.com/auth/plus.profile.emails.read",
        "https://www.googleapis.com/auth/gmail.send",
    ]

    private readonly storeName = "google"
    /**
     * 存放位置
     * windows: %UserProfile%\AppData\{AppName}
     */
    private store: ElectronStore

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
        const plus = new plus_v1.Plus({ auth: client })

        try {
            const resp = await plus.people.get({userId: "me"})
            const user: UserProfile = {
                name: resp.data.displayName,
                emails: resp.data.emails,
            }
            return user
        } catch (e) {
            throw new Error(e)
        }
    }

    /**
     * @param mailto 收件人
     * @param alias 收件人暱稱
     * @param subject 標題
     * @param content 內容
     */
    public async SendMailArticleTo(mailto: string, alias: string, subject: string, title: string, htmls: string): Promise<void> {
        try {
            const client = await this.getOAuth2Client()
            await this.sendMail(client, mailto, alias, subject, title, htmls)
        } catch (e) {
            throw new Error(e)
        }
    }

    /**
     * @param subject 標題
     * @param content 內容
     */
    public async SendMailArticleToSelf(subject: string, title: string, htmls: string[]): Promise<void> {
        try {
            const user = await this.GetUserProfile()
            if (user && user.emails[0].value) {
                const client = await this.getOAuth2Client()
                const content = await this.generateHtmlContent(title, htmls)
                await this.sendMail(client, user.emails[0].value, user.name, subject, title, content)
            }
        } catch (e) {
            throw new Error(e)
        }
    }

    private async generateHtmlContent(title: string, lines: string[]): Promise<string> {
        const css = await readFile(path.resolve(__dirname, "../../../resources/liptt-email.css"))
        return `<!DOCTYPE html>
        <html>
        <head>
            <meta http-equiv=\"Content-type\" content=\"text/html; charset=utf-8\" />
            <title>${title}</title>
            <style>
            ${css}
            </style>
        </head>
        <body>
            <div class="mainContainer">
                <div class="container">
                    <div class="bbsWrapper">
                    ${lines.reduce((v, cur) => v + cur)}
                    </div>
                </div>
            </div>
        </body>
        </html>`
    }

    private async sendMail(client: OAuth2Client, mailto: string, alias: string, subject: string, title: string, htmlContent: string): Promise<void> {
        const gmail = new gmail_v1.Gmail({auth: client})
        const raw =
        `To: ${libmime.encodeWord(alias, "Q")} <${mailto}>\r\n` +
        `Subject: ${libmime.encodeWord(subject, "Q")}\r\n` +
        `MIME-Version: 1.0\r\n` +
        libmime.foldLines("Content-Type: multipart/mixed; boundary=\"======THIS_IS_BOUNDARY======\"") + "\r\n" +
        "Content-Description: multipart-1\r\n" +
        "\r\n" +
        "--======THIS_IS_BOUNDARY======\r\n" +
        `Content-Type: text/html\r\n` +
        `Content-Description: content\r\n` +
        "\r\n" + htmlContent + "\r\n" +
        "--======THIS_IS_BOUNDARY======\r\n" +
        `Content-Type: application/octet-stream\r\n` +
        `Content-Disposition: attachment; filename=\"${title}.html\"\r\n` +
        `Content-Description: article\r\n` +
        "\r\n" +
        htmlContent + "\r\n" +
        "--======THIS_IS_BOUNDARY======--\r\n"

        try {
            const resp = await gmail.users.messages.send({
                userId: "me",
                requestBody: {
                    raw: Base64.encodeURI(raw),
                },
            })
            if (resp.statusText !== "OK") {
                console.error(resp)
            }
        } catch (e) {
            throw new Error(e)
        }
    }

    private async attachImage(filename: string): Promise<string> {
        try {
            const img = await readFile(filename)
            const raw =
            `Content-Type: image/png\r\n` +
            "Content-Transfer-Encoding: base64\r\n" +
            `Content-Disposition: attachment; filename=\"${path.basename(filename)}\"\r\n` +
            `Content-Description: image\r\n` +
            "\r\n" + img.toString("base64") + "\r\n"
            return raw
        } catch (err) {
            throw new Error(err)
        }
    }

    private async getOAuth2Client(): Promise<OAuth2Client> {
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

            const win = new BrowserWindow({
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

            const escape = () => {
                if (win.isFocused()) {
                    win.close()
                }
            }

            let qs: querystring.ParsedUrlQuery

            win.webContents.on("will-navigate", (event: Event, newUrl: string) => {
                if (!newUrl.startsWith("https://localhost/?")) {
                    return
                }
                event.preventDefault()
                qs = querystring.parse(url.parse(newUrl).query)
                window.close()
            })
            win.on("closed", () => {
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
            win.loadURL(authUrl)
            win.show()
        })
    }
}
