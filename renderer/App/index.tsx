import React, { Component } from "react"
import { HashRouter } from "react-router-dom"
import { Switch, Route } from "react-router-dom"
import { MainPage, LoginPage } from "./pages"
import { Provider, inject } from "mobx-react"
import { PromiseIpcRenderer } from "model"
import { AppStore } from "components/AppStore"
import MobXDevTools from "mobx-react-devtools"
import Controller from "components/Controller"

interface ComponentProps {}

interface ComponentState {
    isDevMode: boolean
}

export default class extends Component<ComponentProps, ComponentState> {
    private appStore: AppStore

    constructor(props: ComponentProps) {
        super(props)
        this.state = { isDevMode: false }
        this.appStore = new AppStore()
    }

    public componentDidMount() {
        PromiseIpcRenderer.send<boolean>("/is-dev-mode").then(mode => this.setState({ isDevMode: mode }))
    }

    public render() {
        return (
            <Provider {...this.appStore}>
                <div>
                    <Controller />
                    {this.state.isDevMode ? <MobXDevTools /> : null}
                    <HashRouter>
                        <Switch>
                            <Route exact path="/">
                                <LoginPage />
                            </Route>
                            <Route path="/Main">
                                <MainPage />
                            </Route>
                        </Switch>
                    </HashRouter>
                </div>
            </Provider>
        )
    }
}
