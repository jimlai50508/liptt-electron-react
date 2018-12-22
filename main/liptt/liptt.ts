import {
    FavoriteItem,
    FavoriteItemType,
    ArticleAbstract,
    ReadState,
    ArticleType,
    ArticleHeader,
    HotItem,
    PTTState,
    StateFilter,
    SocketState,
    StateString,
    MailAbstract,
} from "../model"
import { Client, Control, Data } from "../client"
import { Terminal, Block, TerminalHeight } from "../model/terminal"
import { BoardCache } from "./boardCollection"
import { MailCache } from "./mailCollection"

type byte = number

export class LiPTT extends Client {
    /** "[]" "<>" "［］" "《》" */
    private readonly bracketReg = /[\u005b\u003c\uff3b\u300a]{1}[^\u005b\u003c\uff3b\u300a\u005d\u003e\uff3d\u300b]+[\u005d\u003e\uff3d\u300b]{1}/
    /** "()" */
    private readonly boundReg = /[\u0028]{1}[^\u0028\u0029]+[\u0029]{1}/
    private readonly titleRegex = /標題  (Re:|Fw:|)\s*(\[[^\[^\]]*\]|)\s*([\S\s]*)/
    private readonly timeRegex = /時間  ([A-Z][a-z]+) ([A-Z][a-z]+)\s*(\d+)\s*(\d+:\d+:\d+)\s*(\d+)/
    private readonly authorRegex = /作者  ([A-Za-z0-9]+) \(([\S\s^\(^\)]*)\)\s*(?:看板  )?([A-Za-z0-9\-\_]+)?/
    private readonly afootRegex = /瀏覽 第 ([\d\/]+) 頁 \(([\s\d]+)\%\)  目前顯示: 第\s*(\d+)\s*~\s*(\d+)\s*行/
    private scst: SocketState
    public curArticle: ArticleHeader
    public curArticleContent: Block[][]
    private snapshot: Terminal
    private snapshotStat: PTTState
    public username: string
    private mailCache: MailCache
    private boardCache: BoardCache
    private logined: boolean
    private newMail: boolean

    constructor() {
        super()
        this.boardCache = new BoardCache()
        this.on("Updated", this.onUpdated)
        this.on("StateUpdated", this.onStateUpdated)
        this.on("socket", this.onSocketChanged)
    }

    private onUpdated(term: Terminal) {
        const stat = StateFilter(term)
        this.snapshot = term.DeepCopy()
        this.snapshotStat = stat
        if (stat === PTTState.WhereAmI) {
            return
        }
        this.emit("StateUpdated", term, stat)
    }

    private onStateUpdated(term: Terminal, stat: PTTState) {
        this.snapshotStat = stat
        if (this.snapshotStat === PTTState.MainPage) {
            this.boardCache.clear()
            this.newMail = this.snapshot.GetSubstring(0, 30, 48).trim() === "你有新信件" ? true : false
        }

        console.log(StateString(this.snapshotStat))
        // for (let i = 0; i < 24; i++) {
        //     Debug.log(term.GetString(i))
        // }
    }

    private onSocketChanged(stat: SocketState) {
        this.scst = stat
    }

    public GetTerminalSnapshot(): string {
        return this.snapshot.GetRenderString()
    }

    /** 建立連線, 然後登入 */
    public async login(username: string, pass: string): Promise<PTTState> {
        this.logined = false
        const result = await this.connect()
        if (result !== SocketState.Connected) {
            switch (result) {
                case SocketState.Failed:
                    return PTTState.WebSocketFailed
                case SocketState.Closed:
                    return PTTState.WebSocketClosed
                case SocketState.TelnetNotSupported:
                    return PTTState.WebSocketFailed
                default:
                    return PTTState.None
            }
        }

        this.username = username

        const waitState = () =>
            new Promise<PTTState>(resolve => {
                let c = 0
                const id = setInterval(() => {
                    c++
                    switch (this.snapshotStat) {
                        case PTTState.Username:
                            clearInterval(id)
                            resolve(this.snapshotStat)
                            break
                        case PTTState.Overloading:
                            clearInterval(id)
                            resolve(this.snapshotStat)
                            break
                        default:
                            if (c > 30) {
                                clearInterval(id)
                                resolve(PTTState.Timeout)
                            } else {
                                resolve(this.snapshotStat)
                            }
                            break
                    }
                }, 100)
            })

        let s = await waitState()
        while (s !== PTTState.Username) {
            if (s === PTTState.Overloading) {
                return s
            } else if (s === PTTState.Timeout) {
                return s
            }
            s = await waitState()
        }

        return this._login(username, pass)
    }

