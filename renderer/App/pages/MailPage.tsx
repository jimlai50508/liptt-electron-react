import React, { Component } from "react"
import { PromiseIpcRenderer, MailAbstract, ApiRoute } from "model"

interface ComponentProps {

}

interface ComponentState {

}

export class MailPage extends Component<ComponentProps, ComponentState> {

    public componentDidMount() {
        PromiseIpcRenderer.send<MailAbstract[]>(ApiRoute.getMailList)
        .then((result) => {
        })
    }

    public render() {
        return(
            <div />
        )
    }
}
