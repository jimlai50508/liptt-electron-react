import { Configuration, Entry, DllReferencePlugin } from "webpack"
import * as path from "path"
import { TsConfigPathsPlugin } from "awesome-typescript-loader"
import * as EventHooksPlugin from "event-hooks-webpack-plugin"
import * as shell from "shelljs"
import TsImportPlugin = require("ts-import-plugin")
import * as HtmlWebpackPlugin from "html-webpack-plugin"
import * as MiniCssExtractPlugin from "mini-css-extract-plugin"
// var nodeExternals = require('webpack-node-externals')
const entry: Entry = {
    index:  "./renderer/index.tsx",
}

const titles = {
    index: "LiPTT",
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
        modules: [
            "node_modules",
            "./.webpack/loaders",
        ],
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
                        before: [TsImportPlugin([
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
                          ])],
                    }),
                    // useBabel: false,
                    // babelOptions: {
                    //     babelrc: false, /* Important line */
                    //     presets: [
                    //         ["@babel/preset-env", { "targets": "last 2 versions, ie 11", "modules": false }]
                    //     ]
                    // },
                    // "babelCore": "@babel/core",
                },
                exclude: /node_modules/,
                // include: [path.resolve(__dirname, "../renderer")],
            },
            {
                test: /\.(graphql|gql)$/,
                exclude: /node_modules/,
                use: [
                    { loader: "typings-graphql-loader" },
                    { loader: "graphql-tag/loader" },
                ],
            },
            {
                test: /\.(png|jp(e?)g|gif|svg)$/,
                use: [
                    { loader: "file-loader", options: { name: "assets/images/[name].[ext]" }},
                ],
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)(\?.*)?$/,
                use : [
                    { loader: "file-loader", options: {name: "assets/fonts/[name].[ext]?[hash]"} },
                    { loader: "url-loader",  query:   {name: "assets/fonts/[name].[ext]"} },
                ],
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    { loader: "css-loader"},
                ],
            },
            {
                test: /\.less$/,
                use: [
                    MiniCssExtractPlugin.loader,
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
                    { loader: "less-loader", options: { javascriptEnabled: true, modifyVars: {
                        // 改變主題色
                        // "primary-color": "#1DA57A",
                    } } },
                ],
            },
            {
                test: /\.s(a|c)ss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    { loader: "typings-for-css-modules-loader",
                      options: {
                          modules: true,
                          namedExport: true,
                          camelCase: true,
                          minimize: true,
                          localIdentName: "[local]-[hash]",
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
        new EventHooksPlugin({
            beforeRun: () => {
                shell.rm("-rf", distPath + "/*.*")
            },
            done: () => {
            },
        }),
        new MiniCssExtractPlugin({
            filename: "[name].[hash].css",
            chunkFilename: "[id].[hash].css",
        }),
        // new DllReferencePlugin({
        //     context: vendor,
        //     manifest: require(path.resolve(__dirname, "../manifest.json")),
        // }),
    ].concat(Object.keys(entry).map((name: string) => {
        const exclude = Object.keys(entry).slice()
        exclude.splice(Object.keys(entry).indexOf(name), 1)
        return new HtmlWebpackPlugin({
            filename: name + ".html",
            excludeChunks: exclude,
            template: path.join("renderer", "public", name + ".ejs"),
            inject: "body",
            // favicon: path.join("renderer", "assets", "images", "favicon.ico"),
            title: titles[name],
        })
    })),
}

export default conf
