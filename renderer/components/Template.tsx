import React, { Component } from "react"

interface ComponentProps {
    name: string
}

interface ComponentState {}

export class Template extends Component<ComponentProps, ComponentState> {
    private onHello = () => {
        return "hello"
    }

    public render() {
        return <button onClick={this.onHello} />
    }
}

const Temp: React.SFC<ComponentProps> = props => <div>{props.children}</div>
