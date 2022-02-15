const term = require("terminal-kit").terminal
const NodeCache = require("node-cache")
const WebSocket = require("ws")
const { fase, viewChannel, renderImage } = require("../handler/handle.js")
const EventEmitter = require("events")
const { default: axios } = require("axios")
const emitter = new EventEmitter()
const drawImages = () => {
    term.drawImage("images/dickord.png", {"shrink": {"height": 100, "width": 200}}, () => {
        term.drawImage("images/rapecord.png", {shrink: {height: 50, width: 200}})
    })
}
const InitConsole = async (client) => {
    client.settings = require("../../cache/user/settings.json")
    client.emitter = new EventEmitter()
    drawImages()
    emitter.on("ready", () => {
        term.clear()
        fase(client)
    })
    client.currentState = "IDLE"
    client.guilds = new NodeCache()
    client.textChannels = new NodeCache()
    client.DMChannels = new NodeCache()
    const ws = new WebSocket("wss://gateway.discord.gg/?encoding=json&v=9")
    client.socket = ws
    term.on("key", (key) => {
        switch(key) {
            case "CTRL_C": 
                process.exit(0)
            case "LEFT":
                if(client.currentState === "inChannel") {
                    client.emitter.emit("return", "")
                    return fase(client, key);
                }
                break;

        }
    })
    ws.onopen = () => {
        let data = {
            op: 2,
            d: {
                capabilities: 253,
                token: client.user.token,
                properties: {
                    browser: "Chrome",
                    browser_user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36",
                    browser_version: "97.0.4692.99",
                    device: "",
                    os: "Windows",
                    os_version: "10",
                    system_locale: "en-EN",
                }
            }
        }
        ws.send(JSON.stringify(data))
    }
    ws.onmessage = async (message) => {
        const msg = JSON.parse(message.data.toString())
        switch(msg.t) {

            case "READY":
                emitter.emit("ready", "")

                for(const guild of msg.d.guilds) {
                    client.guilds.set(guild.id, guild)
                    guild.channels.forEach(c => {
                        c.messages = new Map()
                        client.textChannels.set(c.id, c)
                    })
                }
                const channels = (await axios({
                    method: "get",
                    url: "https://discord.com/api/users/@me/channels",
                    headers: {
                        authorization: client.user.token
                    }
                })).data
                for(const channel of channels) {
                    channel.messages = new Map()
                    client.DMChannels.set(channel.id, channel)
                }
                break;
            case "MESSAGE_CREATE":
                if(client.settings.renderEmojis) {
                    const matches = msg.d.content.match(/(<a?)?:\w+:\d{18}>/)
                    if(matches) {
                        const match = matches[0]
                        const id = match.split(":")[2].replace(">", "")
                        const animated = match.split(":")[0] === "<a"
                        const url = `https://cdn.discordapp.com/emojis/${id}.png?size=320`
                        msg.d.content = msg.d.content.replace(/(<a?)?:\w+:(\d{18}>)?/, "\n" + await renderImage(url))
                    }
                }
                if(client.settings.renderImages) {
                    if(msg.d.attachments[0]) {
                        const url = msg.d.attachments[0].url

                        url.endsWith(".png") || url.endsWith(".jpeg") ? msg.d.content = msg.d.content + "\n" + await renderImage(url, true) : null
                    }
                }
                let channel = client.textChannels.get(msg.d.channel_id)
                if(!channel) {
                    channel = client.DMChannels.get(msg.d.channel_id)
 
                    channel.messages.set(msg.d.id, msg.d)
                    client.DMChannels.set(msg.d.channel_id, channel)
                }
                channel.messages.set(msg.d.id, msg.d)
                client.textChannels.set(msg.d.channel_id, channel)
                break;

        }
    }

    setInterval(() => {
        ws.send(JSON.stringify({op:1, d:null}))
    }, 41250);


    
}



module.exports.InitConsole = InitConsole


