import React, { Component, CSSProperties } from "react"
import { Button } from "antd"
import { PromiseIpcRenderer, ApiRoute } from "model"
import * as mystyle from "./CSSPage.scss"
import "react-virtualized/styles.css"
import { List, AutoSizer, ListRowProps } from "react-virtualized"

interface ComponentProps {

}

interface TT {
    key: string
    name: string
}

interface ComponentState {
    list: TT[]
}

class ListItem extends Component<ListRowProps & TT> {
    public render() {
        return (
            <div style={this.props.style}>
                <div key={this.props.key}>{this.props.name}</div>
            </div>
        )
    }
}

export class CSSPage extends Component<ComponentProps, ComponentState> {

    constructor(props: ComponentProps) {
        super(props)
        this.state = {
            list: [],
        }
    }

    private sendTest() {
        PromiseIpcRenderer.send(ApiRoute.googleSendMail)
    }

    private getList = () => {
        this.setState({list: [{key: "sdfsdfwe", name: "a"}, {key: "12312as", name: "b"}]})
    }

    public componentDidMount() {
        this.getList()
    }

    public render() {

        const { list } = this.state

        return (
        <div>
            <Button className={mystyle.but} onClick={this.sendTest}>Send Test Mail</Button>
            <AutoSizer>
                {({ width, height }) => (
                        <List
                            width={width}
                            height={height}
                            overscanRowCount={10}
                            rowCount={list.length}
                            rowHeight={100}
                            rowRenderer={({key, index, style}) => (<ListItem
                                style={style}
                                columnIndex={index}
                                isScrolling
                                isVisible
                                index={index}
                                parent={null}
                                key={key}
                                name={list[index].name}  />)}
                        />
                    )}
            </AutoSizer>
        </div>
        )
    }
}
