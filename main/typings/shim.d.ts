declare module "*package.json" {
    export const name: string
    export const version: string
    export const license: string
    export const author: Author
}

interface Author {
    name?: string
    email?: string
}
