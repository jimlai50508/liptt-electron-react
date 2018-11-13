import { ipcRenderer, EventEmitter } from "electron"

type T = Response

/** 用Promise處理electron message的介面 */
export class PromiseIpcRenderer {
    public static async send<Response>(channel: string, ...args: any[]): Promise<Response> {
        return new Promise<Response>((resolve) => {
            ipcRenderer.once(channel, (e: EventEmitter, response: Response) => {
                resolve(response)
            })
            console.warn("render send " + channel)
            ipcRenderer.send(channel, ...args)
        })
    }
}