    private async _login(user: string, pass: string): Promise<PTTState> {
        let [, stat] = await this.Send(user, 0x0d)

        if (stat !== PTTState.Password) {
            return stat
        }

        ;[, stat] = await this.Send(pass, 0x0d)

        if (stat !== PTTState.Accept) {
            return stat
        }

        this.mailCache = new MailCache()

        while (stat !== PTTState.MainPage) {
            switch (stat) {
                case PTTState.HeavyLogin:
                    // 關閉連線
                    this.close()
                    return stat
                case PTTState.Log:
                    ;[, stat] = await this.Send(Control.No()) // 刪除錯誤的登入紀錄
                    while (stat === PTTState.Log) {
                        ;[, stat] = await this.WaitForNext()
                    }
                    break
                case PTTState.AlreadyLogin:
                    ;[, stat] = await this.Send(Control.Yes()) // 刪除重複的連線
                    while (stat === PTTState.AlreadyLogin) {
                        ;[, stat] = await this.WaitForNext()
                    }
                    break
                case PTTState.UnsavedFile:
                    ;[, stat] = await this.Send("q", 0x0d) // 文章或信件尚未完成，不儲存
                    while (stat === PTTState.UnsavedFile) {
                        ;[, stat] = await this.WaitForNext()
                    }
                    break
                case PTTState.MailOverflow:
                    const regex = /您保存信件數目 (\d+) 超出上限 (\d+), 請整理/
                    const match = regex.exec(this.snapshot.GetString(23))
                    if (match) {
                        this.mailCache.size = parseInt(match[1].toString(), 10)
                        this.mailCache.maxSize = parseInt(match[2].toString(), 10)
                    }
                    ;[, stat] = await this.Send(Control.Left())
                    break
                case PTTState.MailList:
                case PTTState.Article:
                case PTTState.Favorite:
                case PTTState.Hot:
                case PTTState.AnyKey:
                    ;[, stat] = await this.Send(Control.Left())
                    break
                default:
                    ;[, stat] = await this.WaitForNext()
                    break
            }
        }
        if (stat === PTTState.MainPage) {
            this.logined = true
        }
        return stat
    }

    public get isLogin(): boolean {
        if (this.isOpen) {
            return this.logined
        }
        return false
    }

    public async logout(): Promise<void> {
        if (!this.isOpen) {
            return
        }
        let [, s] = await this.Send(Control.Left())
        while (s !== PTTState.MainPage) {
            ;[, s] = await this.Send(Control.Left())
        }
        ;[, s] = await this.Send(Control.Goodbye())
        this.logined = false
        if (s === PTTState.Quit) {
            // 最後一步
            this.send(Control.Left())
        }
        await this.WaitClose()
    }

    public async getFavorite(): Promise<FavoriteItem[]> {
        let term: Terminal = this.snapshot
        let stat: PTTState = this.snapshotStat
        while (stat !== PTTState.MainPage) {
            ;[term, stat] = await this.Send(Control.Left())
        }

        const items: FavoriteItem[] = []
        let ok = true
        ;[term, stat] = await this.Send(Control.Favorite())

        let first = term.GetSubstring(3, 0, 2).trim()
        if (first !== "●" && first !== ">") {
            ;[term, stat] = await this.Send(Control.Home())
        }

        while (stat === PTTState.Favorite && ok) {
            let i = 3
            const test = term.GetSubstring(3, 0, 2).trim()
            if (test !== "●" && test !== ">") {
                break
            }
            for (; i < 23; i++) {
                const indexStr = term.GetSubstring(i, 3, 7).trim()
                let index = Number.MAX_SAFE_INTEGER
                if (indexStr.length > 0) {
                    index = parseInt(indexStr, 10)
                    if (index <= items.length) {
                        continue
                    }
                } else {
                    ok = false
                    break
                }

                const typeStr = term.GetSubstring(i, 23, 27).trim()
                let itemType = FavoriteItemType.Board

                switch (typeStr) {
                    case "目錄":
                        itemType = FavoriteItemType.Folder
                        break
                    case "":
                        itemType = FavoriteItemType.Horizontal
                        break
                }
                if (itemType === FavoriteItemType.Horizontal) {
                    items.push({
                        key: index,
                        type: itemType,
                    })
                    continue
                }

                const name = term.GetSubstring(i, 10, 22).trim()
                const description = term.GetSubstring(i, 30, 64).trim()
                if (itemType === FavoriteItemType.Folder) {
                    items.push({
                        key: index,
                        type: itemType,
                        name,
                        description,
                    })
                    continue
                }

                const popuStr = term.GetSubstring(i, 64, 67)
                const popularity: number = this.popular(popuStr, term.GetBlock(i, 66))

                items.push({
                    key: index,
                    type: itemType,
                    name,
                    description,
                    popularity,
                })
            }

            if (ok) {
                ;[term, stat] = await this.Send(Control.PageDown())
            }
        }

        first = term.GetSubstring(3, 0, 2).trim()
        if (first !== "●" && first !== ">") {
            ;[term, stat] = await this.Send(Control.Home())
        }
        await this.Send(Control.Left())
        return items
    }

