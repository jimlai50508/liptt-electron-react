import React, { Component } from "react"
import { Table } from "antd"
import { ColumnProps } from "antd/lib/table"
import { HotItem, PromiseIpcRenderer } from "model"

const columns: Array<ColumnProps<HotItem>> = [
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
    {
        title: "Popular",
        dataIndex: "popularity",
    },
]

interface ComponentProps {

}

interface ComponentState {
    loading: boolean,
    data: HotItem[]
}

export class Hot extends Component<ComponentProps, ComponentState> {

    private umount: boolean

    constructor(prop: ComponentProps) {
        super(prop)
        this.state = {
            loading: true,
            data: [],
        }
    }

    public componentDidMount() {
        PromiseIpcRenderer.send<HotItem[]>("/hot")
        .then((items) => {
            if (!this.umount) {
                this.setState((prev, _) => ({...prev, data: items, loading: false}))
            }
        })
    }

    public componentWillUnmount() {
        this.umount = true
    }

    public render() {
        return (
            <Table {...this.state} columns={columns} dataSource={this.state.data}/>
        )
    }
}
