const fs = require("fs")

class CacheFuncs {
    static add(what) {
        fs.appendFileSync("./cache/user/data.txt", ` ${what}`)
    }
    static getUserCache() {
        return fs.readFileSync("./cache/user/data.txt", "utf-8")
    }
}
module.exports.CacheFuncs = CacheFuncs