    public async getHotList(): Promise<HotItem[]> {
        let t: Terminal = this.snapshot
        let s: PTTState = this.snapshotStat
        while (s !== PTTState.MainPage) {
            ;[t, s] = await this.Send(Control.Left())
        }

        ;[t, s] = await this.Send(Control.Class())

        const items: HotItem[] = []
        let row = this.rowOfCursor(t)
        let found = t.GetString(row).includes("即時熱門看板")

        while (!found) {
            ;[t, s] = await this.Send(Control.Up())
            row = this.rowOfCursor(t)
            found = t.GetString(row).includes("即時熱門看板")
        }
        ;[t, s] = await this.Send(Control.r())
        const first = t.GetSubstring(3, 0, 2).trim()
        if (first !== "●" && first !== ">") {
            ;[t, s] = await this.Send(Control.Home())
        }

        let ok = true
        while (s === PTTState.Hot && ok) {
            let i = 3
            const test = t.GetSubstring(3, 0, 2).trim()
            if (test !== "●" && test !== ">") {
                break
            }
            for (; i < 23; i++) {
                const indexStr = t.GetSubstring(i, 3, 7).trim()
                let index = Number.MAX_SAFE_INTEGER
                if (indexStr.length > 0) {
                    index = parseInt(indexStr, 10)
                    if (index <= items.length) {
                        continue
                    }
                } else {
                    ok = false
                    break
                }

                const type = t.GetSubstring(i, 23, 27).trim()
                const name = t.GetSubstring(i, 10, 22).trim()
                const description = t.GetSubstring(i, 30, 64).trim()

                const popuStr = t.GetSubstring(i, 64, 67)
                const popularity: number = this.popular(popuStr, t.GetBlock(i, 66))

                items.push({
                    key: index,
                    type,
                    name,
                    description,
                    popularity,
                })
            }

            if (ok) {
                ;[t, s] = await this.Send(Control.PageDown())
            }
        }

        await this.Send(Control.Home())
        while (s !== PTTState.MainPage) {
            ;[t, s] = await this.Send(Control.Left())
        }
        return items
    }

    public async enterBoard(board: string): Promise<boolean> {
        if (!/[0-9A-Za-z_\-]+/.test(board)) {
            return false
        }

        let t: Terminal
        let s: PTTState = this.snapshotStat

        while (s !== PTTState.MainPage) {
            ;[t, s] = await this.Send(Control.Left())
        }

        ;[t, s] = await this.Send(Control.BoardSuggest())
        if (s === PTTState.BoardSuggest) {
            ;[t, s] = await this.Send(board, 0x0d)
        }
        if (s === PTTState.AnyKey) {
            while (s === PTTState.AnyKey) {
                ;[t, s] = await this.Send(Control.AnyKey())
            }
        } else if (s !== PTTState.Board) {
            return false
        }
        this.boardCache.clear()
        this.boardCache.name = board
        let nStr = t.GetSubstring(3, 0, 7)
        if (nStr[0] === "●" || nStr[0] === ">") {
            nStr = nStr.slice(1)
        }
        nStr = nStr.trim()
        if (nStr !== "1") {
            ;[t, s] = await this.Send(Control.Home())
        }
        return true
    }

