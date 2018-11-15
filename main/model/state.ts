import { Terminal } from "./terminal"

/** PTT的畫面狀態 */
export enum PTTState {
    /** 完全沒有畫面 */
    None,
    /** 請輸入使用者帳號 */
    Username,
    /** 請輸入使用者密碼 */
    Password,
    /** PTT批踢踢實業坊 */
    Horse,
    /** 系統過載 */
    Overloading,
    /** 登入太頻繁 */
    HeavyLogin,
    /** 有重複登入 */
    AlreadyLogin,
    /** 錯誤的密碼 */
    WrongPassword,
    /** 密碼正確 */
    Accept,
    /** 登入中 */
    Logging,
    /** 同步處理中 */
    Synchronizing,
    /** 要刪除上次錯誤的嘗試紀錄嗎? */
    Log,
    /** 任意鍵繼續 */
    AnyKey,
    /** 主功能表 */
    MainPage,
    /** 熱門看板 */
    Popular,
    /** 我的最愛 */
    Favorite,
    /** 搜尋 */
    Search,
    /** 相關看板一覽表 */
    SearchGroup,
    /** 增加我的最愛 */
    AddFavorite,
    /** 增加我的最愛 相關看板一覽表 */
    AddFavoriteGroup,
    /** 看板 */
    Board,
    /** 看板資訊 */
    BoardInfo,
    /** 文章 */
    Article,
    /** 文章ID */
    ArticleID,
    /** 推/噓 */
    Comment,
    /** 確定要離開? */
    ExitConcern,
    /** 找不到這個文章代碼 */
    AIDNotFound,
    /** 未定義的狀態 */
    WhereAmI,
    /** 已連線 */
    Connected,
    /** websocket 連線失敗 */
    WebSocketFailed,
    /** websocket 連線關閉 */
    WebSocketClosed,
    /** 連線逾時 */
    Timeout,
}

export function StateString(s: PTTState): string {
    switch (s) {
    case PTTState.None:
        return "完全沒有畫面"
    case PTTState.Username:
        return "請輸入使用者帳號"
    case PTTState.Password:
        return "請輸入使用者密碼"
    case PTTState.Horse:
        return "PTT批踢踢實業坊"
    case PTTState.Overloading:
        return "系統過載"
    case PTTState.HeavyLogin:
        return "登入太頻繁"
    case PTTState.AlreadyLogin:
        return "有重複登入"
    case PTTState.WrongPassword:
        return "錯誤的帳號密碼"
    case PTTState.Accept:
        return "密碼正確"
    case PTTState.Logging:
        return "登入中"
    case PTTState.Synchronizing:
        return "同步處理中"
    case PTTState.Log:
        return "要刪除上次錯誤的嘗試紀錄嗎"
    case PTTState.AnyKey:
        return "任意鍵繼續"
    case PTTState.MainPage:
        return "主功能表"
    case PTTState.Popular:
        return "熱門看板"
    case PTTState.Favorite:
        return "我的最愛"
    case PTTState.Search:
        return "搜尋"
    case PTTState.SearchGroup:
        return "相關看板一覽表"
    case PTTState.AddFavorite:
        return "增加我的最愛"
    case PTTState.Board:
        return "看板"
    case PTTState.BoardInfo:
        return "看板資訊"
    case PTTState.Article:
        return "瀏覽文章"
    case PTTState.ArticleID:
        return "文章ID"
    case PTTState.Comment:
        return "推/噓"
    case PTTState.ExitConcern:
        return "確定要離開"
    case PTTState.AIDNotFound:
        return "找不到文章代碼"
    case PTTState.Connected:
        return "已連線"
    case PTTState.WebSocketClosed:
        return "連線關閉"
    case PTTState.WebSocketFailed:
        return "連線失敗"
    case PTTState.Timeout:
        return "連線逾時"
    default:
        return "未定義的狀態"
    }
}

const articleFootReg = /瀏覽 第 ([\d\/]+) 頁 \(([\s\d]+)\%\)  目前顯示: 第\s*(\d+)\s*~\s*(\d+)\s*行/
let flag: object
let prevMatch: RegExpExecArray

export function StateFilter(t: Terminal) {
    const line22 = t.GetString(22)
    const line23 = t.GetString(23)
    if (t.GetString(1).startsWith("請輸入看板名稱(按空白鍵自動搜尋):")) {
        return PTTState.Search
    } else if (t.GetSubstring(23, 66, 74) === "[呼叫器]") {
        return PTTState.MainPage
    } else if (line23.includes("登入太頻繁")) {
        return PTTState.HeavyLogin
    } else if (line23.includes("您要刪除以上錯誤嘗試的記錄嗎")) {
        return PTTState.Log
    } else if (line23.includes("您覺得這篇文章")) {
        return PTTState.Comment
    } else if (articleFootReg.test(line23)) {
        if (flag) {
            const match = articleFootReg.exec(line23)
            if (match) {
                if (match[3] === prevMatch[3]) {
                    return PTTState.WhereAmI
                } else {
                    prevMatch = match
                }
            }
        } else {
            flag = {}
            prevMatch = articleFootReg.exec(line23)
        }
        return PTTState.Article
    } else if (line22.includes("您想刪除其他重複登入的連線嗎")) {
        return PTTState.AlreadyLogin
    } else if (line22.includes("您確定要離開")) {
        return PTTState.ExitConcern
    } else if (line22.startsWith("登入中")) {
        return PTTState.Logging
    } else if (line22.startsWith("正在更新與同步")) {
        if (line23.includes("任意鍵")) {
            return PTTState.AnyKey
        } else {
            return PTTState.Synchronizing
        }
    } else if (t.GetString(21).includes("密碼不對或無此帳號")) {
        return PTTState.WrongPassword
    } else if (t.GetString(21).startsWith("密碼正確！")) {
        return PTTState.Accept
    } else if (t.GetString(21).includes("請輸入您的密碼:")) {
        return PTTState.Password
    } else if (t.GetString(20).includes("請輸入代號，")) {
        return PTTState.Username
    } else if (t.GetString(13).includes("系統過載")) {
        return PTTState.Overloading
    } else if (t.GetString(4).includes("批踢踢實業坊        ◢▃██◥█◤")) {
        return PTTState.Horse
    } else if (t.GetString(3).includes("看板設定")) {
        return PTTState.BoardInfo
    } else if (t.GetString(2).startsWith("------------------------------- 相關資訊一覽表 -------------------------------")) {
        const x = t.GetSubstring(23, 4, 26).trim()
        if (x === "按空白鍵可列出更多項目" || x === "") {
            return PTTState.SearchGroup
        } else {
            return PTTState.WhereAmI
        }
    } else if (testBoard(t.GetString(0), t.GetString(23))) {
        flag = undefined
        return PTTState.Board
    } else if (t.GetString(2) === "   編號   看  板       類別   中   文   敘   述               人氣 板   主      ") {
        return PTTState.Favorite
    } else if (t.GetString(22).startsWith("找不到這個文章代碼(AID)")) {
        return PTTState.AIDNotFound
    } else if (t.GetString(1).startsWith("請輸入欲加入的看板名稱(按空白鍵自動搜尋)：")) {
        return PTTState.AddFavorite
    } else if (line23.includes("任意鍵")) {
        return PTTState.AnyKey
    } else {
        return PTTState.WhereAmI
    }
}

function testBoard(line0: string, line23: string): boolean {
    if (line0.startsWith("【板主:") && line23 === " 文章選讀  (y)回應(X)推文(^X)轉錄 (=[]<>)相關主題(/?a)找標題/作者 (b)進板畫面   ") {
        return true
    }
    return false
}
