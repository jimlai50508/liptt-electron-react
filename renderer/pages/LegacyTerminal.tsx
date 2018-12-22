import React, { Component } from "react"
import { PromiseIpcRenderer, ApiRoute } from "model"
import * as style from "./LegacyTerminal.scss"
import "./LegacyTerminal.css"

interface ComponentProps {}

interface ComponentState {
    htmlContent: string
}

export class LegacyTerminal extends Component<ComponentProps, ComponentState> {
    public componentDidMount() {
        PromiseIpcRenderer.send<string>(ApiRoute.terminalSnapshot).then(ans => {
            this.setState((prev, _) => ({ htmlContent: ans }))
        })
    }

    constructor(props: ComponentProps) {
        super(props)
        this.state = { htmlContent: "" }
    }

    public render() {
        return (
            <div className={style.wrapper}>
                <div className={style.mainContainer}>
                    <div className={style.container}>
                        <div className={style.bbsWrapper}>
                            <div
                                className={style.bbsWrapper}
                                dangerouslySetInnerHTML={{ __html: this.state.htmlContent }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}