    public async getMoreArticleAbstract(count: number): Promise<ArticleAbstract[]> {
        if (this.snapshotStat === PTTState.Article) {
            await this.Send(Control.Left())
        }

        if (this.snapshotStat !== PTTState.Board || count <= 0) {
            return []
        }

        if (count <= this.boardCache.remain) {
            return this.boardCache.getMore(count)
        }

        // 抓取看板資料
        while (this.boardCache.hasMore && count > this.boardCache.remain) {
            const [term] = this.boardCache.isEmpty ? await this.Send(Control.End()) : await this.Send(Control.PageUp())

            const ans = await this._getMoreArticleAbstract(term)
            ans.forEach(i => this.boardCache.add(i))
        }

        return this.boardCache.getMore(count)
        // if (this.curIndex === Number.MAX_SAFE_INTEGER) {
        //     await this.Send(0x30, 0x0D)
        //     const [term] = await this.Send(Control.End())
        //     const ans = await this._getMoreArticleAbstract(term)
        //     return ans
        // } else if (this.curIndex > 0) {
        //     console.log(this.curIndex)
        //     const [term] = await this.Send(this.curIndex.toString(10), 0x0D)
        //     const ans = await this._getMoreArticleAbstract(term)
        //     return ans
        // } else {
        //     return []
        // }
    }

    private async _getMoreArticleAbstract(term: Terminal): Promise<ArticleAbstract[]> {
        const result: ArticleAbstract[] = []
        for (let i = 22; i > 2; i--) {
            /// 文章編號
            let indexStr = term.GetSubstring(i, 0, 7).trim()
            let index: number = 0

            if (indexStr[0] === "●" || indexStr[0] === ">") {
                indexStr =
                    indexStr[1] === " "
                        ? (indexStr = indexStr.slice(2).trim())
                        : (term.GetSubstring(i - 1, 1, 2) + indexStr.substr(1)).trim()
            }

            if (indexStr === "★") {
                index = Number.MAX_SAFE_INTEGER
                // get AID
            } else if (indexStr !== "") {
                index = parseInt(indexStr, 10)
                // if (this.curIndex === Number.MAX_SAFE_INTEGER) {
                //     this.curIndex = index
                // } else if (index > this.curIndex) {
                //     continue
                // } else {
                //     index = this.curIndex
                // }
                // this.curIndex--
            } else {
                break
            }

            /// 推/噓
            let like: number
            const echoStr = term.GetSubstring(i, 9, 11)
            switch (echoStr[0]) {
                case "爆":
                    like = 100
                    break
                case "X":
                    like = echoStr[1] === "X" ? -100 : parseInt(echoStr[1], 10) * -10
                    break
                default:
                    like = parseInt(echoStr, 10)
                    break
            }

            /// 文章狀態
            const state: ReadState = this.getReadState(term.GetSubstring(i, 8, 9))

            /// 日期
            const dateStr = term.GetSubstring(i, 11, 16)

            /// 作者
            const author = term.GetSubstring(i, 17, 29).trim()
            let deleted: boolean = false
            if (author === "-") {
                deleted = true
            }

            /// 類型
            const typeStr = term.GetSubstring(i, 30, 32)
            let type: ArticleType
            switch (typeStr) {
                case "□":
                    type = ArticleType.一般
                    break
                case "R:":
                    type = ArticleType.回覆
                    break
                case "轉":
                    type = ArticleType.轉文
                    break
                default:
                    type = ArticleType.未定義
                    break
            }

            // 順便更新人氣指數
            const matchp = /人氣:(\d+)/.exec(term.GetSubstring(2, 66, 79).trim())
            if (matchp) {
                this.boardCache.popularity = matchp[1]
            }

            /// 標題
            let title: string = term.GetSubstring(i, 33, 80).trim()
            const match = this.bracketReg.exec(title)

            let item: ArticleAbstract = {
                key: index,
                date: dateStr,
                like,
                author,
                state,
                deleted,
                type,
                title,
                board: this.boardCache.name,
            }

            if (!deleted && match) {
                const matchStr = match.toString()
                const category = matchStr.slice(1, -1)
                title = title.slice(matchStr.length).trim()
                item = { ...item, category, title }
            }

            if (!deleted) {
                const [aid, url, coin, t] = await this.getAID(i, term)
                term = t
                item = { ...item, aid, url }
                if (coin !== "") {
                    item = { ...item, coin: parseInt(coin, 10) }
                }
            }

            result.push(item)
        }

        return result
    }

