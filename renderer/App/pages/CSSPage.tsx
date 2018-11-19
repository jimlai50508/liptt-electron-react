import React, { Component } from "react"
import { Button } from "antd"
import * as style from "./CSSPage.scss"

interface ComponentProps {

}

interface ComponentState {

}

export class CSSPage extends Component<ComponentProps, ComponentState> {

    constructor(props: ComponentProps) {
        super(props)

    }

    public render() {

        return (
        <div>
            <Button className={style.but}>1231232</Button>
        </div>
        )
    }
}
