export class Control {
    public static Yes() {
        return Buffer.from([0x79, 0x0D])
    }

    public static No() {
        return Buffer.from([0x6E, 0x0D])
    }

    public static Up() {
        return Buffer.from([0x1B, 0x5B, 0x41])
    }

    public static Down() {
        return Buffer.from([0x1B, 0x5B, 0x42])
    }

    public static Right() {
        return Buffer.from([0x72])
    }

    public static Left() {
        return Buffer.from([0x1B, 0x5B, 0x44])
    }

    public static PageUp() {
        return Buffer.from([0x1B, 0x5B, 0x35, 0x7E])
    }

    public static PageDown() {
        return Buffer.from([0x1B, 0x5B, 0x36, 0x7E])
    }

    public static Home() {
        return Buffer.from([0x1B, 0x5B, 0x31, 0x7E])
    }

    public static End() {
        return Buffer.from([0x1B, 0x5B, 0x34, 0x7E])
    }

    public static AnyKey() {
        return Buffer.from([0x20])
    }

    public static Space() {
        return Buffer.from([0x20])
    }

    public static ReloadEcho() {
        return Buffer.from([0x71, 0x72, 0x24])
    }

    // Func
    public static SearchBoard() {
        return Buffer.from([0x73])
    }
    // Main Page

    /** (A)nnounce 精華公佈欄 */
    public static Announce() {
        return Buffer.from([0x41, 0x0D])
    }

    /** (F)avorite 我的最愛 */
    public static Favorite() {
        return Buffer.from([0x46, 0x0D])
    }

    /** (C)lass 分組討論區 */
    public static Class() {
        return Buffer.from([0x43, 0x0D])
    }

    /** (M)ail 私人信件區 */
    public static Mail() {
        return Buffer.from([0x4D, 0x0D])
    }

    /** (T)alk 休閒聊天區 */
    public static Talk() {
        return Buffer.from([0x54, 0x0D])
    }

    /** (U)ser 個人設定區 */
    public static User() {
        return Buffer.from([0x55, 0x0D])
    }

    /** (X)yz 系統資訊區 */
    public static Xyz() {
        return Buffer.from([0x58, 0x0D])
    }

    /** (P)lay 娛樂與休閒 */
    public static Play() {
        return Buffer.from([0x50, 0x0D])
    }

    /** (N)amelist 編特別名單 */
    public static Namelist() {
        return Buffer.from([0x4E, 0x0D])
    }

    /** (G)oodbye 再見 */
    public static Goodbye() {
        return Buffer.from([0x47, 0x0D, 0x79, 0x0D, 0x20])
    }
}
