const fs = require("fs/promises")

const setup = async () => {
    try {
        await fs.mkdir("./cache")
        await fs.mkdir("./cache/user")
    } catch (err) {
        console.log("SETUP FAILED...")
    }
}
module.exports.setup = setup