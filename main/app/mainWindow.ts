import { BrowserWindow, BrowserWindowConstructorOptions } from "electron"
import * as path from "path"

export default class MainWindow extends BrowserWindow {

    public forceQuit: boolean

    constructor(options: BrowserWindowConstructorOptions) {

        super(options)

        this.loadURL(path.join("file://", __dirname, "../../renderer/index.html"))

        this.on("blur", () => {
            // 按下tray, blur事件完成後, 還會觸發tray的click事件
            // this.hide()
        })

        this.on("focus", () => {
            this.webContents.send("update:focus")
        })

        this.once("ready-to-show", () => {
            // This will also show (but not focus) the window if it isn't being displayed already.
            this.maximize()
            this.show()
        })
    }
}