    public async getBoardArticleHeader(a: ArticleAbstract): Promise<ArticleHeader> {
        let h: ArticleHeader = {
            hasHeader: false,
            deleted: false,
        }

        let t: Terminal = this.snapshot
        let s: PTTState = this.snapshotStat

        const match = /^#[A-Za-z0-9_\-]{8}$/.exec(a.aid)
        if (!match) {
            h.deleted = true
            return h
        }

        if (s !== PTTState.Board && s !== PTTState.Article) {
            return {}
        }

        ;[t, s] = await this.goToArticle(a.aid)
        if (s === PTTState.Board) {
            ;[t, s] = await this.Send(Control.r())
        } else {
            await this.Send(Control.AnyKey())
            h.deleted = true
            return h
        }

        if (s === PTTState.Article) {
            if (t.GetString(3).startsWith("───────────────────────────────────────")) {
                h.hasHeader = true
            }
            if (h.hasHeader === true) {
                h.url = a.url
                h.coin = a.coin
                const group0 = this.authorRegex.exec(t.GetString(0))
                if (group0) {
                    const g = group0.slice(1)
                    if (g[0]) {
                        h.author = g[0].toString()
                    }
                    if (g[1]) {
                        h.nickname = g[1].toString()
                    }
                    h.board = g[2] ? g[2].toString() : a.board
                }
                const group1 = this.titleRegex.exec(t.GetString(1))
                if (group1) {
                    const g = group1.slice(1)
                    if (g[0]) {
                        if (g[0] === "Re:") {
                            h.type = ArticleType.回覆
                        } else if (g[0] === "Fw:") {
                            h.type = ArticleType.轉文
                        } else {
                            h.type = ArticleType.一般
                        }
                    }
                    if (g[1]) {
                        h.category = g[1]
                            .toString()
                            .slice(1, -1)
                            .trim()
                    }
                    if (g[2]) {
                        h.title = g[2].toString().trim()
                    }
                }
                const group2 = this.timeRegex.exec(t.GetString(2))
                if (group2) {
                    const g = group2.slice(1)
                    h.date = g.reduce((ans, cur) => ans + " " + cur)
                }
            }
            h = { ...h, aid: a.aid, url: a.url, coin: a.coin }
            await this.Send(Control.Left())
        } else {
            h.deleted = true
            console.log("getArticleHeader(): article is not exist.")
            await this.Send(Control.AnyKey())
        }
        return h
    }

    private async goToArticle(aid: string): Promise<[Terminal, PTTState]> {
        return this.Send(aid, 0x0d)
    }

    public async getMoreArticleContent(h: ArticleHeader): Promise<Block[][]> {
        if (!h.aid || !h.board) {
            this.curArticle = null
            return []
        }

        if (!/^#[A-Za-z0-9_\-]{8}$/.test(h.aid)) {
            this.curArticle = null
            return []
        }

        const reset: boolean = this.curArticle ? false : true

        if (!this.curArticle) {
            this.curArticle = { ...h }
        }

        const regex = /瀏覽 第 ([\d\/]+) 頁 \(([\s\d]+)\%\)  目前顯示: 第\s*(\d+)\s*~\s*(\d+)\s*行/
        const lines: Block[][] = []
        let t: Terminal = this.snapshot
        let s: PTTState = this.snapshotStat
        const prev = t.DeepCopy()
        let pagedown = true

        while (this.snapshotStat !== PTTState.Article || h.aid !== this.curArticle.aid) {
            pagedown = false
            if (this.snapshotStat === PTTState.MainPage) {
                if (!h.board) {
                    return []
                }
                if (!(await this.enterBoard(h.board))) {
                    return []
                }
            } else if (this.snapshotStat === PTTState.Board) {
                ;[t, s] = await this.Send(h.aid, 0x0d, 0x72)
                if (s !== PTTState.Article) {
                    this.curArticle = null
                    return []
                }
                this.curArticle = { ...h }
                this.curArticleContent = []
                break
            } else if (this.snapshotStat === PTTState.Article) {
                if (h.aid !== this.curArticle.aid) {
                    await this.Send(Control.Left())
                    await this.Send(Control.Left())
                    const ok = await this.enterBoard(h.board)
                    if (!ok) {
                        return []
                    }
                }
            }
        }

        function endTest(term: Terminal): boolean {
            const txt = term.GetString(23)
            const m = regex.exec(txt)
            if (m) {
                if (m[2] === "100") {
                    return true
                }
            }
            return false
        }

        function beginTest(term: Terminal): boolean {
            const txt = term.GetString(23)
            const m = regex.exec(txt)
            if (m) {
                if (parseInt(m[3], 10) === 1) {
                    return true
                }
            }
            return false
        }

        if (reset) {
            if (!beginTest(t)) {
                ;[t, s] = await this.Send(Control.Home())
            }
        } else if (pagedown) {
            if (endTest(t)) {
                return []
            }
            ;[t, s] = await this.Send(Control.PageDown())
        }

        const match = regex.exec(t.GetString(23))
        if (match) {
            let i = this._intersectPrev(prev, t)
            if (i === TerminalHeight) {
                const c0 = this.authorRegex.test(t.GetString(0))
                const c1 = this.titleRegex.test(t.GetString(1))
                const c2 = this.timeRegex.test(t.GetString(2))
                const c3 = t.GetString(3).startsWith("───────────────────────────────────────")
                i = c0 ? i - 1 : i
                i = c1 ? i - 1 : i
                i = c2 ? i - 1 : i
                i = c3 ? i - 1 : i
                const tmp = t.DeepCopy()
                lines.push(...tmp.Content.slice(TerminalHeight - i, TerminalHeight - 1))
                for (let k = 0; k < TerminalHeight - i; k++) {
                    this.curArticleContent.push(t.Content[k])
                }
            } else if (i > 0) {
                const prevm = regex.exec(prev.GetString(23))
                if (prevm) {
                    const pi = parseInt(prevm[3], 10)
                    const pj = parseInt(prevm[4], 10)
                    const mi = parseInt(match[3], 10)
                    const mj = parseInt(match[4], 10)
                    const predict = Math.max(mi - pi, mj - pj)
                    i = Math.max(i, predict)
                }
                const tmp = t.DeepCopy()
                lines.push(...tmp.Content.slice(TerminalHeight - i - 1, TerminalHeight - 1))
            }
            if (lines.length > 0) {
                this.curArticleContent.push(...lines)
            }
            return lines
        } else {
            return []
        }
    }

