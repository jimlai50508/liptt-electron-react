import ElectronStore = require("electron-store")
import { User } from "../model"
const CryptoJS = require("crypto-js")

/** 存放位置：app.getPath("userData") */
export class UserStorage {

    private static store: ElectronStore = new ElectronStore({ name: "user-storage" })

    private static readonly storeName = "user"
    private static readonly key = "liptt-electron-react"

    public static set User(u: User) {
        u.username = CryptoJS.AES.encrypt(u.username, UserStorage.key).toString()
        u.password = CryptoJS.AES.encrypt(u.password, UserStorage.key).toString()
        UserStorage.store.set(UserStorage.storeName, u)
    }

    public static get User(): User {
        const u = UserStorage.store.get(UserStorage.storeName) as User
        if (u) {
            u.username = CryptoJS.AES.decrypt(u.username, UserStorage.key).toString(CryptoJS.enc.Utf8)
            u.password = CryptoJS.AES.decrypt(u.password, UserStorage.key).toString(CryptoJS.enc.Utf8)
        }
        return u
    }
}
