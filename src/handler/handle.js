
const term = require("terminal-kit").terminal
const axios = require("axios").default
const FormData = require('form-data')
const got = require("got").default
const fs = require("fs");
const termImage = require("terminal-image");
const { updatePresence } = require("../rpc/rpc");
function idle(client) {
    updatePresence(client, "Idling...")
    term.clear()
    const options = [
        "exit", "guilds", "dms", "settings"
    ]
    client.notifications[0] ? options.push("notifications: " + client.notifications.length) : null
    term.singleLineMenu(options, (err, res) => {
        const option = res.selectedText
        switch (true) {
            case option === "exit":
                process.exit(0)
            case option === "guilds":
                client.currentState = "showGuilds"
                return showGuilds(client)
            case option === "dms":
                return showDMChannels(client)
            case option === "settings":
                return settings(client)
            case option.includes("notifications"):
                return showNotifications(client)
        }
    })
}
function showNotifications(client) {
    const cArray = ["<-"]
    const channelIDS = [""]
    client.notifications.forEach((msg) =>  {
        cArray.push(msg.author.username)
        channelIDS.push(msg.channel_id)
    })
    term.singleRowMenu(cArray, (err, res) => {
        term("\n")
        if (res.selectedIndex === 0) {
            client.currentState = "IDLE"
            return idle(client)

        }
        const index = res.selectedIndex
        const guildID = channelIDS[index]
        client.notifications = client.notifications.filter(a => a.channel_id !== guildID)
        console.log(client.notifications.length)
        client.currentState = "inChannel"
        return viewChannel(client, guildID)


    })

}

function settings(client) {
    updatePresence(client, "Updating settings")
    term.clear()
    const temparray = ["<-"]
    for (let key in client.settings) {
        const value = client.settings[key]
        temparray.push(key + " - " + value)
    }
    term.singleColumnMenu(temparray, (err, res) => {

        if (res.selectedIndex === 0) return idle(client)
        const [key, value] = temparray[res.selectedIndex].split(" - ")
        value === "false" ? client.settings[key] = true : client.settings[key] = false
        if(!isNaN(value)) {
            let current = Number(value)
            if(current > 96) current = 5
            else current += 5
            client.settings[key] = current
        }
        return settings(client)
    })
}
const sendFile = async (client, id, img) => {
    let headers = {
        "Authorization": client.user.token,
    }
    const url = "https://discord.com/api/channels/" + id + "/messages"
    let formdata = new FormData();
    formdata.append("file", fs.createReadStream(img), { filename: img });
    formdata.append("payload_json", `{"content": "","tts":false}`)
    await got.post(url, {
        body: formdata,
        responseType: "json",
        resolveBodyOnly: true,
        throwHttpErrors: false,
        headers
    })
    return
}
const sendMessage = async (client, id, content) => {
    await axios({
        method: "post",
        url: "https://discord.com/api/channels/" + id + "/messages",
        headers: {
            authorization: client.user.token
        },
        data: {
            content: content
        }
    })
    return
}
async function renderImage(uri, file, client) {
    if (!file) {
        return await termImage.buffer(await got(uri).buffer(), { "height": client.settings.emojiSize + "%", "width": client.settings.emojiSize+"%" })

    } else {
        return await termImage.buffer(await got(uri).buffer(), {"height": client.settings.imageSize+"%", width: client.settings.imageSize+"%"})
    }
}
async function fetchMessages(client, id) {
    const url = `https://discord.com/api/channels/${id}/messages?limit=50`
    const data = (await axios({ method: "get", url: url, headers: { authorization: client.user.token } })).data
    let channel = client.textChannels.get(id)
    if (!channel) {
        channel = client.DMChannels.get(id)
        data.reverse().forEach(async m => {
        //     if (client.settings.renderEmojis) {
        //         const matches = m.content.match(/(<a?)?:\w+:\d{18}>/)
        //         console.log(matches)
        //         if (matches) {
        //             const match = matches[0]
        //             const id = match.split(":")[2].replace(">", "")
        //             const animated = match.split(":")[0] === "<a"
        //             const url = `https://cdn.discordapp.com/emojis/${id}.png?size=160`
        //             m.content = m.content.replace(/(<a?)?:\w+:(\d{18}>)?/, "\n" + await renderImage(url))
        //         }
        //     }
            channel.messages.set(m.id, m)
        })
        client.DMChannels.set(id, channel)
        return data.length > 50 ? false : true
    }

    data.reverse().forEach(async m => {
        // if (client.settings.renderEmojis) {
        //     const matches = m.content.match(/(<a?)?:\w+:\d{18}>/)
        //     console.log(matches)
        //     if (matches) {
        //         const match = matches[0]
        //         const id = match.split(":")[2].replace(">", "")
        //         const animated = match.split(":")[0] === "<a"
        //         const url = `https://cdn.discordapp.com/emojis/${id}.png?size=160`
        //         m.content = m.content.replace(/(<a?)?:\w+:(\d{18}>)?/, "\n" + await renderImage(url))
        //     }
        // }
        channel.messages.set(m.id, m)
    })
    client.textChannels.set(id, channel)
    return data.length > 50 ? false : true
}

