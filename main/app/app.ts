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
    shell,
} from "electron"
import installExtension, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer"
import * as path from "path"
import Semaphore from "semaphore-async-await"
import { name as appName } from "../../../package.json"
import { isDevMode, RendererConsole, UserStorage, LogFile, Google } from "../utils"
import * as fs from "fs"
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
    FavoriteItemType,
} from "../model"
import { ApiRoute } from "../model"
import {
    graphql,
    buildSchema,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLError,
    GraphQLEnumType,
} from "graphql"
import { makeExecutableSchema, IResolverObject, IResolvers } from "graphql-tools"

export class App {
    private mainWindow: BrowserWindow
    private windowOptions: BrowserWindowConstructorOptions
    private readonly iconSrc = path.join(__dirname, "../../../resources/icons/256x256.png")
    private tray: Tray
    private client: LiPTT
    private semaphore: Semaphore
    private schema: GraphQLSchema
    private forceQuit: boolean

    constructor() {
        this.mainWindow = null
        this.semaphore = new Semaphore(1)
        this.windowOptions = {
            title: appName,
            show: false,
            frame: true,
            width: 1050,
            height: 590,
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

        app.on("ready", async () => {})

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
            // globalShortcut.register("f5", () => {
            //     this.mainWindow.reload()
            // })
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
            this.forceQuit = true
        })

