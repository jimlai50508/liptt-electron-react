import { ReadState } from "./board"

export interface MailAbstract {
    // 編號   日 期 作 者          信  件  標  題                  (容量:207/200篇)
    key: number
    state?: ReadState
    date?: string
    author?: string
    title?: string
}
