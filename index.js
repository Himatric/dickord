const fs = require("fs/promises");
const { init } = require("./src/init");
const { setup } = require("./src/setup")

const firstTime = async () => {
    const files = await fs.readdir("./");
    return files.includes("cache") ? true : false;
}

(async () => {
    const first = await firstTime();
    first ? null : await setup()
    return await init()
})()