        const menuTemplate: MenuItemConstructorOptions[] = [
            {
                label: "File",
                submenu: [
                    {
                        label: "File",
                        click: () => {
                            shell.openExternal("https://www.google.com.tw/")
                            // const name = JSON.parse(fs.readFileSync(path.join(app.getAppPath(), "package.json"), "utf8")).name
                            // const appData = path.join(app.getPath("appData"), name)
                            // fs.readdir(appData, (err, files) => {
                            //     if (err) {
                            //         return
                            //     }
                            //     RendererConsole.error(files)
                            // })
                        },
                    },
                    {
                        label: "Quit",
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
                    label: "Toggle Menu Bar",
                    accelerator: "F9",
                    click: (_menuitem: MenuItem, w: BrowserWindow, _: Electron.Event) => {
                        const v = w.isMenuBarVisible()
                        w.setMenuBarVisibility(!v)
                    },
                },
                {
                    label: "Toggle FullScreen",
                    accelerator: (() => {
                        if (process.platform === "darwin") {
                            return "Ctrl+Command+F"
                        } else {
                            return "F11"
                        }
                    })(),
                    click: (_: MenuItem, w: BrowserWindow) => {
                        if (w) {
                            const isFullScreen = w.isFullScreen()
                            w.setMenuBarVisibility(isFullScreen)
                            w.setFullScreen(!isFullScreen)
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
        this.mainWindow.setMenuBarVisibility(false)
    }

    private async quit() {
        await this.logout()
        app.quit()
        this.mainWindow = null
    }

    private newWindow() {
        this.mainWindow = new BrowserWindow(this.windowOptions)
        this.mainWindow.loadURL(path.join("file://", __dirname, "../../renderer/index.html"))

        this.mainWindow.on("blur", () => {
            // 按下tray, blur事件完成後, 還會觸發tray的click事件
            // this.hide()
        })

        this.mainWindow.on("focus", () => {
            this.mainWindow.webContents.send("update:focus")
        })

        this.mainWindow.once("ready-to-show", () => {
            this.mainWindow.maximize()
            this.mainWindow.show()
        })

        RendererConsole.window = this.mainWindow
        this.mainWindow.on("close", event => {
            if (!this.forceQuit) {
                event.preventDefault()
                this.forceQuit = true
                this.quit()
            }
        })
        this.tray = new Tray(this.iconSrc)
        this.tray.on("click", () => {
            this.mainWindow.show()
        })
    }

    private addAPI() {
        ipcMain.on(ApiRoute.login, async (_: EventEmitter, u: User) => {
            const s = await this.login(u)
            this.mainWindow.webContents.send(ApiRoute.login, s)
        })

        ipcMain.on(ApiRoute.logout, async (_: EventEmitter) => {
            await this.logout()
            this.mainWindow.webContents.send(ApiRoute.logout, "ok")
        })

        ipcMain.on(ApiRoute.loadUserInfo, async (_: EventEmitter) => {
            const u = this.loadUserStorage()
            this.mainWindow.webContents.send(ApiRoute.loadUserInfo, u)
        })

        ipcMain.on(ApiRoute.checkMail, async (_: EventEmitter) => {
            await this.semaphore.wait()
            const result = this.client.checkMail()
            this.mainWindow.webContents.send(ApiRoute.checkMail, result)
            this.semaphore.signal()
        })

        ipcMain.on(ApiRoute.getFavoriteList, async (_: EventEmitter) => {
            const result = await this.getFavoriteList(this.client)
            this.mainWindow.webContents.send(ApiRoute.getFavoriteList, result)
        })

        ipcMain.on(ApiRoute.getHotList, async (_: EventEmitter) => {
            await this.semaphore.wait()
            const data: HotItem[] = await this.client.getHotList()
            this.mainWindow.webContents.send(ApiRoute.getHotList, data)
            this.semaphore.signal()
        })

        /// 進入看板
        ipcMain.on(ApiRoute.goBoard, async (_: EventEmitter, board: string) => {
            await this.semaphore.wait()
            const result = await this.client.enterBoard(board)
            this.mainWindow.webContents.send(ApiRoute.goBoard, result)
            this.semaphore.signal()
        })

        /// 取得文章列表
        ipcMain.on(ApiRoute.getMoreBoard, async (_: EventEmitter) => {
            await this.semaphore.wait()
            const result = await this.client.getMoreArticleAbstract(30)
            RendererConsole.warn(result)
            this.mainWindow.webContents.send(ApiRoute.getMoreBoard, result)
            this.semaphore.signal()
        })

        /// 取得文章資訊
        ipcMain.on(ApiRoute.getBoardArticleHeader, async (_: EventEmitter, ab: ArticleAbstract) => {
            await this.semaphore.wait()
            const header = await this.client.getBoardArticleHeader(ab)
            this.mainWindow.webContents.send(ApiRoute.getBoardArticleHeader, header)
            this.semaphore.signal()
        })

        // 進入文章
        // ipcMain.on("/article", async (_: EventEmitter, ab: ArticleAbstract) => {
        //     await this.semaphore.wait()
        //     const result = await this.client.enterArticle(ab)
        //     this.semaphore.signal()
        //     this.mainWindow.webContents.send("/article", result)
        // })

        /// 進入文章，取得文章內容
        ipcMain.on(ApiRoute.getMoreArticle, async (_: EventEmitter, h: ArticleHeader) => {
            await this.semaphore.wait()
            const ans = await this.client.getMoreArticleContent(h)
            this.mainWindow.webContents.send(ApiRoute.getMoreArticle, ans)
            this.semaphore.signal()
        })

        ipcMain.on(ApiRoute.left, async (_: EventEmitter) => {
            await this.semaphore.wait()
            await this.client.left()
            this.mainWindow.webContents.send(ApiRoute.left, { message: "done" })
            this.semaphore.signal()
        })

        ipcMain.on(ApiRoute.getMailList, async (_: EventEmitter) => {
            await this.semaphore.wait()
            const ok = await this.client.enterMailList()
            if (ok) {
                const result = await this.client.getMoreMailAbstract(40)
                this.mainWindow.webContents.send(ApiRoute.getMailList, result)
            }
            this.semaphore.signal()
        })

        ipcMain.on(ApiRoute.terminalSnapshot, async (_: EventEmitter) => {
            this.mainWindow.webContents.send(ApiRoute.terminalSnapshot, this.client.GetTerminalSnapshot())
        })

        ipcMain.on(ApiRoute.googleSendMail, async (_: EventEmitter) => {
            // await this.semaphore.wait()
            // await this.client.enterMailList()

            // const data = Terminal.GetBytesFromContent("*[1;33mHello World*[m\nTest *[1;5;34mNewLine*[m")
            // const result = await this.client.sendPttMail("lightyan", "Test NewLine", data)
            // console.log(result)
            // this.semaphore.signal()
            // this.mainWindow.webContents.send(ApiRoute.googleSendMail, { message: "done" })
            const g = new Google()
            try {
                const lines: string[] = []
                this.client.curArticleContent.map(arr => {
                    lines.push(Terminal.GetRenderStringLine(arr))
                })
                const title = this.client.curArticle.title ? this.client.curArticle.title : this.client.curArticle.url
                await g.SendMailArticleToSelf(title, title, lines)
            } catch (err) {
                console.error(err)
            }
        })

        ipcMain.on(ApiRoute.testDevMode, async (_: EventEmitter) => {
            const dev = isDevMode()
            this.mainWindow.webContents.send(ApiRoute.testDevMode, dev)
        })

        this.client.on("socket", (state: SocketState) => {
            this.mainWindow.webContents.send(ApiRoute.socketEvent, state)
        })

        fs.readFile(
            path.resolve(__dirname, "../../../resources/graphql/liptt.gql"),
            { encoding: "utf-8" },
            (err, data) => {
                if (err) {
                    console.error(err)
                    return
                }
                const typeDefs = data
                const resolvers: IResolvers = {
                    Query: {
                        me: () => {
                            return {
                                username: () => this.client.username,
                                password: () => "",
                                favor: async () => {
                                    const result = await this.getFavoriteList(this.client)
                                    return result.map(v => {
                                        let type = ""
                                        switch (v.type) {
                                            case FavoriteItemType.Board:
                                                type = "Board"
                                                break
                                            case FavoriteItemType.Folder:
                                                type = "Folder"
                                                break
                                            case FavoriteItemType.Horizontal:
                                                type = "Horizontal"
                                                break
                                        }
                                        return {
                                            key: v.key,
                                            type,
                                            name: v.name,
                                            description: v.description,
                                            popularity: v.popularity,
                                        }
                                    })
                                },
                            }
                        },
                    },
                    Mutation: {
                        login: async (root: any, args: any, context: any, info: any) => {
                            const { user } = args
                            const s = await this.login(user)

                            switch (s) {
                                case PTTState.MainPage:
                                    return "Ok"
                                case PTTState.WrongPassword:
                                    return "WrongPassword"
                                case PTTState.Overloading:
                                    return "Overloading"
                                case PTTState.HeavyLogin:
                                    return "HeavyLogin"
                                case PTTState.WebSocketFailed:
                                    return "WebSocketFailed"
                                default:
                                    return "WhereAmI"
                            }
                        },
                        logout: async () => {
                            await this.logout()
                            return "ok"
                        },
                    },
                }

                this.schema = makeExecutableSchema({ typeDefs, resolvers })
            },
        )

        ipcMain.on(ApiRoute.GraphQL, async (_: EventEmitter, gqlquery: string, inputObject: any) => {
            try {
                const result = await graphql(this.schema, gqlquery, null, null, inputObject)
                this.mainWindow.webContents.send(ApiRoute.GraphQL, result)
            } catch (err) {
                this.mainWindow.webContents.send(ApiRoute.GraphQL, err)
            }
        })
    }

    private async getFavoriteList(client: LiPTT): Promise<FavoriteItem[]> {
        if (!client.isLogin) {
            return []
        }
        await this.semaphore.wait()
        const data: FavoriteItem[] = await client.getFavorite()
        this.semaphore.signal()
        return data
    }

    private async login(u: User): Promise<PTTState> {
        await this.semaphore.wait()
        if (!u.username || !u.password) {
            this.semaphore.signal()
            return PTTState.WrongPassword
        }
        const s = await this.client.login(u.username, u.password)
        if (s === PTTState.MainPage) {
            UserStorage.User = u
        }
        this.semaphore.signal()
        return s
    }

    private async logout(): Promise<void> {
        await this.client.logout()
    }

    private loadUserStorage(): User {
        return UserStorage.User
    }
}
