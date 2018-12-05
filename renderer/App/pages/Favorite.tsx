import React, { Component } from "react"
import { Table } from "antd"
import { ColumnProps } from "antd/lib/table"
import { FavoriteItem, PromiseIpcRenderer, ApiRoute } from "model"
import { GraphQLError } from "graphql"

const columns: Array<ColumnProps<FavoriteItemInfo>> = [
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
    data: FavoriteItemInfo[]
}

interface FavoriteItemInfo {
    key: number
    type: string
    name?: string
    description?: string
    popularity?: number
}

interface ResponseData {
    me: {
        favor: FavoriteItemInfo[],
    }
}

interface Response {
    data?: ResponseData
    errors?: GraphQLError
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
        // PromiseIpcRenderer.send<FavoriteItem[]>(ApiRoute.getFavoriteList)
        // .then((items) => {
        //     this.setState((prev, _) => ({...prev, data: items, loading: false}))
        // })
        const gql = `
        fragment FavoriteItemInfo on FavoriteItem {
            key
            type
            name
            description
            popularity
        }
        {
            me {
                favor { ... FavoriteItemInfo }
            }
        }
        `
        PromiseIpcRenderer.send<Response>(ApiRoute.GraphQL, gql)
        .then((res) => {
            this.setState((prev, _) => ({...prev, data: res.data.me.favor, loading: false}))
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
