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
    /** 掰掰 */
    Quit,
    /** 任意鍵繼續 */
    AnyKey,
    /** 主功能表 */
    MainPage,
    /** 熱門看板 */
    Hot,
    /** 我的最愛 */
    Favorite,
    /** 搜尋 */
    BoardSuggest,
    /** 相關看板一覽表 */
    SearchGroup,
    /** 增加我的最愛 */
    AddFavorite,
    /** 增加我的最愛 相關看板一覽表 */
    AddFavoriteGroup,
    /** 分類看板 */
    Category,
    /** 看板 */
    Board,
    /** 看板資訊 */
    BoardInfo,
    /** 文章 */
    Article,
    /** 文章ID */
    ArticleID,
    /** 此文章無內容 */
    ArticleDeleted,
    /** 推/噓 */
    Comment,
    /** 找不到這個文章代碼 */
    AIDNotFound,
    /** 使用者列表 */
    EasyTalk,
    /** 個人信箱 */
    PersonMail,
    /** 郵件清單 */
    MailList,
    /** 寄站內信 */
    SendMail,
    /** 信件標題 */
    SendMailSubject,
    /** 編輯文章或信件內容 */
    EditFile,
    /** 處理文章或信件 */
    ProcessFile,
    /** 選擇簽名檔 */
    Signature,
    /** 已順利寄出 */
    SendMailSuccess,
    /** 編輯器自動復原 */
    UnsavedFile,
    /** 信箱滿出來了 */
    MailOverflow,
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
    case PTTState.Quit:
        return "已離開"
    case PTTState.AnyKey:
        return "任意鍵繼續"
    case PTTState.MainPage:
        return "主功能表"
    case PTTState.Hot:
        return "熱門看板"
    case PTTState.Favorite:
        return "我的最愛"
    case PTTState.BoardSuggest:
        return "搜尋"
    case PTTState.SearchGroup:
        return "相關看板一覽表"
    case PTTState.AddFavorite:
        return "增加我的最愛"
    case PTTState.Category:
        return "分類看板"
    case PTTState.Board:
        return "看板"
    case PTTState.BoardInfo:
        return "看板資訊"
    case PTTState.Article:
        return "瀏覽文章"
    case PTTState.ArticleID:
        return "文章ID"
    case PTTState.ArticleDeleted:
        return "文章已被刪除"
    case PTTState.Comment:
        return "推/噓"
    case PTTState.AIDNotFound:
        return "找不到文章代碼"
    case PTTState.EasyTalk:
        return "休閒聊天（使用者列表）"
    case PTTState.PersonMail:
        return "個人信箱"
    case PTTState.MailList:
        return "郵件選單"
    case PTTState.SendMail:
        return "寄站內信"
    case PTTState.SendMailSubject:
        return "輸入信件標題"
    case PTTState.EditFile:
        return "編輯文章"
    case PTTState.ProcessFile:
        return "處理文章"
    case PTTState.Signature:
        return "選擇簽名檔"
    case PTTState.SendMailSuccess:
        return "已順利寄出"
    case PTTState.UnsavedFile:
        return "編輯器自動復原"
    case PTTState.MailOverflow:
        return "您保存信件數目已超出上限"
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
let flag: boolean
let prevMatch: RegExpExecArray

