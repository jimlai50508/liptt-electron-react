import React from "react"
import { ScrollView } from "../../components/ScrollView/ScrollView"

interface InfiniteProps {
    loading: boolean
}

const infinite = <P extends object>(Component: React.ComponentType<P>) =>
class Infinite extends React.Component<P & InfiniteProps> {
    public render() {
    const { loading, ...props } = this.props as InfiniteProps
    return <Component {...props} />
    }
}

const V = infinite(ScrollView)
