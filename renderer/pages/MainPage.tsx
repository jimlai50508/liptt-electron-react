import React, { Component, MouseEvent } from "react"
import { Redirect } from "react-router-dom"
import { Icon } from "antd"
import { version as antdVersion } from "antd"
import { Layout, Menu, Button, Row, Col, notification } from "antd"
import { ClickParam } from "antd/lib/menu"
import { PromiseIpcRenderer, ApiRoute, SocketState } from "model"
import style from "./MainPage.scss"
import { Hot } from "./Hot"
import { Favorite } from "./Favorite"

import { Test } from "./Test"
import { LegacyTerminal } from "./LegacyTerminal"
import { AnimePage } from "./AnimePage"
import { CSSPage } from "./CSSPage"
import { MailPage } from "./MailPage"

import { reaction, when, IReactionDisposer } from "mobx"
import { observer, inject } from "mobx-react"
import AppStore, { IUserStore } from "stores"

interface ComponentProps extends IUserStore {}

interface ComponentState {
    logout: boolean
    activeMenu: string
    collapsed: boolean
}

@inject(AppStore.User)
@observer
export class MainPage extends Component<ComponentProps, ComponentState> {
    private reactionDisposer: IReactionDisposer
    private isLogout: boolean

    private onCollapse = (collapsed: boolean) => {
        this.setState({ ...this.state, collapsed })
    }

    private onMenuClick = (param: ClickParam) => {
        if (param.key !== this.state.activeMenu) {
            setTimeout(() => {
                this.setState((prev, _) => ({ ...prev, activeMenu: param.key }))
            }, 16)
        }
    }

    private onLogout = (e: MouseEvent<HTMLElement>) => {
        this.isLogout = false
        this.props.user.logout()
        // const gql = `mutation { logout }`
        // PromiseIpcRenderer.send(ApiRoute.GraphQL, gql).then(result => {
        //     this.setState((prev, _) => ({ ...prev, logout: true }))
        // })

        // PromiseIpcRenderer.send(ApiRoute.logout)
        // this.setState((prev, _) => ({...prev, logout: true}))
    }

    constructor(props: ComponentProps) {
        super(props)
        this.state = {
            logout: false,
            activeMenu: "",
            collapsed: false,
        }
        this.isLogout = true
    }

    private renderContent(): JSX.Element {
        switch (this.state.activeMenu) {
            case "Hot":
                return <Hot />
            case "Favorite":
                return <Favorite />
            case "Test":
                return <Test />
            case "Mail":
                return <MailPage />
            case "Snapshot":
                return <LegacyTerminal />
            case "Anime":
                return <AnimePage />
            case "CSS":
                return <CSSPage />
            default:
                return <Hot />
        }
    }

    public componentDidMount() {
        this.reactionDisposer = reaction(
            () => this.props.user.socketState,
            state => {
                if (state === SocketState.Closed) {
                    if (this.isLogout) {
                        notification.config({ placement: "bottomRight" })
                        notification.error({
                            message: "liptt 通知",
                            description: "連線已斷開",
                        })
                        this.setState((prev, _) => ({ ...prev, logout: true }))
                    }
                }
            },
        )
        // this.reactionDisposer = when(
        //     () => this.props.socket.socketState === SocketState.Closed,
        //     () => {
        //         notification.config({placement: "bottomRight"})
        //         notification.error({
        //             message: "liptt 通知",
        //             description: "連線已斷開",
        //         })
        //         setTimeout(() => {
        //             this.setState((prev, _) => ({...prev, logout: true}))
        //         }, 100)
        //     },
        // )

        setImmediate(async () => {
            const hasEmail = await PromiseIpcRenderer.send<boolean>(ApiRoute.checkMail)
            if (hasEmail) {
                notification.config({ placement: "bottomRight" })
                window.setTimeout(() => {
                    notification.open({
                        message: "liptt 通知",
                        description: "你有新的信件喔!",
                        icon: <Icon type="mail" style={{ color: "#108ee9" }} />,
                    })
                }, 100)
            }
        })
    }

    public componentWillUnmount() {
        if (this.reactionDisposer) {
            this.reactionDisposer()
        }
    }

    public render() {
        if (!this.props.user.logined) {
            return <Redirect to="/" />
        }

        return (
            <Layout className={style.main}>
                <Layout.Sider collapsed={this.state.collapsed} onCollapse={this.onCollapse} collapsible>
                    <Menu theme="dark" mode="inline" onClick={this.onMenuClick}>
                        <Menu.Item key="Hot">
                            <Icon type="fire" />
                            <span>熱門看板</span>
                        </Menu.Item>
                        <Menu.Item key="Favorite">
                            <Icon type="star" />
                            <span>我的最愛</span>
                        </Menu.Item>
                        <Menu.Item key="Mail">
                            <Icon type="mail" />
                            <span>郵件信箱</span>
                        </Menu.Item>
                        <Menu.Item key="Test">
                            <Icon type="profile" />
                            <span>測試頁</span>
                        </Menu.Item>
                        <Menu.Item key="Snapshot">
                            <Icon type="border" />
                            <span>快照</span>
                        </Menu.Item>
                        <Menu.Item key="Anime">
                            <Icon type="border" />
                            <span>動畫測試</span>
                        </Menu.Item>
                        <Menu.Item key="CSS">
                            <Icon type="border" />
                            <span>CSS</span>
                        </Menu.Item>
                        <Menu.SubMenu
                            key="sub1"
                            title={
                                <span>
                                    <Icon type="user" />
                                    <span>User</span>
                                </span>
                            }
                        >
                            <Menu.Item key="3">Tom</Menu.Item>
                            <Menu.Item key="4">Bill</Menu.Item>
                            <Menu.Item key="Alex">Alex</Menu.Item>
                        </Menu.SubMenu>
                    </Menu>
                </Layout.Sider>
                <Layout>
                    <Layout.Header>
                        <Row type="flex" justify="end" align="middle">
                            <Col span={4}>
                                <Button onClick={this.onLogout}>
                                    <Icon type="logout" />
                                </Button>
                            </Col>
                        </Row>
                    </Layout.Header>
                    <Layout.Content className={style.container}>{this.renderContent()}</Layout.Content>
                    {/* <Layout.Footer className={style.footer}>
                        Created by lightyen <span>React:{React.version} Ant-design:{antdVersion}</span>
                    </Layout.Footer> */}
                </Layout>
            </Layout>
        )
    }
}