    private getReadState(s: string): ReadState {
        switch (s) {
            case "+":
                return ReadState.未讀
            case "M":
                return ReadState.已標記
            case "S":
                return ReadState.待處理
            case "m":
                return ReadState.已讀 | ReadState.已標記
            case "s":
                return ReadState.已讀 | ReadState.待處理
            case "!":
                return ReadState.鎖定
            case "~":
                return ReadState.新推文
            case "=":
                return ReadState.新推文 | ReadState.已標記
            case " ":
                return ReadState.已讀
            default:
                return ReadState.未定義
        }
    }

    /** 判斷相交的偏移量 */
    private _intersectPrev(prev: Terminal, next: Terminal): number {
        function equalLine(p: Block[], q: Block[]) {
            if (p.length !== q.length) {
                return false
            }
            for (let i = 0; i < p.length; i++) {
                if (!p[i].Equal(q[i])) {
                    return false
                }
            }
            return true
        }

        function intersect(pr: Terminal, ne: Terminal, offset: number): boolean {
            for (let k = offset; k < TerminalHeight - 1; k++) {
                if (!equalLine(pr.Content[k], ne.Content[k - offset])) {
                    return false
                }
            }
            return true
        }

        for (let i = 0; i < TerminalHeight - 1; i++) {
            if (intersect(prev, next, i)) {
                return i
            }
        }
        return TerminalHeight // 不相交
    }

    private async enterSuggestBoard(): Promise<void> {
        switch (this.snapshotStat) {
            case PTTState.MainPage:
            case PTTState.Category:
            case PTTState.Favorite:
            case PTTState.Hot:
            case PTTState.Board:
                // case PTTState.Article:
                await this.Send(Control.BoardSuggest())
                break
            default:
                return
        }
    }

    private async exitSuggestBoard(): Promise<void> {
        switch (this.snapshotStat) {
            case PTTState.BoardSuggest:
                let text = this.snapshot.GetString(2)
                text = text.replace("請輸入看板名稱(按空白鍵自動搜尋):", "").trim()
                const byteArray: byte[] = []
                for (const _ of text) {
                    byteArray.push(0x08)
                }
                byteArray.push(0x0d)
                await this.Send(Buffer.from(byteArray))
                break
            default:
                return
        }
        await this.Send(Control.BoardSuggest())
    }

    private popular(popuStr: string, refBlock: Block) {
        let popu: number = 0
        switch (popuStr) {
            case "HOT":
                popu = 100
                break
            case "爆!":
                switch (refBlock.Foreground) {
                    case 37:
                        popu = 1000
                        break
                    case 31:
                        popu = 2000
                        break
                    case 34:
                        popu = 5000
                        break
                    case 36:
                        popu = 10000
                        break
                    case 32:
                        popu = 30000
                        break
                    case 33:
                        popu = 60000
                        break
                    case 35:
                        popu = 100000
                        break
                }
                break
            default:
                popu = parseInt(popuStr, 10)
                break
        }
        return popu
    }

    private rowOfCursor(term: Terminal): number {
        for (let i = 3; i < 23; i++) {
            const x = term.GetString(i).trimLeft()
            if (x.startsWith(">") || x.startsWith("●")) {
                return i
            }
        }
        return -1
    }

