


function updatePresence(client, state) {
    if(!client.rpc) return
        client.rpc.setActivity({
            "details": "following discord tos!!",
            "state": state,
            "largeImageKey": "dickord",
            "largeImageText": "Himatric/dickord",
            "startTimestamp": client.startupTime,
            // "joinSecret": "a2",
            // "partyId": "b2",
            // "partySize": 1,
            // "partyMax": 2,
            "buttons": [{label: "Install", url: "https://github.com/Himatric/dickord"}]
        }, process.pid)
}

module.exports.updatePresence = updatePresence