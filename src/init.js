const fs = require("fs/promises");
const { writeFileSync } = require("fs")
const terminal = require("terminal-kit");
const term = terminal.terminal
const axios = require("axios").default
const EventEmitter = require("events")
const emitter = new EventEmitter()
const { CacheFuncs } = require("./cache/Cache")
const { InitConsole } = require("./socket/init")

const client = {};
process.on("exit", () => {
    try {
    writeFileSync("./cache/user/settings.json", JSON.stringify(client.settings))
    } catch {
        return
    }
})

const findToken = async () => {
    try {
        const regexes = [/[\w-]{24}\.[\w-]{6}\.[\w-]{38}/, /mfa\.[\w-]{84}/];
        const file = "./cache/user/data.txt";
        const data = await fs.readFile(file, "utf-8");
        let matches = [];
        for (const regex of regexes) {
            // for(const line of data.split("\n")) {
            //     const match = line.match(regex);
            //     match ? matches.push(match[0]) : "";
            // }
            for (const line of data.split(" ")) {
                const match = line.match(regex);
                match ? matches.push(match[0]) : "";
            }
        }
        return matches.length > 0 ? matches : false;
    } catch (err) {
        console.log(err)
        term.red("Token not found");
        return false;
    }

}
const login = async (login, password) => {
    const res = [(await axios({
        method: "post",
        url: "https://discord.com/api/v9/auth/login",
        data: {
            login,
            password
        }
    })).data.token]
    return res
}
const askToken = async () => {
    const options = [
        "1. Login with token (preferred)",
        "2. Login with credentials"
    ]
    term.singleColumnMenu(options, (err, res) => {
        index = res.selectedIndex
        if (index === 0) {
            term("Input your token: ")
            term.inputField(null, (err, res) => {
                term("\n")
                emitter.emit("ready", new Promise((re, rej) => { re([res]) }))
            })
        } else {
            term("Input login: ")
            term.inputField(null, (err, res) => {
                term("\nInput password: ")
                term.inputField(null, async (err, resp) => {
                    term("\n")
                    emitter.emit("ready", login(res, resp))
                })
            })
        }
    })

}
const init = async (e) => {
    term.windowTitle("Disconsole - version 1.0")
    let tokens = false;
    if (!e) {
        term.clear()
        tokens = await findToken();
        if (tokens) await further(tokens)
    }
    if (!tokens) {
        askToken()
        emitter.on("ready", async (func) => {
            tokens = await func
            return await further(tokens)
        })

    }

    async function further(tokens) {
        term.clear()
        let accounts = new Map();
        for (const token of tokens) {
            const data = await getUserData(token)
            const { username, discriminator } = data
            data.token = token
            accounts.set(`${username}#${discriminator}`, data)
        }
        const accountNames = Array.from(accounts.keys())
        accountNames.push("Other Account ?")
        term.singleColumnMenu(accountNames, (err, res) => {
            if (res.selectedIndex === accountNames.length - 1) {
                return init(true)
            }
            const name = accountNames[res.selectedIndex]
            const data = accounts.get(name)
            const text = CacheFuncs.getUserCache()
            if (!text.includes(data.token)) CacheFuncs.add(data.token)
            client.user = data
            InitConsole(client)
        })
    }
}
const getUserData = async (token) => {
    try {
        const data = (await axios({
            method: "get",
            url: "https://discord.com/api/users/@me",
            headers: {
                authorization: token
            }
        })).data
        return data
    } catch (err) {
        writeFileSync("./cache/user/data.txt", "")
        process.exit()
    }
}


module.exports = {
    init
}
