import React, { Component } from "react"
import { HashRouter } from "react-router-dom"
import { Switch, Route } from "react-router-dom"
import { MainPage, LoginPage } from "./pages"

import { Provider } from "mobx-react"
import { AppStore } from "components/AppStore"
import MobXDevTools from "mobx-react-devtools"
import Controller from "components/Controller"
import { PromiseIpcRenderer } from "model"

interface ComponentProps {
}

interface ComponentState {
    isDevMode: boolean
}

export default class extends Component<ComponentProps, ComponentState> {

    private appStore: AppStore

    constructor(props: ComponentProps) {
        super(props)
        this.state = { isDevMode: true }
        this.appStore = new AppStore()
    }

    public componentDidMount() {
        PromiseIpcRenderer.send<boolean>("/is-dev-mode")
        .then((mode) => {
            this.setState((prev, props) => ({isDevMode: mode}))
        })
    }

    public render() {
        return (
            <div>
            {this.state.isDevMode ? <MobXDevTools /> : null}
            <Provider {...this.appStore}>
                <div>
                <Controller />
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
            </div>
        )
    }
}
