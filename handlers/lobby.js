import db from "../database.js";
import {addPlayerToLobby, connectPlayerToLobby, disconnectPlayerFromLobby} from "./player.js";

async function findOrCreateLobby({lobbyCode, player}) {
    let lobby = db.data.lobbies[lobbyCode];
    if (!lobby) {
        console.log('Create new lobby for player', player, lobbyCode);
        lobby = db.data.lobbies[lobbyCode] = createLobby({lobbyCode});
    }

    // Save the player, this will also trigger a database write action
    return await addPlayerToLobby({lobbyCode, player});
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

    console.log('Lobby level:', lobby.level);
    io.to(lobbyCode).emit('lobby:updated', {lobby});
}

async function connectToLobby({lobbyCode, player, io, socket, sessionStore}) {
    // register the lobby code to the socket
    socket.lobbyCode = lobbyCode;
    // Store the lobbyCode in the session
    sessionStore.saveSession(socket.sessionId, {
        userId: socket.userId,
        username: socket.username,
        connected: true,
        lobbyCode,
    });

    // Retrieve the full lobby data
    const lobby = await findOrCreateLobby({lobbyCode, player});

    // Join room
    socket.join(lobby.code);

    await connectPlayerToLobby({io, socket, lobbyCode, player, sessionStore});

    // Dispatch updated lobby information to the current user
    // io.to(socket.id).emit('lobby:updated', {lobby});

    // Done, write the new data to storage.
    await db.write();

    return lobby;
}

export function registerLobbyHandlers({io, socket, sessionStore}) {
    const {id, username} = socket;
    const player = {id, username};

    const createLobby = async function ({lobbyCode}) {
        console.log('create', player, lobbyCode);
        const lobby = await connectToLobby({lobbyCode, player, io, socket, sessionStore});
        // Send to current user
        io.to(socket.id).emit('lobby:created', {lobby});
        if (lobby.level) {
            console.log('Level already defined in lobby:', lobby.level);
            io.to(socket.id).emit('level:selected', {selectedLevel: lobby.level});
        }
    }

    const joinLobby = async function ({lobbyCode}) {
        console.log('join', player, lobbyCode);
        const lobby = await connectToLobby({lobbyCode, player, io, socket, sessionStore});
        // Send to current user
        io.to(socket.id).emit('lobby:joined', {lobby});
        if (lobby.level) {
            console.log('Level already defined in lobby:', lobby.level);
            io.to(socket.id).emit('level:selected', {selectedLevel: lobby.level});
        }
    }

    const leaveLobby = async function ({lobbyCode}) {
        await disconnectPlayerFromLobby({lobbyCode, player});
        socket.leave(lobbyCode);
        // Send to current user
        io.to(socket.id).emit('lobby:left', {lobby});
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
