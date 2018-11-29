import React, { Component } from "react"
import { Button } from "antd"
import { PromiseIpcRenderer, ApiRoute } from "model"
import * as style from "./CSSPage.scss"
import aa, { HelloResult } from "./helloworld.gql"
import { ASTNode } from "graphql"

interface ComponentProps {

}

interface ComponentState {

}

export class CSSPage extends Component<ComponentProps, ComponentState> {

    constructor(props: ComponentProps) {
        super(props)
    }

    private sendTest() {
        const query = "query { hello }"
        const t = aa as ASTNode
        console.log(t.loc.source)
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
