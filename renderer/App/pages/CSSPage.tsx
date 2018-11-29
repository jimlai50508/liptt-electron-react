import React, { Component } from "react"
import { Button } from "antd"
import { PromiseIpcRenderer, ApiRoute } from "model"
import * as style from "./CSSPage.scss"

interface ComponentProps {

}

interface ComponentState {

}

interface HelloResult {
    hello?: string
}

export class CSSPage extends Component<ComponentProps, ComponentState> {

    constructor(props: ComponentProps) {
        super(props)
    }

    private sendTest() {
        const query = "query { hello }"
        PromiseIpcRenderer.send<HelloResult>(ApiRoute.GraphQL, query)
        .then(result => {
            console.warn(result)
        })
    }

    public render() {

        return (
        <div>
            <Button className={style.but} onClick={this.sendTest}>Send Test Mail</Button>
        </div>
        )
    }
}
