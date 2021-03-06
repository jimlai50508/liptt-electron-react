import React, { Component, ChangeEvent } from "react"
import { Redirect } from "react-router-dom"
import { Button, Icon, Input, Row, Col, Layout, Form, notification } from "antd"
import * as style from "./LoginPage.scss"
import { PromiseIpcRenderer, User, PTTState, StateString, ApiRoute } from "model"
import { GraphQLError } from "graphql"
import { inject, observer } from "mobx-react"
import AppStore, { IUserStore } from "stores"

interface IProps extends IUserStore {}

interface IState {
    warning: boolean
    lock: boolean
    username: string
    password: string
}

interface GraphQLQuery {
    login: string
}

interface LoginResult {
    data?: GraphQLQuery
    errors?: GraphQLError
}

@inject(AppStore.User)
@observer
export class LoginPage extends Component<IProps, IState> {
    private userNameInput: Input

    private onChangeUserName = (e: ChangeEvent<HTMLInputElement>) => {
        this.setState({ ...this.state, username: e.target.value })
    }

    private onChangePassword = (e: ChangeEvent<HTMLInputElement>) => {
        this.setState({ ...this.state, password: e.target.value })
    }

    private loadUser = (u: User) => {
        this.setState((prev, _) => ({ ...prev, username: u.username, password: u.password }))
    }

    public componentDidMount() {
        PromiseIpcRenderer.send<User>(ApiRoute.loadUserInfo).then(u => {
            if (u && u.username && u.password) {
                this.loadUser(u)
            }
        })
    }

    constructor(prop: IProps) {
        super(prop)
        this.state = {
            lock: false,
            username: "",
            password: "",
            warning: false,
        }
    }

    private emitEmpty = () => {
        this.userNameInput.focus()
        this.setState({ ...this.state, username: "" })
    }

    private handleSubmit = (e: React.FormEvent<HTMLElement>) => {
        e.preventDefault()
        if (this.props.user.logging) {
            return
        }
        if (this.state.lock) {
            return
        }
        this.props.user.login(this.state.username, this.state.password)

        // const user = {
        //     username: this.state.username,
        //     password: this.state.password,
        // }

        // const gql = `
        // # query {
        // #    me { username }
        // # }
        // mutation LoginMutation($user: UserInput!) {
        //     login(user: $user)
        // }
        // `
        // const args = {
        //     user,
        // }
        // PromiseIpcRenderer.send<LoginResult>(ApiRoute.GraphQL, gql, args).then(result => {
        //     if (result.errors) {
        //         console.error(result.errors)
        //         return
        //     }
        //     const s = result.data.login
        //     if (s === "Ok") {
        //         this.setState((prev, _) => ({ ...prev, loading: false, logined: true }))
        //     } else {
        //         this.setState((prev, _) => ({ ...prev, loading: false, logined: false }))
        //         switch (s) {
        //             case "WebSocketFailed":
        //                 notification.config({ placement: "topRight" })
        //                 setTimeout(() => {
        //                     notification.error({ message: "", description: "WebSocket連線失敗" })
        //                 }, 10)
        //                 break
        //             case "WrongPassword":
        //                 notification.config({ placement: "topRight" })
        //                 setTimeout(() => {
        //                     notification.error({ message: "", description: "密碼錯誤嗎？" })
        //                 }, 10)
        //                 break
        //             case "Overloading":
        //                 notification.config({ placement: "topRight" })
        //                 setTimeout(() => {
        //                     notification.warn({ message: "", description: "系統過載..." })
        //                 }, 10)
        //                 break
        //             case "HeavyLogin":
        //                 notification.config({ placement: "topRight" })
        //                 this.setState((prev, props) => ({ lock: true }))
        //                 setTimeout(() => {
        //                     this.setState((prev, props) => ({ lock: false }))
        //                 }, 3000)
        //                 setTimeout(() => {
        //                     notification.warn({ message: "", description: "登入太頻繁" })
        //                 }, 10)
        //                 break
        //             default:
        //                 notification.config({ placement: "topRight" })
        //                 setTimeout(() => {
        //                     notification.error({ message: "", description: "Where" })
        //                 }, 10)
        //                 break
        //         }
        //     }
        // })
    }

    public render() {
        if (this.props.user.logined) {
            return <Redirect to="/Main" />
        }

        const { username, password } = this.state
        // const suffix = username ? <Icon type="close-circle" onClick={this.emitEmpty} /> : null

        const form = (
            <Form onSubmit={this.handleSubmit}>
                <Form.Item>
                    <Input
                        ref={(node: Input) => (this.userNameInput = node)}
                        placeholder={"請輸入帳號"}
                        prefix={<Icon type="user" style={{ color: "rgba(0,0,0,.25)" }} />}
                        // suffix={suffix}
                        value={username}
                        size="large"
                        onChange={this.onChangeUserName}
                        className={style.input}
                    />
                </Form.Item>
                <Form.Item>
                    <Input
                        placeholder={"請輸入密碼"}
                        prefix={<Icon type="lock" style={{ color: "rgba(0,0,0,.25)" }} />}
                        type="password"
                        value={password}
                        size="large"
                        onChange={this.onChangePassword}
                        className={style.input}
                    />
                </Form.Item>
                <Form.Item>
                    <Button
                        type="primary"
                        htmlType={"submit"}
                        block
                        size="large"
                        disabled={this.state.lock}
                        loading={this.props.user.logging}
                    >
                        {"登入"}
                    </Button>
                </Form.Item>
            </Form>
        )

        return (
            <Layout className={style.loginpage}>
                <Layout.Content>
                    <Row style={{ height: "100vh" }} type="flex" justify="center" align="middle">
                        <Col xs={{ span: 6 }} sm={{ span: 7 }} md={{ span: 8 }} lg={{ span: 9.5 }} />
                        <Col xs={{ span: 12 }} sm={{ span: 10 }} md={{ span: 8 }} lg={{ span: 5 }}>
                            {form}
                        </Col>
                        <Col xs={{ span: 6 }} sm={{ span: 7 }} md={{ span: 8 }} lg={{ span: 9.5 }} />
                    </Row>
                </Layout.Content>
            </Layout>
        )
    }
}
