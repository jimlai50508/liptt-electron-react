import { configure } from "mobx"
import { UserStore } from "./User"

configure({
    enforceActions: "always",
})

export interface IUserStore {
    user?: UserStore
}

export class AppStore {
    public static User = "user"

    private user: UserStore

    constructor() {
        this.user = new UserStore()
    }
}
