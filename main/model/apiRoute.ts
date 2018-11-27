export class ApiRoute {
    public static readonly login = "/login"
    public static readonly logout = "/logout"
    public static readonly loadUserInfo = "/storage/user"

    public static readonly terminalSnapshot = "/terminal-snapshot"

    public static readonly getFavoriteList = "/favor"
    public static readonly getHotList = "/hot"
    public static readonly getMailList = "/mail"

    public static readonly left = "/left"

    public static readonly checkMail = "/check-mail"

    public static readonly goBoard = "/board"
    public static readonly getMoreBoard = "/board/get-more"
    public static readonly getBoardArticleHeader = "/board/article-header"

    public static readonly getMoreArticle = "/article/get-more"

    public static readonly googleSendMail = "/google/send-mail"
    public static readonly testDevMode = "/is-dev-mode"
    public static readonly socketEvent = "/socket"
}
