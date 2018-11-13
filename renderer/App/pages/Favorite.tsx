import React from "react"
import { Component } from "react"
import { Table } from "antd"
import { ColumnProps } from "antd/lib/table"
import { FavoriteItem, PromiseIpcRenderer } from "model"

const columns: Array<ColumnProps<FavoriteItem>> = [
    {
        title: "Index",
        dataIndex: "key",
        sorter: (a, b) => a.key - b.key,
    },
    {
        title: "Name",
        dataIndex: "name",
    },
    {
        title: "Type",
        dataIndex: "type",
    },
    {
        title: "Description",
        dataIndex: "description",
    },
]

interface ComponentProps {

}

interface ComponentState {
    loading: boolean,
    data: FavoriteItem[]
}

export class Favorite extends Component<ComponentProps, ComponentState> {

    constructor(prop: ComponentProps) {
        super(prop)
        this.state = {
            loading: true,
            data: [],
        }
    }

    public componentDidMount() {
        PromiseIpcRenderer.send<FavoriteItem[]>("/favor")
        .then((items) => {
            this.setState((prev, _) => ({...prev, data: items, loading: false}))
        })
    }

    public componentWillUnmount() {
    }

    public render() {
        return (
            <Table {...this.state} columns={columns} dataSource={this.state.data}/>
        )
    }
}
