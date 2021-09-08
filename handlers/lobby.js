import db from "../database.js";
import {Player} from "./player.js";

async function findOrCreateLobby({lobbyCode, player}) {
    let lobby = db.data.lobbies[lobbyCode];
    if (!lobby) {
        db.data.lobbies[lobbyCode] = createLobby({lobbyCode});
    }

    // Save the player, this will also trigger a database write action
    return await Player.addToLobby({lobbyCode, player});
}

function createLobby({lobbyCode}) {
    return {
        createdAt: new Date(),
        updatedAt: new Date(),
        code: lobbyCode,
        state: 'levelSelect',
        players: [],
        level: '',
        data: {},
    };
}

export async function updateLobby({key, value, io, socket}) {
    const {lobbyCode} = socket;
    const lobby = db.data.lobbies[lobbyCode];
    lobby[key] = value;

    db.data.lobbies[lobbyCode] = lobby;
    await db.write();

    io.to(lobbyCode).emit('lobby:updated', {lobby});
}

async function connectToLobby({lobbyCode, player, socket}) {
    // Retrieve the full lobby data
    const lobby = await findOrCreateLobby({lobbyCode, player});

    // Join room
    socket.join(lobby.code);

    socket.broadcast.to(lobbyCode).emit("player:connected", {player});

    // Dispatch updated lobby information to the current user
    // io.to(socket.id).emit('lobby:updated', {lobby});

    // Done, write the new data to storage.
    await db.write();

    return lobby;
}

function addLobbyToPlayerSession({lobbyCode, socket, sessionStore}) {
    sessionStore.setValue(socket.sessionId, 'lobbyCode', lobbyCode);
    return sessionStore.findSession(socket.sessionId);
}

export function registerLobbyHandlers({io, socket, sessionStore}) {

    const joinOrCreateLobby = async ({event, lobbyCode}) => {
        const player = addLobbyToPlayerSession({lobbyCode, sessionStore, socket});
        const lobby = await connectToLobby({lobbyCode, player, io, socket, sessionStore});
        // Send to current user
        io.to(socket.id).emit(`lobby:${event}`, {lobby});
        // if (lobby.level) {
        //     io.to(socket.id).emit('level:selected', {selectedLevel: lobby.level});
        // }
    }

    const createLobby = async function ({lobbyCode}) {
        await joinOrCreateLobby({event: 'created', lobbyCode})
    }

    const joinLobby = async function ({lobbyCode}) {
        await joinOrCreateLobby({event: 'joined', lobbyCode});
    }

    const leaveLobby = async function ({lobbyCode}) {
        const player = addLobbyToPlayerSession({lobbyCode, sessionStore, socket});
        await Player.disconnectFromLobby({player});
        socket.leave(lobbyCode);
        // Send to everyone except current user
        socket.broadcast.to(lobbyCode).emit("player:left", {player});
    }

    const updateLobbyState = async function ({key, value}) {
        await updateLobby({key, value, io, socket});
    }

    socket.on('lobby:create', createLobby);
    socket.on('lobby:join', joinLobby);
    socket.on('lobby:leave', leaveLobby);
    socket.on('lobby:state', updateLobbyState)
}
