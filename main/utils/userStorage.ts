import ElectronStore = require("electron-store")
import { User } from "../model"
import { shell } from "electron"

/** UserStorage: 使用者帳號相關設定 */
export class UserStorage {

    private static readonly storeName = "user"
    private static readonly key = "liptt-electron-react"

    private static store: ElectronStore = new ElectronStore({
        name: UserStorage.storeName,
        encryptionKey: UserStorage.key, // 加密只是為了不要那麼容易發現
    })
    public static set User(u: User) {
        UserStorage.store.set(UserStorage.storeName, u)
    }

    public static get User(): User {
        return UserStorage.store.get(UserStorage.storeName) as User
    }

    public static get path() {
        return UserStorage.store.path
    }
}
