import React, { Component, ChangeEvent } from "react"
import { Redirect } from "react-router-dom"
import autobind from "autobind-decorator"
import { Button, Icon, Input, Row, Col, Layout, Form, notification } from "antd"
import * as style from "./LoginPage.scss"
import { PromiseIpcRenderer, User, PTTState, StateString, ApiRoute } from "model"
import { GraphQLError } from "graphql"

interface ComponentProps {

}

interface ComponentState {
    warning: boolean
    logined: boolean
    username: string
    password: string
    loading: boolean
}

interface GraphQLQuery {
    login: string
}

interface LoginResult {
    data?: GraphQLQuery
    errors?: GraphQLError
}

export class LoginPage extends Component<ComponentProps, ComponentState> {

    private userNameInput: Input

    @autobind
    private onChangeUserName(e: ChangeEvent<HTMLInputElement>) {
        this.setState({...this.state, username: e.target.value})
    }

    @autobind
    private onChangePassword(e: ChangeEvent<HTMLInputElement>) {
        this.setState({...this.state, password: e.target.value})
    }

    @autobind
    private loadUser(u: User) {
        this.setState((prev, _) => ({...prev, username: u.username, password: u.password}))
    }

    public componentDidMount() {
        PromiseIpcRenderer.send<User>(ApiRoute.loadUserInfo)
        .then(u => {
            if (u && u.username && u.password) {
                this.loadUser(u)
            }
        })
    }

    constructor(prop: ComponentProps) {
        super(prop)
        this.state = {
            logined: false,
            loading: false,
            username: "",
            password: "",
            warning: false,
        }
    }

    @autobind
    private emitEmpty() {
        this.userNameInput.focus()
        this.setState({...this.state, username: "" })
    }

    @autobind
    private handleSubmit(e: React.FormEvent<HTMLElement>) {
        e.preventDefault()
        const user = {
            username: this.state.username,
            password: this.state.password,
        }

        const gql = `
        # query {
        #    me { username }
        # }
        mutation LoginMutation($user: User!) {
            login(user: $user)
        }
        `
        const args = {
            user,
        }
        PromiseIpcRenderer.send<LoginResult>(ApiRoute.GraphQL, gql, args)
        .then(result => {
            if (result.errors) {
                console.error(result.errors)
                return
            }
            const s = result.data.login
            if (s === "Ok") {
                this.setState((prev, _) => ({...prev, loading: false, logined: true}))
            } else {
                this.setState((prev, _) => ({...prev, loading: false, logined: false}))
                switch (s) {
                case "WebSocketFailed":
                    notification.config({placement: "topRight"})
                    setTimeout(() => {
                        notification.error({message: "", description: "WebSocket連線失敗"})
                    }, 10)
                    break
                case "Overloading":
                    notification.config({placement: "topRight"})
                    setTimeout(() => {
                        notification.warn({message: "", description: "系統過載..."})
                    }, 10)
                    break
                case "HeavyLogin":
                    notification.config({placement: "topRight"})
                    setTimeout(() => {
                        notification.warn({message: "", description: "登入太多次了"})
                    }, 10)
                    break
                default:
                    notification.config({placement: "topRight"})
                    setTimeout(() => {
                        notification.error({message: "", description: "Where"})
                    }, 10)
                    break
                }
            }
        })

        // PromiseIpcRenderer.send<PTTState>(ApiRoute.login, user)
        // .then((s: PTTState) => {
        //     if (s === PTTState.MainPage) {
        //         this.setState((prev, _) => ({...prev, loading: false, logined: true}))
        //     } else {
        //         this.setState((prev, _) => ({...prev, loading: false, logined: false}))
        //         switch (s) {
        //         case PTTState.WebSocketFailed:
        //             notification.config({placement: "topRight"})
        //             setTimeout(() => {
        //                 notification.error({message: "", description: "連線失敗"})
        //             }, 10)
        //             break
        //         case PTTState.Overloading:
        //             notification.config({placement: "topRight"})
        //             setTimeout(() => {
        //                 notification.warn({message: "", description: "系統過載..."})
        //             }, 10)
        //             break
        //         case PTTState.HeavyLogin:
        //             notification.config({placement: "topRight"})
        //             setTimeout(() => {
        //                 notification.warn({message: "", description: "登入太多次了"})
        //             }, 10)
        //             break
        //         default:
        //             notification.config({placement: "topRight"})
        //             setTimeout(() => {
        //                 notification.error({message: "", description: StateString(s)})
        //             }, 10)
        //             break
        //         }
        //     }
        // })
        this.setState((prev, _) => ({...prev, loading: true}))
    }

    public render() {
        if (this.state.logined) {
            return <Redirect to="/Main" />
        }

        const { username, password } = this.state
        // const suffix = username ? <Icon type="close-circle" onClick={this.emitEmpty} /> : null

        const form = (
        <Form onSubmit={this.handleSubmit}>
            <Form.Item>
                <Input
                    ref={(node: Input) => this.userNameInput = node}
                    placeholder={"請輸入帳號"}
                    prefix={<Icon type="user" style={{ color: "rgba(0,0,0,.25)" }} />}
                    // suffix={suffix}
                    value={username}
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
                    onChange={this.onChangePassword}
                    className={style.input}
                />
            </Form.Item>
            <Form.Item>
                <Button type="primary" htmlType={"submit"} block loading={this.state.loading}>{"登入"}</Button>
            </Form.Item>
        </Form>
        )

        return (
        <Layout className={style.loginpage}>
            <Layout.Content>
                <Row style={{height: "100vh"}} type="flex" justify="center" align="middle">
                    <Col xs={{ span: 6 }}  sm={{span: 7}}  md={{span: 8}} lg={{ span: 9.5 }} />
                    <Col xs={{ span: 12 }} sm={{span: 10}} md={{span: 8}} lg={{ span: 5 }}>{form}</Col>
                    <Col xs={{ span: 6 }}  sm={{span: 7}}  md={{span: 8}} lg={{ span: 9.5 }} />
                </Row>
            </Layout.Content>
        </Layout>
        )
    }
}
