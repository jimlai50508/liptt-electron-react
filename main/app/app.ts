import {
    app,
    globalShortcut,
    ipcMain,
    BrowserWindow,
    BrowserWindowConstructorOptions,
    Tray,
    Menu,
    MenuItemConstructorOptions,
    MenuItem,
    EventEmitter,
} from "electron"
import installExtension, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer"
import * as path from "path"
import Semaphore from "semaphore-async-await"
import MainWindow from "./mainWindow"
import { name as appName } from "../../../package.json"
import { isDevMode, RendererConsole, UserStorage, LogFile, Google } from "../utils"

import { LiPTT } from "../liptt"
import {
    User,
    FavoriteItem,
    ArticleAbstract,
    ArticleHeader,
    HotItem,
    PTTState,
    SocketState,
    Terminal,
    MailAbstract,
} from "../model"
import { ApiRoute } from "../model"
import { Attribute, ForeColor } from "../model/terminal"

import {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
} from "graphql"

const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: "RootQueryType",
        fields: {
            hello: {
                type: GraphQLString,
                resolve() {
                    return "world"
                },
            },
        },
    }),
})

export class App {

    private mainWindow: MainWindow
    private windowOptions: BrowserWindowConstructorOptions
    private readonly iconSrc = path.join(__dirname, "../../../resources/icons/256x256.png")
    private tray: Tray

    private client: LiPTT

    constructor() {
        this.mainWindow = null
        this.windowOptions = {
            title: appName,
            show: false,
            frame: false,
            zoomToPageWidth: false,
            backgroundColor: "#312450",
            icon: this.iconSrc,
            // 透明的時候將不能resize, 因為framework上的限制
            // transparent: true,
            // skipTaskbar: process.platform === "win32" ? true : false,
        }
    }

