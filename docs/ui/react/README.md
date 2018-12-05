# React 相關


## Tips

收錄幾個React相關的Tips，基於typescript

### Arrow function
考慮以下代碼：
``` react
interface ComponentProps {  
}

interface ComponentState {
    name: string
}
class Welcome extends Component<ComponentProps, ComponentState> {
    private onHello(): string {
        return this.state.name
    }
    public render() {
        return(
            <button onClick={this.onHello.bind(this)} />
        )
    }
}
```
可以改寫成：
``` react
class Welcome extends Component<ComponentProps, ComponentState> {
    private onHello = () => {
        return this.state.name
    }
    public render() {
        return(
            <button onClick={this.onHello} />
        )
    }
}
```

### Functional component

考慮以下組件：
``` react
interface ComponentProps {
    name: string
}

class Welcome extends Component<ComponentProps> {
    public render() {
        return(
            <div>{this.props.name}</div>
        )
    }
}
```

可以改寫成：
``` react
interface ComponentProps {
    name: string
}

const Welcome: React.SFC<ComponentProps> = (props) => (
    <div>{props.children}</div>
)
```
此函數接收一個props參數，然後返回一個無狀態的react component，稱之為**functional component**。

#### 優點
* 更少的代碼
* 簡單易了解
* 測試容易
* 可以從中提取更小的component

### 狀態
React沒有保證state的改變會立即的套用，使用this.state來改變state可能會有意想不到的結果。

考慮以下代碼：
``` react
this.setState({isOpen: !this.state.isOpen})
```
把它改寫成：
``` react
this.setState((prevState, props) => ({isOpen: !prevState.isOpen}))
```