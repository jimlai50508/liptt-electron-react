import React, { Component, MouseEvent, UIEvent, HTMLAttributes, CSSProperties } from "react"
import autobind from "autobind-decorator"
import { Spin } from "antd"
import * as style from "./ScrollView.scss"
import Semaphore from "semaphore-async-await"

interface ComponentProps extends HTMLAttributes<HTMLDivElement> {
    getMore: () => Promise<JSX.Element[]>
    thumbHeight: string
    itemHeight: number
    threshold?: number
    autoHideThumb?: boolean
}
interface ComponentState {
    thumbHide: boolean
    thumbStyle: CSSProperties
}

interface MousePos {
    x: number
    y: number
}

export class ScrollView extends Component<ComponentProps, ComponentState> {

    private RefScrollView: HTMLDivElement
    private RefThumb: HTMLDivElement
    private RefScrollConent: HTMLDivElement

    private items: JSX.Element[]

    private prevMouse: MousePos
    private lock: boolean
    private hHide: number
    private prevTime: number
    private readonly hideDuration: number = 1500
    private readonly lazyDuration: number = 200
    private thumbTop: number = 0
    private end: boolean = false
    private unmount: boolean = false

    @autobind
    private onMouseDown(e: MouseEvent<HTMLDivElement>) {
        e.preventDefault()
        if (this.props.autoHideThumb) {
            window.clearTimeout(this.hHide)
            this.hHide = null
        }
        this.prevMouse = { x: e.clientX, y: e.clientY }
    }

    @autobind
    private onMouseUp(e: MouseEvent<HTMLDivElement>) {
        if (this.props.autoHideThumb) {
            this.hHide = window.setTimeout((() => {
                if (this.hHide) {
                    this.setState((prev, props) => {
                        return {...prev, thumbHide: true}
                    })
                }
            }), this.hideDuration)
        }
        this.prevMouse = null
    }

    @autobind
    private onMouseMove(e: MouseEvent<HTMLDivElement>) {
        if (this.prevMouse) {
            const dy = e.clientY - this.prevMouse.y
            this.prevMouse = { x: e.clientX, y: e.clientY }
            const ratio = (this.RefScrollConent.scrollHeight - this.RefScrollView.clientHeight) / (this.RefScrollView.clientHeight - this.RefThumb.clientHeight)
            const top = this.RefScrollConent.scrollTop
            const ch = this.RefScrollConent.scrollHeight
            const vh = this.RefScrollView.clientHeight
            this.RefScrollConent.scrollTop = (top + vh + dy * ratio) < ch ? top + dy * ratio : ch - vh
        }
    }

    @autobind
    private onScroll(e: UIEvent<HTMLDivElement>) {
        if (!this.lock) {
            window.requestAnimationFrame(this.onUpdate)
            this.lock = true
        }
    }

    @autobind
    private onUpdate() {
        if (this.props.autoHideThumb && this.prevMouse === null) {
            window.clearTimeout(this.hHide)
            this.hHide = null
            this.hHide = window.setTimeout((() => {
                if (this.hHide) {
                    this.setState((prev, prop) => {
                        return {...prev, thumbHide: true}
                    })
                }
            }), 1500)
        }

        this.renderThumb()
        this.lock = false
    }

    private renderThumb() {
        const top = this.RefScrollConent.scrollTop
        const vh = this.RefScrollView.clientHeight
        const ch = this.RefScrollConent.scrollHeight
        const total = ch - vh
        const th = this.RefThumb.clientHeight
        if (total > 0) {
            this.thumbTop = (vh - th) * (top / total) / vh
            const str = (this.thumbTop * 100).toPrecision(4) + "%"
            this.setState((prev, props) => {
                return {...prev, thumbHide: false, thumbStyle: {top: str, height: props.thumbHeight}}
            })
        }
    }