    public run() {
        // https://electronjs.org/docs/tutorial/security
        if (!isDevMode()) {
            // there is a bug issue
            process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true"
        }

        this.client = new LiPTT()

        app.on("ready", async () => {

        })

        app.setName(appName)
        app.on("ready", () => {
            this.newWindow()
            this.onReady()
            this.addAPI()
        })
        app.on("activate", () => {
            // on OS X it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (this.mainWindow === null) {
                this.newWindow()
                this.onReady()
                this.addAPI()
            }
        })
    }

    private onReady() {

        if (isDevMode()) {
            // 安裝 react 開發者工具
            installExtension(REACT_DEVELOPER_TOOLS, true)
            .then((name: string) => {
                // console.warn(`Added Extension:  ${name}`)
            })
            .catch((err: any) => {
                console.error("REACT_DEVELOPER_TOOLS ", err)
            })
        }

        globalShortcut.register("Escape", () => {
            if (this.mainWindow.isFocused()) {
                this.quit()
            }
        })
        if (isDevMode()) {
            globalShortcut.register("f5", () => {
                this.mainWindow.reload()
            })
            globalShortcut.register("CommandOrControl+R", () => {
                this.mainWindow.reload()
            })
        }
        this.mainWindow.once("show", () => {
            LogFile.clear()
            LogFile.log("hello world")
            if (isDevMode()) {
                RendererConsole.warn("electron in development mode")
                const o: NotificationOptions = {
                    body: "開發者模式",
                }
                this.mainWindow.webContents.send("/notification", o)
            }
        })

        app.on("before-quit", () => {
            this.mainWindow.forceQuit = true
        })

        const menuTemplate: MenuItemConstructorOptions[] = [
            {
                label: "File", submenu: [
                    { label: "File" },
                    {
                        label: "Quit",
                        // accelerator: process.platform === "win32" ? "Ctrl+Q" : "Cmd+Q",
                        click: () => {
                            this.quit()
                        },
                    },
                ],
            },
        ]

        if (process.platform === "darwin") {
            menuTemplate.unshift({} as any)
        }

        menuTemplate.push({
            label: "View",
            submenu: [
                {
                    label: "Toggle FullScreen",
                    accelerator: (() => {
                        if (process.platform === "darwin") {
                            return "Ctrl+Command+F"
                        } else {
                            return "F11"
                        }
                    })(),
                    click: (_: MenuItem, focusedWindow: BrowserWindow) => {
                        if (focusedWindow) {
                            focusedWindow.setFullScreen(!focusedWindow.isFullScreen())
                        }
                    },
                },
                {
                    label: "Toggle Developer Tools",
                    accelerator: "F12",
                    click: (_menuitem: MenuItem, browserWindow: BrowserWindow, _: Electron.Event) => {
                        browserWindow.webContents.toggleDevTools()
                    },
                },
            ],
        })

        const mainMenu: Menu = Menu.buildFromTemplate(menuTemplate)
        Menu.setApplicationMenu(mainMenu)

        if (!isDevMode()) {
            if (this.mainWindow.setMenuBarVisibility) {
                console.log("it is exist")
            } else {
                console.log("it is NOT exist")
            }
            this.mainWindow.setMenuBarVisibility(false)
        }
    }

    private async quit() {
        await this.client.logout()
        app.quit()
        this.mainWindow = null
    }

    private newWindow() {
        this.mainWindow = new MainWindow(this.windowOptions)
        RendererConsole.window = this.mainWindow
        this.mainWindow.on("close", (event: Electron.Event) => {
            if (!this.mainWindow.forceQuit) {
                event.preventDefault()
                this.mainWindow.forceQuit = true
                this.quit()
            }
        })
        this.tray = new Tray(this.iconSrc)
        this.tray.on("click", () => {
            this.mainWindow.show()
        })
    }

    private addAPI() {
        const lock = new Semaphore(1)

        ipcMain.on(ApiRoute.loadUserInfo, async (_: EventEmitter) => {
            await lock.wait()
            const u = UserStorage.User
            this.mainWindow.webContents.send(ApiRoute.loadUserInfo, u)
            lock.signal()
        })

        ipcMain.on(ApiRoute.logout, async (_: EventEmitter) => {
            await this.client.logout()
        })

        ipcMain.on(ApiRoute.login, async (_: EventEmitter, u: User) => {
            await lock.wait()
            if (u.username && u.password) {
                const s = await this.client.login(u.username, u.password)
                this.mainWindow.webContents.send(ApiRoute.login, s)
                if (s === PTTState.MainPage) {
                    UserStorage.User = u
                }
            } else {
                this.mainWindow.webContents.send(ApiRoute.login, PTTState.WrongPassword)
            }
            lock.signal()
        })

        ipcMain.on(ApiRoute.checkMail, async (_: EventEmitter) => {
            await lock.wait()
            const result = this.client.checkMail()
            this.mainWindow.webContents.send(ApiRoute.checkMail, result)
            lock.signal()
        })

        ipcMain.on(ApiRoute.getFavoriteList, async (_: EventEmitter) => {
            await lock.wait()
            const data: FavoriteItem[] = await this.client.getFavorite()
            this.mainWindow.webContents.send(ApiRoute.getFavoriteList, data)
            lock.signal()
        })

        ipcMain.on(ApiRoute.getHotList, async (_: EventEmitter) => {
            await lock.wait()
            const data: HotItem[] = await this.client.getHotList()
            this.mainWindow.webContents.send(ApiRoute.getHotList, data)
            lock.signal()
        })

        /// 進入看板
        ipcMain.on(ApiRoute.goBoard, async (_: EventEmitter, board: string) => {
            await lock.wait()
            const result = await this.client.enterBoard(board)
            this.mainWindow.webContents.send(ApiRoute.goBoard, result)
            lock.signal()
        })

        /// 取得文章列表
        ipcMain.on(ApiRoute.getMoreBoard, async (_: EventEmitter) => {
            await lock.wait()
            const result = await this.client.getMoreArticleAbstract(30)
            RendererConsole.warn(result)
            this.mainWindow.webContents.send(ApiRoute.getMoreBoard, result)
            lock.signal()
        })

        /// 取得文章資訊
        ipcMain.on(ApiRoute.getBoardArticleHeader, async (_: EventEmitter, ab: ArticleAbstract) => {
            await lock.wait()
            const header = await this.client.getBoardArticleHeader(ab)
            this.mainWindow.webContents.send(ApiRoute.getBoardArticleHeader, header)
            lock.signal()
        })

        // 進入文章
        // ipcMain.on("/article", async (_: EventEmitter, ab: ArticleAbstract) => {
        //     await lock.wait()
        //     const result = await this.client.enterArticle(ab)
        //     lock.signal()
        //     this.mainWindow.webContents.send("/article", result)
        // })

        /// 進入文章，取得文章內容
        ipcMain.on(ApiRoute.getMoreArticle, async (_: EventEmitter, h: ArticleHeader) => {
            await lock.wait()
            const ans = await this.client.getMoreArticleContent(h)
            this.mainWindow.webContents.send(ApiRoute.getMoreArticle, ans)
            lock.signal()
        })

        ipcMain.on(ApiRoute.left, async (_: EventEmitter) => {
            await lock.wait()
            await this.client.left()
            this.mainWindow.webContents.send(ApiRoute.left, { message: "done" })
            lock.signal()
        })

        ipcMain.on(ApiRoute.getMailList, async (_: EventEmitter) => {
            await lock.wait()
            const ok = await this.client.enterMailList()
            if (ok) {
                const result = await this.client.getMoreMailAbstract(40)
                this.mainWindow.webContents.send(ApiRoute.getMailList, result)
            }
            lock.signal()
        })

        ipcMain.on(ApiRoute.terminalSnapshot, async (_: EventEmitter) => {
            this.mainWindow.webContents.send(ApiRoute.terminalSnapshot, this.client.GetTerminalSnapshot())
        })

        ipcMain.on(ApiRoute.googleSendMail, async (_: EventEmitter) => {
            await lock.wait()
            await this.client.enterMailList()

            const data = Terminal.GetBytesFromContent("*[1;33mHello World*[m\nTest *[1;5;34mNewLine*[m")
            const result = await this.client.sendPttMail("lightyan", "Test NewLine", data)
            console.log(result)
            lock.signal()
            this.mainWindow.webContents.send(ApiRoute.googleSendMail, { message: "done" })
            // const g = new Google()
            // try {
            //     const lines: string[] = []
            //     this.client.curArticleContent.map((arr) => {
            //         lines.push(Terminal.GetRenderStringLine(arr))
            //     })
            //     const title = this.client.curArticle.title ? this.client.curArticle.title : this.client.curArticle.url
            //     await g.SendMailArticleToSelf(title, title, lines)
            // } catch (err) {
            //     console.error(err)
            // }
        })

        ipcMain.on(ApiRoute.GraphQL, async (_: EventEmitter, query: string) => {
            await lock.wait()
            const result = await graphql(schema, query)
            this.mainWindow.webContents.send(ApiRoute.GraphQL, result)
            lock.signal()
        })

        ipcMain.on(ApiRoute.testDevMode, async (_: EventEmitter) => {
            const dev = isDevMode()
            this.mainWindow.webContents.send(ApiRoute.testDevMode, dev)
        })

        this.client.on("socket", (state: SocketState) => {
            this.mainWindow.webContents.send(ApiRoute.socketEvent, state)
        })
    }
}