    private async getAID(row: number, term: Terminal): Promise<[string, string, string, Terminal]> {
        const cursor = this.rowOfCursor(term)

        const command: number[] = []
        if (cursor !== row) {
            if (cursor > row) {
                for (let k = 0; k < cursor - row; k++) {
                    command.push(0x1b, 0x5b, 0x41)
                }
            } else {
                for (let k = 0; k < row - cursor; k++) {
                    command.push(0x1b, 0x5b, 0x42)
                }
            }
        }
        command.push(0x51)
        let [t] = await this.Send(Buffer.from(command))

        const [aid, url, coin] = this._getAID(t)
        ;[t] = await this.Send(Control.AnyKey())

        return [aid, url, coin, t]
    }

    private _getAID(term: Terminal): [string, string, string] {
        let aid = ""
        let url = ""
        let coin = ""
        for (let i = 0; i < 20; i++) {
            const aidStr = term.GetString(i)
            if (aidStr.includes("文章代碼(AID)")) {
                aid = term.GetSubstring(i, 18, 27)
                const urlStr = term.GetString(i + 1)
                if (urlStr.includes("文章網址:")) {
                    url = term.GetSubstring(i + 1, 13, 75).trim()
                }
                const coinStr = term.GetString(i + 2)
                const reg = /\d+/
                const c = reg.exec(coinStr)
                if (c) {
                    coin = c.toString()
                }
                break
            }
        }
        return [aid, url, coin]
    }

    public async enterMailList(): Promise<boolean> {
        let t: Terminal = this.snapshot
        let s: PTTState = this.snapshotStat
        while (s !== PTTState.MainPage) {
            ;[t, s] = await this.Send(Control.Left())
        }

        ;[t, s] = await this.Send(Control.CtrlU())
        while (s !== PTTState.EasyTalk) {
            ;[t, s] = await this.WaitForNext()
        }

        await this.Send(0x72)

        let retry = 0
        while (this.snapshotStat === PTTState.EasyTalk) {
            if (retry >= 20) {
                this.mailCache.size = 0
                return false
            }
            await this.sleep(100)
            retry++
        }

        this.mailCache.clear()
        const regex = /\(容量:\s*(\d+)\s*\/\s*(\d+)\s*篇\)/
        const match = regex.exec(this.snapshot.GetString(2))
        if (match) {
            this.mailCache.size = parseInt(match[1].toString(), 10)
            this.mailCache.maxSize = parseInt(match[2].toString(), 10)
        }

        // get list like board do
        let nStr = this.snapshot.GetSubstring(3, 0, 7)
        if (nStr[0] === "●" || nStr[0] === ">") {
            nStr = nStr.slice(1)
        }
        nStr = nStr.trim()
        if (nStr !== "1") {
            ;[t, s] = await this.Send(Control.Home())
        }

        return true
    }

    public async getMoreMailAbstract(count: number): Promise<MailAbstract[]> {
        if (this.snapshotStat !== PTTState.MailList || count <= 0) {
            return []
        }

        if (count <= this.mailCache.remain) {
            return this.mailCache.getMore(count)
        }

        while (this.mailCache.hasMore && count > this.mailCache.remain) {
            const [term] = this.mailCache.isEmpty
                ? this.mailCache.size === 1
                    ? [this.snapshot]
                    : await this.Send(Control.End())
                : await this.Send(Control.PageUp())

            const ans = await this._getMoreMailAbstract(term)
            ans.forEach(i => this.mailCache.add(i))

            const regex = /\(容量:\s*(\d+)\s*\/\s*(\d+)\s*篇\)/
            const match = regex.exec(term.GetString(2))
            if (match) {
                this.mailCache.size = parseInt(match[1].toString(), 10)
                this.mailCache.maxSize = parseInt(match[2].toString(), 10)
            }
        }

        return this.mailCache.getMore(count)
    }

    private async _getMoreMailAbstract(term: Terminal): Promise<MailAbstract[]> {
        const result: MailAbstract[] = []
        for (let i = 22; i > 2; i--) {
            let indexStr = term.GetSubstring(i, 0, 6).trim()
            let index: number = 0

            if (indexStr[0] === "●" || indexStr[0] === ">") {
                indexStr =
                    indexStr[1] === " "
                        ? (indexStr = indexStr.slice(2).trim())
                        : (term.GetSubstring(i - 1, 1, 2) + indexStr.substr(1)).trim()
            }

            if (indexStr !== "") {
                index = parseInt(indexStr, 10)
            } else {
                continue
            }

            const state: ReadState = this.getReadState(term.GetSubstring(i, 7, 8))
            const dateStr = term.GetSubstring(i, 9, 14)
            const author = term.GetSubstring(i, 15, 27).trim()
            const title = term.GetSubstring(i, 30, 80).trim()

            const item: MailAbstract = {
                key: index,
                date: dateStr,
                author,
                state,
                title,
            }
            result.push(item)
        }
        return result
    }

