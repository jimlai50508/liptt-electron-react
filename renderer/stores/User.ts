import { observable, action, computed, runInAction } from "mobx"
import { SocketState } from "model"
import { GraphQLError } from "graphql"
import { PromiseIpcRenderer, User, PTTState, StateString, ApiRoute } from "model"

interface GraphQLQuery {
    login: string
}

interface LoginResult {
    data?: GraphQLQuery
    errors?: GraphQLError
}

export class UserStore {
    @observable
    public socketState: SocketState

    @action
    public setSocketState(s: SocketState) {
        this.socketState = s
    }

    @observable
    public loginState: "logined" | "logging" | "logout" | "failed"

    @observable
    public errMessage: string

    @computed
    public get logined(): boolean {
        return this.loginState === "logined"
    }

    @computed get logging(): boolean {
        return this.loginState === "logging"
    }

    @action
    public async login(username: string, password: string) {
        const gql = `
        # query {
        #    me { username }
        # }
        mutation LoginMutation($user: UserInput!) {
            login(user: $user)
        }
        `
        const args = {
            user: {
                username,
                password,
            },
        }

        runInAction(() => {
            this.loginState = "logging"
        })

        const result = await PromiseIpcRenderer.send<LoginResult>(ApiRoute.GraphQL, gql, args)

        if (result.errors) {
            console.error(result.errors)
            runInAction(() => {
                this.loginState = "failed"
            })
            return
        }

        if (result.data.login !== "Ok") {
            runInAction(() => {
                this.loginState = "failed"
            })

            switch (result.data.login) {
                case "WebSocketFailed":
                    break
                case "WrongPassword":
                    break
                case "Overloading":
                    break
                case "HeavyLogin":
                    break
                default:
                    break
            }
            return
        }

        runInAction(() => {
            this.loginState = "logined"
        })
    }

    public async logout() {
        const gql = `mutation { logout }`
        await PromiseIpcRenderer.send(ApiRoute.GraphQL, gql)
        runInAction(() => {
            this.loginState = "logout"
        })
    }

    constructor() {
        runInAction(() => {
            this.socketState = SocketState.Closed
            this.loginState = "logout"
            this.errMessage = ""
        })
    }
}
