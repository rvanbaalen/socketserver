import db from "../database.js";
await db.read();

export async function disconnectPlayerFromLobby({player}) {
    if (!db.data.lobbies[player.lobbyCode]) {
        return;
    }

    let players = db.data.lobbies[player.lobbyCode].players;
    players = removePlayerFromCollection(players, player);

    if (players.length === 0) {
        delete db.data.lobbies[player.lobbyCode];
    } else {
        db.data.lobbies[player.lobbyCode].players = players;
    }

    await db.write();
}

export function removePlayerFromCollection(collection, player) {
    return collection.filter(storedPlayer => {
        return storedPlayer.username.toLowerCase() !== player.username.toLowerCase();
    });
}

export async function addPlayerToLobby({lobbyCode, player}) {
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
        players = removePlayerFromCollection(players, player);

        // Add the new player ID
        players.push(player);

        db.data.lobbies[lobbyCode].players = players;
    }

    await db.write();

    return db.data.lobbies[lobbyCode];
}

export function registerPlayerHandlers({io, socket, sessionStore}) {
    const {id, username, lobbyCode} = socket;
    const player = {id, username, lobbyCode};

    const onDisconnectPlayer = async function () {
        const matchingSockets = await io.in(socket.userId).allSockets();
        await disconnectPlayerFromLobby({lobbyCode, player});
        const isDisconnected = matchingSockets.size === 0;
        if (isDisconnected) {
            // update the connection status of the session
            sessionStore.saveSession(socket.sessionId, {
                userId: socket.userId,
                username: socket.username,
                lobbyCode,
                connected: false
            });
        }

        if (socket.lobbyCode) {
            // Only broadcast disconnect if player was actually connected to a lobby
            socket.broadcast.to(socket.lobbyCode).emit('player:disconnected', {player});
        }
    }

    socket.on('disconnect', onDisconnectPlayer);
    io.to(socket.id).emit('player:created', {player});

    console.log('Current session data:', sessionStore.findAllSessions());
}

// When any player connects, this happens
export const connectPlayerToLobby = async function ({io, socket, lobbyCode, player}) {
    // Notify everyone except current user
    socket.broadcast.to(lobbyCode).emit("player:connected", player);
    //await updatePlayerStats({lobbyCode, io, player});
}

export const updatePlayerStats = async function ({lobbyCode, io, player}) {
    if (typeof lobbyCode !== 'string') {
        new Error('No valid lobby code supplied in updatePlayerStats. Received: ' + lobbyCode);
    }

    await db.read();
    const lobby = db.data.lobbies[lobbyCode];

    // Notify everyone about new player numbers
    const totalPlayers = lobby.players.length;
    const data = {
        players: lobby.players.map(p => p.username),
        totalPlayers,
        player
    };

    io.in(lobby.code).emit('player:stats', data);
}
