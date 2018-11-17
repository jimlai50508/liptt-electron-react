import React, { Component } from "react"
import { Layout } from "antd"
import autobind from "autobind-decorator"
import { ScrollView } from "../components/ScrollView/ScrollView"
import { Row, Button } from "antd"
import Semaphore from "semaphore-async-await"
import { ArticleAbstract, ArticleHeader, PromiseIpcRenderer } from "model"
import { Block, toString } from "model"
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
    private prevab: ArticleAbstract

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

                    if (this.prevab !== item) {
                        if (this.prevab && !this.prevab.deleted) {
                            await PromiseIpcRenderer.send<void>("/left")
                        }
                        this.prevab = item
                    }

                    const info = await PromiseIpcRenderer.send<ArticleHeader>("/board/article-header", item)
                    if (info.deleted) {
                        item.deleted = info.deleted
                        console.error(info)
                        return
                    }

                    const lines = await PromiseIpcRenderer.send<Block[][]>("/article/get-more", item)
                    lines.forEach((s) => {
                        console.log(toString(s))
                    })
                }}>
                    <span>{item.key} {item.aid} {item.type} {item.author} {item.category} {item.title}</span>
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
