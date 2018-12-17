import React, { Component } from "react"
import { Button } from "antd"
import QueueAnim from "rc-queue-anim"

interface ComponentProps {}

interface ComponentState {
    show: boolean
}

export class AnimePage extends Component<ComponentProps, ComponentState> {
    constructor(props: ComponentProps) {
        super(props)
        this.state = { show: false }
    }

    private onClick = () => {
        this.setState({ show: !this.state.show })
    }

    public render() {
        return (
            <div className="queue-demo">
                <p className="buttons">
                    <Button type="primary" onClick={this.onClick}>
                        切换
                    </Button>
                </p>
                <QueueAnim>
                    {this.state.show
                        ? [
                              <div className="demo-thead" key="a">
                                  <ul>
                                      <li />
                                      <li />
                                      <li />
                                  </ul>
                              </div>,
                              <div className="demo-tbody" key="b">
                                  <ul>
                                      <li />
                                      <li />
                                      <li />
                                  </ul>
                              </div>,
                          ]
                        : null}
                </QueueAnim>
            </div>
        )
    }
}
