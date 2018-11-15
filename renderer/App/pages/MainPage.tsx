import React, { Component, MouseEvent } from "react"
import { Redirect, Switch, Route, Link } from "react-router-dom"
import autobind from "autobind-decorator"
import { Icon } from "antd"
import { version as antdVersion } from "antd"
import { Layout, Menu, Button, Row, Col, notification } from "antd"
import { ClickParam } from "antd/lib/menu"
import { ipcRenderer } from "electron"
import { PromiseIpcRenderer } from "model"
import style from "./MainPage.scss"
import { Hot } from "./Hot"
import { Favorite } from "./Favorite"

import { Test } from "./Test"
import { LegacyTerminal } from "./LegacyTerminal"
// import QueueAnim from "rc-queue-anim"

interface ComponentProps {

}

interface ComponentState {
    logout: boolean
    activeMenu: string
    collapsed: boolean
    show: boolean
}

export class MainPage extends Component<ComponentProps, ComponentState> {

    @autobind
    private onCollapse(collapsed: boolean) {
        this.setState({...this.state, collapsed})
    }

    @autobind
    private onMenuClick(param: ClickParam) {
        if (param.key !== this.state.activeMenu) {
            this.setState((prev, _) => ({...prev, show: false}))
            setTimeout(() => {
                this.setState((prev, _) => ({...prev, show: true, activeMenu: param.key}))
            }, 16)
        }
    }

    @autobind
    private onLogout(_: MouseEvent<HTMLElement>) {
        ipcRenderer.send("/logout")
        this.setState({...this.state, logout: true})
    }

    constructor(props: ComponentProps) {
        super(props)
        this.state = {
            logout: false,
            activeMenu: "",
            collapsed: false,
            show: false,
        }
    }

    private renderContent(): JSX.Element {
        switch (this.state.activeMenu) {
            case "Hot":
                return <Hot />
            case "Favorite":
                return <Favorite/>
            case "Test":
                return <Test />
            case "Snapshot":
                return <LegacyTerminal />
            default:
            return <Favorite />
        }
    }

    public componentDidMount() {
        this.setState((prev, _) => ({...prev, show: true}))

        setImmediate(async () => {
            const hasEmail = await PromiseIpcRenderer.send<boolean>("/check-email")
            if (hasEmail) {
                notification.config({placement: "bottomRight"})
                setTimeout(() => {
                    notification.open({
                        message: "liptt 通知",
                        description: "你有新的信件喔!",
                        icon: <Icon type="mail" style={{ color: "#108ee9" }} />,
                    })
                }, 100)
            }
        })
    }

    public render() {
        if (this.state.logout) {
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
                        <Menu.Item key="Test" >
                            <Icon type="profile" />
                            <span>測試頁</span>
                        </Menu.Item>
                        <Menu.Item key="Snapshot">
                            <Icon type="border" />
                            <span>快照</span>
                        </Menu.Item>
                        <Menu.SubMenu
                            key="sub1"
                            title={<span><Icon type="user" /><span>User</span></span>}
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
                                <Button onClick={this.onLogout}><Icon type="logout"/></Button>
                            </Col>
                        </Row>
                    </Layout.Header>
                    <Layout.Content className={style.container}>
                        {this.renderContent()}
                    </Layout.Content>
                    {/* <Layout.Footer className={style.footer}>
                        Created by lightyen <span>React:{React.version} Ant-design:{antdVersion}</span>
                    </Layout.Footer> */}
                </Layout>
            </Layout>
        )
    }
}