    public async sendPttMail(username: string, subject: string, content: Uint8Array): Promise<boolean> {
        if (this.snapshotStat !== PTTState.MailList) {
            return false
        }

        let [, s] = await this.Send(Control.CtrlP())
        while (s !== PTTState.SendMail) {
            await this.WaitForNext()
        }

        ;[, s] = await this.Send(username, 0x0d)
        while (s !== PTTState.SendMailSubject) {
            await this.WaitForNext()
        }

        ;[, s] = await this.Send(subject, 0x0d)
        while (s !== PTTState.EditFile) {
            await this.WaitForNext()
        }

        ;[, s] = await this.Send(content)
        ;[, s] = await this.Send(Control.CtrlX())
        while (s !== PTTState.ProcessFile) {
            await this.WaitForNext()
        }

        let sign = false
        ;[, s] = await this.Send(0x73, 0x0d)
        while (s !== PTTState.SendMailSuccess) {
            if (s === PTTState.Signature && !sign) {
                sign = true
                ;[, s] = await this.Send(0x30, 0x0d) // 不加簽名檔
            }
        }

        await this.Send(Control.No()) // 不儲存草稿
        ;[, s] = await this.Send(Control.AnyKey())
        while (s !== PTTState.MailList) {
            await this.WaitForNext()
        }

        return true
    }

    public async sendTestMail(username: string, subject: string, content: string): Promise<string> {
        let term: Terminal
        let stat: PTTState
        if (this.mailCache.isOverflow) {
            return "信箱滿了 請整理"
        }

        await this.Send(Control.Mail())
        await this.Send(Control.SendMail())
        ;[term, stat] = await this.Send(username, 0x0d)

        while (stat !== PTTState.SendMailSubject) {
            if (stat === PTTState.PersonMail) {
                await this.Send(Control.Left())
                return "使用者不存在"
            }
            ;[term, stat] = await this.WaitForNext()
        }

        ;[term, stat] = await this.Send(subject, 0x0d)
        while (stat !== PTTState.EditFile) {
            ;[term, stat] = await this.WaitForNext()
        }

        ;[term, stat] = await this.Send(content, 0x0d)
        ;[term, stat] = await this.Send(Control.CtrlX())
        while (stat !== PTTState.ProcessFile) {
            ;[term, stat] = await this.WaitForNext()
        }

        ;[term, stat] = await this.Send(0x73, 0x0d)
        while (stat !== PTTState.SendMailSuccess) {
            if (stat === PTTState.Signature) {
                ;[term, stat] = await this.Send(0x30, 0x0d)
                continue
            }
            ;[term, stat] = await this.WaitForNext()
        }

        ;[term, stat] = await this.Send(Control.No())
        while (stat !== PTTState.MainPage) {
            ;[term, stat] = await this.Send(Control.Left())
        }

        return "寄信成功"
    }

    public checkMail(): boolean {
        return this.newMail
    }

    public async left(): Promise<void> {
        await this.Send(Control.Left())
    }

    private WaitForNext(): Promise<[Terminal, PTTState]> {
        return new Promise(resolve => {
            this.once("StateUpdated", (term: Terminal, stat: PTTState) => {
                resolve([term.DeepCopy(), stat])
            })
        })
    }

    private Send(data: Data, ...optionalParams: Data[]): Promise<[Terminal, PTTState]> {
        return new Promise(resolve => {
            this.once("StateUpdated", (term: Terminal, stat: PTTState) => {
                resolve([term.DeepCopy(), stat])
            })
            this.send(data, ...optionalParams)
        })
    }

    private WaitClose(): Promise<void> {
        return new Promise(resolve => {
            if (this.scst === SocketState.Connected) {
                this.once("socket", (stat: SocketState) => {
                    if (stat === SocketState.Closed) {
                        resolve()
                    }
                })
            }
        })
    }

    private async sleep(ms = 0) {
        return new Promise(r => setTimeout(r, ms))
    }

    public getState() {
        return this.snapshotStat
    }
}