    private testNeedMore(): boolean {
        if ((Date.now() - this.prevTime) < this.lazyDuration) {
            return false
        }
        this.prevTime = Date.now()
        const ch = this.props.itemHeight * this.items.length
        const vh = this.RefScrollView.clientHeight
        if (vh > ch) {
            return true
        } else {
            const top = this.RefScrollConent.scrollTop
            const ih = this.props.itemHeight
            return (top + vh + 3 * ih) > this.RefScrollConent.scrollHeight
        }
    }

    private async getMoreItem(): Promise<JSX.Element[]> {
        const result = await this.props.getMore()
        if (result.length === 0) {
            this.end = true
        }
        return result
    }

    constructor(props: ComponentProps) {
        super(props)
        this.state = {
            thumbHide: props.autoHideThumb,
            thumbStyle: {
                height: "18%",
                top: "0",
            },
        }
        this.init()
    }

    private init() {
        this.items = []
        this.lock = false
        this.prevMouse = null
        this.hHide = null
        this.end = false
        this.items = []
    }

    public async componentDidMount() {
        document.addEventListener("mousemove", this.onMouseMove as any)
        document.addEventListener("mouseup", this.onMouseUp as any)
        this.prevTime = 0
        if (this.testNeedMore()) {
            this.items = await this.getMoreItem()
            if (!this.unmount) {
                this.onUpdate()
            }
        }
    }

    public async componentDidUpdate() {
        if (!this.end && !this.unmount && this.testNeedMore()) {
            const items = await this.getMoreItem()
            this.items.push(...items)
            if (!this.unmount) {
                this.forceUpdate()
                this.renderThumb()
            }
        }
    }

    public componentWillUnmount() {
        this.unmount = true
        clearTimeout(this.hHide)
        this.init()
        document.removeEventListener("mousemove", this.onMouseMove as any)
        document.removeEventListener("mouseup", this.onMouseUp as any)
    }

    private renderContent(): JSX.Element[] | JSX.Element {

        if (this.items.length === 0) {
            if (!this.end) {
                return (
                    <div style={{ position: "absolute", width: "100%", height: "100%", background: "#000000" }}>
                        <Spin tip="載入中..." style={{position: "absolute", width: "100%", top: "50%"}} />
                    </div>)
            } else {
                return (
                    <div style={{ position: "absolute", width: "100%", height: "100%", background: "#000000" }}>
                        <span style={{position: "absolute", width: "100%", top: "50%", display: "flex", justifyContent: "center", color: "#FFFFFF" }}>空空如也</span>
                    </div>)
            }
        }

        let top = this.RefScrollConent.scrollTop
        const vh = this.RefScrollView.clientHeight
        const ih = this.props.itemHeight
        const ch = ih * this.items.length
        top = (top + vh) > ch ? ch - vh : top
        const i = Math.floor(top / ih)
        const j = Math.ceil((top + vh) / ih) + 1
        const contents = this.items.slice(i, j)

        const result: JSX.Element[] = []

        if (i > 0) {
            result.push(<div style={{width: "100%", height: i * ih + "px"}} key={Number.MIN_SAFE_INTEGER}/>)
        }

        result.push(...contents)

        const k = this.items.length - j + 1
        if (k !== 0) {
            result.push(<div style={{width: "100%", height: k * ih + "px", background: "#000000"}} key={Number.MAX_SAFE_INTEGER} />)
        }

        if (!this.end) {
            result.push(<Spin key={0} style={{width: "100%", height: ih + "px", background: "#000000"}} />)
        }

        return result
    }

    public render() {
        return (
            <div
                ref={e => this.RefScrollView = e}
                className={style.scrollView + (this.props.className ? " " + this.props.className : "")}
                style={this.props.style}
            >
                <div className={style.track}>
                    <div
                        ref={e => this.RefThumb = e}
                        className={style.thumb + (this.state.thumbHide ? " " + style.hide : "")}
                        style={this.state.thumbStyle}
                        onMouseDown={this.onMouseDown}
                    />
                </div>
                <div
                    ref={e => this.RefScrollConent = e}
                    className={style.content}
                    onScroll={this.onScroll}
                >
                    {this.renderContent()}
                </div>
            </div>
        )
    }
}
