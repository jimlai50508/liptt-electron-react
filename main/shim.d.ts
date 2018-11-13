declare module "*package.json" {
    const name: string
    const version: string
    const license: string
    const author: Author
}

interface Author {
    name?: string
    email?: string
}
