import db from "../database.js";

export class Player {
    static async disconnectFromLobby({player}) {
        let players = db.data.lobbies[player.lobbyCode]?.players;
        if (!players) return;

        players = Player.removeFromCollection(players, player);

        if (players.length === 0) {
            console.log('destroy lobby', player.lobbyCode)
            delete db.data.lobbies[player.lobbyCode];
        } else {
            console.log('set new players', player.lobbyCode)
            db.data.lobbies[player.lobbyCode].players = players;
        }

        await db.write();
    }

    static removeFromCollection(collection, player) {
        return collection.filter(storedPlayer => {
            return storedPlayer.username.toLowerCase() !== player.username.toLowerCase();
        });
    }

    static async addToLobby({lobbyCode, player}) {
        let players = db.data.lobbies[lobbyCode].players;
        let found = false;
        players.forEach(storedPlayer => {
            if (storedPlayer.username.toLowerCase() === player.username.toLowerCase()) {
                found = true;
            }
        });

        if (!found) {
            db.data.lobbies[lobbyCode].players.push(player);
        } else {
            // Remove from collection to store the new ID
            players = Player.removeFromCollection(players, player);

            // Add the new player ID
            players.push(player);

            db.data.lobbies[lobbyCode].players = players;
        }

        await db.write();

        return db.data.lobbies[lobbyCode];
    }

    static getFromSession({socket, sessionStore}) {
        return sessionStore.findSession(socket.sessionId);
    }

    static registerHandlers({io, socket, sessionStore}) {
        const onDisconnectPlayer = async function () {
            const player = Player.getFromSession({socket, sessionStore});
            const matchingSockets = await io.in(socket.userId).allSockets();
            await Player.disconnectFromLobby({player});
            const isDisconnected = matchingSockets.size === 0;
            if (isDisconnected) {
                sessionStore.setValue(socket.sessionId, 'connected', false);
            }

            if (player.lobbyCode) {
                // Only broadcast disconnect if player was actually connected to a lobby
                socket.broadcast.to(player.lobbyCode).emit('player:disconnected', {player});
            }
        }

        const player = Player.getFromSession({socket, sessionStore});
        socket.on('disconnect', onDisconnectPlayer);
        io.to(socket.id).emit('player:created', {player});
    }
}
