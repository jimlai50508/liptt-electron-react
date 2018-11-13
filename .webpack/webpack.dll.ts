import { Configuration, DllPlugin } from "webpack"
import * as EventHooksPlugin from "event-hooks-webpack-plugin"
import * as shell from "shelljs"
import * as path from "path"

const vendor = [
    "antd",
    "react",
    "react-dom",
    "react-router-dom",
]

const dist = path.resolve(__dirname, "../dist/renderer/vendor")

const conf: Configuration = {
    mode: "none",
    output: {
        path: dist,
        filename: "[name].[hash].js",
        library: "[name].[hash]",
    },
    entry: {
        vendor,
    },
    plugins: [
        new DllPlugin({
            path: "manifest.json",
            name: "[name].[hash]",
        }),
    ],
}

export default conf
