import React, { Component } from "react"
import { Button } from "antd"
import * as style from "./CSSPage.scss"
import { ipcRenderer } from "electron"
import { PromiseIpcRenderer, ApiRoute } from "model"

interface ComponentProps {

}

interface ComponentState {

}

export class CSSPage extends Component<ComponentProps, ComponentState> {

    constructor(props: ComponentProps) {
        super(props)

    }

    private sendTest() {
        PromiseIpcRenderer.send(ApiRoute.googleSendMail)
    }

    public render() {

        return (
        <div>
            <Button className={style.but} onClick={this.sendTest}>Send Test Mail</Button>
        </div>
        )
    }
}
