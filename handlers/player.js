import db from "../database.js";
import {removePlayer} from "./lobby.js";
await db.read();

async function disconnectPlayerFromLobby({lobbyCode, player}) {
    if (!db.data.lobbies[lobbyCode]) {
        return;
    }

    let players = db.data.lobbies[lobbyCode].players;
    db.data.lobbies[lobbyCode].players = removePlayer(players, player);
    await db.write();
}

export function registerPlayerHandlers({io, socket, sessionStore}) {
    const {id, username} = socket;
    const player = {id, username};
    const {lobbyCode} = socket;

    const onDisconnectPlayer = async function () {
        console.log("DISCONNECT", player);
        await disconnectPlayerFromLobby({lobbyCode, player});

        const matchingSockets = await io.in(socket.userID).allSockets();
        console.log('Matching sockets for player ' + socket.username, matchingSockets);
        const isDisconnected = matchingSockets.size === 0;
        if (isDisconnected) {
            // notify other users
            socket.broadcast.emit("player:disconnected", socket.userID);
            // update the connection status of the session
            sessionStore.saveSession(socket.sessionID, {
                userID: socket.userID,
                username: socket.username,
                connected: false,
            });
        }

        // Broadcast selected level to all players
        socket.broadcast.to(socket.lobbyCode).emit('player:disconnected', {player});
    }

    socket.on('disconnect', onDisconnectPlayer);
    io.to(socket.id).emit('player:created', {player});
}
