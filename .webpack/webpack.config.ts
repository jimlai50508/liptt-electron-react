import { Configuration, Entry, DllReferencePlugin } from "webpack"
import * as path from "path"
import { TsConfigPathsPlugin } from "awesome-typescript-loader"
import * as EventHooksPlugin from "event-hooks-webpack-plugin"
import * as shell from "shelljs"
import TsImportPlugin = require("ts-import-plugin")
import * as HtmlWebpackPlugin from "html-webpack-plugin"
import * as MiniCssExtractPlugin from "mini-css-extract-plugin"
const WebpackBar = require("webpackbar")
const packageJSON = require("../package.json")
// var nodeExternals = require('webpack-node-externals')
const entry: Entry = {
    index: "./renderer/index.tsx",
}

const titles = {
    index: packageJSON.name,
}

const distPath = path.resolve(__dirname, "../dist/renderer")
const vendor = path.resolve(__dirname, "../dist/renderer/vendor")
const rendererPath = path.resolve(__dirname, "../renderer")

const conf: Configuration = {
    entry,
    output: {
        path: distPath,
        filename: "[name].[hash].js",
        publicPath: "./",
    },
    target: "electron-renderer",
    resolveLoader: {
        modules: ["node_modules", "./.webpack/loaders"],
    },
    module: {
        rules: [
            {
                test: /\.ts(x?)$/,
                loader: "awesome-typescript-loader",
                options: {
                    configFileName: "tsconfig.json",
                    silent: true,
                    getCustomTransformers: () => ({
                        before: [
                            TsImportPlugin([
                                {
                                    libraryName: "antd",
                                    libraryDirectory: "lib",
                                    style: true,
                                },
                                {
                                    libraryName: "material-ui",
                                    libraryDirectory: "",
                                    camel2DashComponentName: false,
                                },
                            ]),
                        ],
                    }),
                },
                exclude: /node_modules/,
            },
            {
                test: /\.(png|jp(e?)g|gif|svg)$/,
                use: [{ loader: "file-loader", options: { name: "assets/images/[name].[ext]" } }],
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)(\?.*)?$/,
                use: [
                    { loader: "file-loader", options: { name: "assets/fonts/[name].[ext]?[hash]" } },
                    { loader: "url-loader", query: { name: "assets/fonts/[name].[ext]" } },
                ],
            },
            {
                test: /\.css$/,
                use: [
                    process.env.NODE_ENV !== "production" ? "style-loader" : MiniCssExtractPlugin.loader,
                    { loader: "css-loader" },
                ],
            },
            {
                test: /\.less$/,
                use: [
                    process.env.NODE_ENV !== "production" ? "style-loader" : MiniCssExtractPlugin.loader,
                    { loader: "css-loader" },
                    // { loader: "typings-for-css-modules-loader",
                    //   options: {
                    //         modules: true,
                    //         namedExport: true,
                    //         camelCase: true,
                    //         minimize: true,
                    //         importLoaders: 1,
                    //         localIdentName: "[local]-[hash]",
                    //     },
                    // },
                    {
                        loader: "less-loader",
                        options: {
                            javascriptEnabled: true,
                            modifyVars: {
                                // 改變主題色
                                // "primary-color": "#1DA57A",
                            },
                        },
                    },
                ],
            },
            {
                test: /\.s(a|c)ss$/,
                use: [
                    process.env.NODE_ENV !== "production" ? "style-loader" : MiniCssExtractPlugin.loader,
                    {
                        loader: "typings-for-css-modules-loader",
                        options: {
                            modules: true,
                            namedExport: true,
                            camelCase: true,
                            minimize: true,
                            localIdentName: "[local]-[hash:base64:6]",
                        },
                    },
                    { loader: "sass-loader" },
                ],
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"],
        plugins: [
            new TsConfigPathsPlugin({
                configFile: "tsconfig.json",
            }),
        ],
    },
    plugins: [
        new WebpackBar({ name: packageJSON.name, color: "blue" }),
        new EventHooksPlugin({
            beforeRun: () => {
                shell.rm("-rf", distPath + "/*.*")
            },
            done: () => {},
        }),
        new MiniCssExtractPlugin({
            filename: "[name].[hash].css",
            chunkFilename: "[id].[hash].css",
        }),
    ].concat(
        Object.keys(entry).map((name: string) => {
            const exclude = Object.keys(entry).slice()
            exclude.splice(Object.keys(entry).indexOf(name), 1)
            return new HtmlWebpackPlugin({
                filename: name + ".html",
                excludeChunks: exclude,
                minify:
                    process.env.NODE_ENV !== "production"
                        ? false
                        : {
                              collapseWhitespace: true,
                              minifyCSS: true,
                          },
                template: path.join("renderer", "template", name + ".ejs"),
                inject: "body",
                title: titles[name],
                development:
                    process.env.NODE_ENV !== "production" ? '<div id="this-is-for-development-node"></div>' : "",
            })
        }),
    ),
}

export default conf
