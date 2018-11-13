import React, { Component } from "react"
import { Layout } from "antd"
import autobind from "autobind-decorator"
import { ScrollView } from "../components/ScrollView/ScrollView"
import { Row, Button } from "antd"
import Semaphore from "semaphore-async-await"
import { ArticleAbstract, ArticleHeader, PromiseIpcRenderer } from "model"
import { Block } from "terminal"
import * as style from "./Test.scss"

interface ComponentProps {

}

interface ComponentState {
    data: ArticleAbstract[]
    ready: boolean
}

export class Test extends Component<ComponentProps, ComponentState> {

    private lock: Semaphore
    private umount: boolean

    private starKey: number = -1
    private ih: number = 30

    public async componentDidMount() {
        const r = await PromiseIpcRenderer.send<boolean>("/board", "Test")
        this.setState((prev, _) => ({...prev, ready: r}))
    }

    public async componentWillUnmount() {
        this.umount = true
    }

    constructor(prop: ComponentProps) {
        super(prop)
        this.state = {
            data: [],
            ready: false,
        }
        this.umount = false
        this.lock = new Semaphore(1)
    }

    @autobind
    private async getMore(): Promise<JSX.Element[]> {
        await this.lock.wait()
        const ans = await PromiseIpcRenderer.send<ArticleAbstract[]>("/board/get-more")
        if (ans.length === 0) {
            this.lock.signal()
            return []
        }
        if (this.umount) {
            this.lock.signal()
            return []
        }
        const result = ans.map(item => (
        <Row
            key={item.key !== Number.MAX_SAFE_INTEGER ? item.key : this.starKey--}
            style={{height: this.ih + "px"}}
            className={style.myRow}
        >
            <div className={style.myDiv}>
                <Button onClick={async () => {
                    const info = await PromiseIpcRenderer.send<ArticleHeader>("/board/article-header", item)
                    if (info.deleted) {
                        return
                    }

                    const lines = await PromiseIpcRenderer.send<Block[][]>("/article/get-more", item)

                    if (!lines[0]) {
                        return
                    }
                    await PromiseIpcRenderer.send<boolean>("/left")
                }}>
                    <span>{item.key} {item.type} {item.category} {item.title}</span>
                </Button>
            </div>
        </Row>))

        this.lock.signal()

        return result
    }

    public render() {
        return(
            <Layout style={{position: "absolute", top: "0", bottom: "0", left: "0", right: "0"}}>
                <Layout.Content className={style.container}>
                    {this.state.ready ?
                    <ScrollView
                        getMore={this.getMore}
                        itemHeight={this.ih}
                        thumbHeight="18%"
                        autoHideThumb
                    /> : null}
                </Layout.Content>
            </Layout>
        )
    }
}
