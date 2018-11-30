const path = require("path")
const _eval = require("eval")

module.exports = function (content) {
    this.cacheable()
    const te = _eval(content)
    console.log("上上上上")

    console.log(filenameToTypingsFilename(this.resourcePath))

    console.log(content)
    console.log("type: " + typeof te)
    Object.keys(te).forEach((key) => {
        console.log(key + " type: " + typeof te[key])
    })
    console.log("下下下下")
    return content
}

function filenameToTypingsFilename(filename) {
    const dirName = path.dirname(filename)
    const baseName = path.basename(filename)
    return path.join(dirName, `${baseName}.d.ts`)
}
