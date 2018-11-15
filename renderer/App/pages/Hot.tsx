import React, { Component } from "react"
interface ComponentProps {

}

interface ComponentState {

}

export class Hot extends Component<ComponentProps, ComponentState> {

    constructor(prop: ComponentProps) {
        super(prop)
        this.state = {
            loading: true,
            data: [],
        }
    }

    public componentDidMount() {

    }

    public componentWillUnmount() {
    }

    public render() {
        return (
        <div>
            <div />
        </div>)
    }
}
