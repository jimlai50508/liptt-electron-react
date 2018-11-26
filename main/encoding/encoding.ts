import { b2u } from "./b2u"
import { u2b } from "./u2b"

/** Big5 (Unicode-at-on 2.50) : 最早是為了解決所謂 CP950 沒有正確對應日文假名的問題， 並加入了中國海字集（DOS 時代最流行的外字集）的部份， 2.0 後又自訂編碼在 Big5 的造字區加入了大量日文漢字及簡体字。 不相容 Big5-HKSCS。  */
/** https://moztw.org/docs/big5/ */
export class Big5UAO {
    /** 從資料組獲得unicode字串 */
    public static GetString(bytes: Buffer | Uint8Array): string
    public static GetString(bytes: Buffer | Uint8Array, index: number, count: number): string
    public static GetString(bytes: Uint8Array | Buffer, index?: number, count?: number): string {

        if (!index || !count) {
            index = 0
            count = bytes.length
        }

        const sb: string[] = []
        let i = index

        while (i < index + count) {
            if (bytes[i] <= 0x7F) {
                sb.push(String.fromCodePoint(bytes[i++]))
            } else {
                let k = bytes[i++]
                if (i < index + count) {
                    k <<= 8
                    k += bytes[i++]
                    const v = b2u[k]
                    if (v) {
                        sb.push(String.fromCodePoint(v))
                    } else {
                        sb.push(String.fromCodePoint(0xFFFD))
                    }
                } else {
                    break
                }
            }
        }
        return sb.join("")
    }

    public static GetBytes(s: string): Uint8Array {
        const arr: number[] = []
        for (let i = 0; i < s.length; i++) {
            const k = s.charCodeAt(i)
            if (k <= 0x7F) {
                arr.push(k)
            } else {
                const v = u2b[k]
                if (v) {
                    arr.push(v >> 8)
                    arr.push(v & 0xFF)
                }
            }
        }
        return new Uint8Array(arr)
    }
}