function viewChannel(client, id, limit = false) {
    
    client.currentChannel = id
    term.clear()
    let channel = client.textChannels.get(id)
    if (!channel) channel = client.DMChannels.get(id)
    updatePresence(client, channel.name ? "Viewing channel " + channel.name : "Viewing channel")
    const messages = channel.messages
    if (messages.size < 50 && !limit) {
        return fetchMessages(client, id).then((a) => {
            return viewChannel(client, id, a)
        })
    }
    [...messages.values()].forEach(async (m) => {
        // if(client.settings.renderEmojis) {
        //     const matches = m.content.match(/(<a?)?:\w+:\d{18}>/)
        //     if(matches) {
        //         const match = matches[0]
        //         const id = match.split(":")[2].replace(">", "")
        //         const animated = match.split(":")[0] === "<a"
        //         const url = `https://cdn.discordapp.com/emojis/${id}.png?size=160`
        //         m.content = m.content.replace(/(<a?)?:\w+:(\d{18}>)?/, "\n" + await renderImage(url))
        //     }
        // }

        if (m.mentions[0]?.id === client.user.id) {
            term(m.author.username + `#${m.author.discriminator}: `)
            term.bgYellow(m.attachments[0] ? m.attachments[0].url + " " + m.content : m.content)
            term("\n")
        } else console.log(m.author.username + `#${m.author.discriminator}: `, m.attachments[0] ? m.attachments[0].url + " " + m.content : m.content)

    })
    term.inputField(null, (err, res) => {
        
        if (client.currentState !== "inChannel") return
        if (!res) return viewChannel(client, id, limit)
        else if (res.startsWith("/file")) {
            term("\n")
            term.fileInput({ baseDir: "../", "autoCompleteHint": true }, (err, res) => {
                return sendFile(client, id, res).then(() => {
                    viewChannel(client, id, limit)
                })
            })
        }
        else {
            sendMessage(client, id, res).then(() => {
                return viewChannel(client, id)
            })
        }
    })
}
function viewGuild(client, ID) {

    term.clear()
    client.currentChannel = null
    const guild = client.guilds.get(ID)
    updatePresence(client, "Viewing guild " + guild.name )
    const channels = guild.channels.filter(c => c.type === 0)
    const temp = ["<-"]
    channels.forEach(c => {
        temp.push(c.name)
    })
    term.singleLineMenu(temp, (err, res) => {
        term("\n")
        if (res.selectedIndex === 0) {
            client.currentState = "showGuilds"
            return showGuilds(client)
        }
        client.currentState = "inChannel"
        return viewChannel(client, channels[res.selectedIndex - 1].id)
    })

}
function showDMChannels(client) {
    updatePresence(client, "Viewing all dms")
    term.clear()
    const channels = client.DMChannels
    const cArray = ["<-"]
    const cArrayIds = [""]
    channels.keys().forEach(c => {
        const channel = channels.get(c)
        cArray.push(channel.name ? channel.name : channel.recipients[0] ? channel.recipients[0].username : "unnamed")
        cArrayIds.push(c)
    })
    term.singleLineMenu(cArray, (err, res) => {
        term("\n")
        if (res.selectedIndex === 0) {
            client.currentState = "IDLE"
            return idle(client)
        }
        const index = res.selectedIndex
        const channelID = cArrayIds[index]
        client.currentState = "inChannel"
        return viewChannel(client, channelID)
    })
}
function showGuilds(client) {
    client.currentChannel = null
    updatePresence(client, "Viewing all guilds")
    term.clear()
    const guilds = client.guilds
    const gArray = ["<-"]
    const gArrayIDS = [""]
    guilds.keys().forEach(k => {
        const guild = guilds.get(k)
        gArray.push(guild.name)
        gArrayIDS.push(k)
    })
    term.singleRowMenu(gArray, (err, res) => {
        term("\n")
        if (res.selectedIndex === 0) {
            client.currentState = "IDLE"
            return idle(client)

        }
        const index = res.selectedIndex
        const guildID = gArrayIDS[index]
        client.currentState = "inGuild"
        return viewGuild(client, guildID)


    })
}
const fase = (client, key = false) => {
    if (key === "LEFT" && client.currentState === "inChannel") {
        term.clear()
        client.currentState = "showGuilds"
        return showGuilds(client)
    }
    const state = client.currentState
    switch (state) {
        case "IDLE":
            return idle(client)
    }
}




module.exports = {
    fase,
    viewChannel,
    renderImage
}