export function StateFilter(t: Terminal) {
    const lines = t.GetLines()
    if (lines[1].startsWith("請輸入看板名稱(按空白鍵自動搜尋):")) {
        return PTTState.BoardSuggest
    } else if (lines[23].includes("登入太頻繁")) {
        return PTTState.HeavyLogin
    } else if (lines[23].includes("您要刪除以上錯誤嘗試的記錄嗎")) {
        return PTTState.Log
    } else if (lines[23].trimLeft().startsWith("◆ 此文章無內容")) {
        return PTTState.ArticleDeleted
    } else if (lines[23].includes("您覺得這篇文章")) {
        return PTTState.Comment
    } else if (lines[23].startsWith(" 鴻雁往返  (R/y)回信 (x)站內轉寄 (d/D)刪信 (^P)寄發新信")) {
        return PTTState.MailList
    } else if (lines[23].trimLeft().startsWith("編輯文章  (^Z/F1)說明 (^P/^G)插入符號/範本 (^X/^Q)離開")) {
        return PTTState.EditFile
    } else if (lines[23].startsWith(" ◆ 此次停留時間")) {
        prevMatch = null
        flag = false
        return PTTState.Quit
    } else if (articleFootReg.test(lines[23])) {
        if (flag) {
            const match = articleFootReg.exec(lines[23])
            if (match) {
                if (match[3] === prevMatch[3]) {
                    console.log("FIXME: article footer wrong match")
                    return PTTState.WhereAmI
                } else {
                    prevMatch = match
                }
            }
        } else {
            flag = true
            prevMatch = articleFootReg.exec(lines[23])
        }
        return PTTState.Article
    } else if (t.GetSubstring(23, 66, 74) === "[呼叫器]") {
        if (lines[0].startsWith("【電子郵件】")) {
            return PTTState.PersonMail
        } else if (lines[0].startsWith("【主功能表】")) {
            return PTTState.MainPage
        }
    } else if (lines[22].startsWith("已順利寄出，是否自存底稿(Y/N)？")) {
        return PTTState.SendMailSuccess
    } else if (lines[22].includes("您想刪除其他重複登入的連線嗎")) {
        return PTTState.AlreadyLogin
    } else if (lines[22].startsWith("登入中")) {
        return PTTState.Logging
    } else if (lines[22].startsWith("正在更新與同步")) {
        if (lines[23].includes("任意鍵")) {
            return PTTState.AnyKey
        } else {
            return PTTState.Synchronizing
        }
    } else if (lines[21].includes("密碼不對或無此帳號")) {
        return PTTState.WrongPassword
    } else if (lines[21].startsWith("密碼正確！")) {
        return PTTState.Accept
    } else if (lines[21].includes("請輸入您的密碼:")) {
        return PTTState.Password
    } else if (lines[20].includes("請輸入代號，")) {
        return PTTState.Username
    } else if (lines[13].includes("系統過載")) {
        return PTTState.Overloading
    } else if (lines[4].includes("批踢踢實業坊        ◢▃██◥█◤")) {
        return PTTState.Horse
    } else if (lines[3].includes("看板設定")) {
        return PTTState.BoardInfo
    } else if (lines[2].startsWith("------------------------------- 相關資訊一覽表 -------------------------------")) {
        // 待修改
        const x = t.GetSubstring(23, 4, 26).trim()
        if (x === "按空白鍵可列出更多項目" || x === "") {
            return PTTState.SearchGroup
        } else {
            return PTTState.WhereAmI
        }
    } else if (testBoard(lines[0], lines[1])) {
        flag = false
        return PTTState.Board
    } else if (lines[0].startsWith("【分類看板】"))  {
        return PTTState.Category
    } else if (lines[0].startsWith("【休閒聊天】"))  {
        return PTTState.EasyTalk
    } else if (lines[0].startsWith("【 站內寄信 】")) {
        if (lines[2].startsWith("主題：")) {
            return PTTState.SendMailSubject
        }
        return PTTState.SendMail
    } else if (lines[0].startsWith("【 檔案處理 】")) {
        return PTTState.ProcessFile
    } else if (lines[0].startsWith("【 編輯器自動復原 】")) {
        return PTTState.UnsavedFile
    } else if (lines[0].startsWith("請選擇簽名檔 (1-9, 0=不加 x=隨機)")) {
        return PTTState.Signature
    } else if (testFavor(lines[2], lines[23])) {
        return PTTState.Favorite
    } else if (testHot(lines[2], lines[23])) {
        return PTTState.Hot
    } else if (lines[22].startsWith("找不到這個文章代碼(AID)")) {
        return PTTState.AIDNotFound
    } else if (lines[1].startsWith("請輸入欲加入的看板名稱(按空白鍵自動搜尋)：")) {
        return PTTState.AddFavorite
    } else if (lines[23].includes("任意鍵")) {
        if (/◆ 您保存信件數目 \d+ 超出上限 \d+, 請整理/.test(lines[23])) {
            return PTTState.MailOverflow
        }
        return PTTState.AnyKey
    }

    return PTTState.WhereAmI
}

function testBoard(line0: string, line1: string): boolean {
    if (line0.startsWith("【板主")) {
        if (line1 === "[←]離開 [→]閱讀 [Ctrl-P]發表文章 [d]刪除 [z]精華區 [i]看板資訊/設定 [h]說明   ") {
            return true
        }
    }
    return false
}

function testHot(line2: string, line23: string): boolean {
    if (line2 === "   編號   看  板       類別   中   文   敘   述               人氣 板   主      ") {
        if (line23.trim() === "選擇看板    (m)加入/移出最愛 (y)只列最愛 (v/V)已讀/未讀") {
            return true
        }
    }
    return false
}

function testFavor(line2: string, line23: string): boolean {
    if (line2 === "   編號   看  板       類別   中   文   敘   述               人氣 板   主      ") {
        if (line23.trim() === "選擇看板    (a)增加看板 (s)進入已知板名 (y)列出全部 (v/V)已讀/未讀") {
            return true
        }
    }
    return false
}
