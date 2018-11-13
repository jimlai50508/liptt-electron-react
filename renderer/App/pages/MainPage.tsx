import React, { Component, MouseEvent } from "react"
import { Redirect, Switch, Route, Link } from "react-router-dom"
import autobind from "autobind-decorator"
import { Icon } from "antd"
import { version as antdVersion } from "antd"
import { Layout, Menu, Button, Row, Col, notification } from "antd"
import { ClickParam } from "antd/lib/menu"
import { ipcRenderer } from "electron"

import style from "./MainPage.scss"
import { Favorite } from "./Favorite"

import { Test } from "./Test"
import { LegacyTerminal } from "./LegacyTerminal"

interface ComponentProps {

}

interface ComponentState {
    logout: boolean
    activeMenu: string
    collapsed: boolean
}

export class MainPage extends Component<ComponentProps, ComponentState> {

    @autobind
    private onCollapse(collapsed: boolean) {
        this.setState({...this.state, collapsed})
    }

    @autobind
    private onMenuClick(param: ClickParam) {
        if (param.key !== this.state.activeMenu) {
            this.setState({...this.state, activeMenu: param.key})
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
        }
    }

    private renderContent(): JSX.Element {
        switch (this.state.activeMenu) {
            case "Favorite":
                return <Favorite/>
            case "Test":
                return <Test />
            case "Home":
                return <LegacyTerminal />
            default:
            return <Favorite/>
        }
    }

    public componentDidMount() {
        // notification.config({placement: "bottomRight"})
        // setTimeout(() => {
        //     notification.info({message: "hello world", description: "hello hello world world"})
        // }, 100)
    }

    public render() {
        if (this.state.logout) {
            return <Redirect to="/" />
        }

        return (
            <Layout className={style.main}>
                <Layout.Sider collapsed={this.state.collapsed} onCollapse={this.onCollapse} collapsible>
                    <Menu theme="dark" mode="inline" onClick={this.onMenuClick}>
                        <Menu.Item key="Favorite">
                            <Icon type="star" />
                            <span>我的最愛</span>
                        </Menu.Item>
                        <Menu.Item key="Home">
                            <Icon type="home" />
                            <span>快照</span>
                        </Menu.Item>
                        <Menu.Item key="Test" >
                            <Icon type="qrcode" />
                            <span>測試頁</span>
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
                    <Layout.Content className={style.container}>{this.renderContent()}</Layout.Content>
                    {/* <Layout.Footer className={style.footer}>
                        Created by lightyen <span>React:{React.version} Ant-design:{antdVersion}</span>
                    </Layout.Footer> */}
                </Layout>
            </Layout>
        )
    }
}
