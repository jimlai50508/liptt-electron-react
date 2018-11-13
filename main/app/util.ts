import { app, BrowserWindow } from "electron"

export function isDevMode() {
    return !app.isPackaged
}

export class Debug {
    public static window: BrowserWindow
    /** 輸出偵錯訊息 */
    public static log(message?: any, ...optionalParams: any[]) {
        if (isDevMode()) {
            this.window.webContents.send("debug:log", { message, optionalParams })
        }
    }

    /** 輸出警告訊息 */
    public static warn(message?: any, ...optionalParams: any[]) {
        if (isDevMode()) {
            this.window.webContents.send("debug:warn", {message, optionalParams})
        }
    }

    /** 輸出錯誤訊息 */
    public static error(message?: any, ...optionalParams: any[]) {
        this.window.webContents.send("debug:error", {message, optionalParams})
    }

    /** 清除console */
    public static clear() {
        if (isDevMode()) {
            this.window.webContents.send("debug:clear")
        }
    }
}
