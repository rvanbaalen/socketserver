import db from "../database.js";

function findOrCreateLobby({lobbyCode, player}) {
    let lobby = db.data.lobbies[lobbyCode];
    if (!lobby) {
        console.log('Create new lobby');
        lobby = db.data.lobbies[lobbyCode] = createLobby({owner: player});
    }

    // Save the player.
    lobby = addPlayer({lobbyCode, player});

    return lobby;
}

function createLobby(owner) {
    return {
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: owner.id,
        players: [],
        level: '',
        data: {},
    };
}

function addPlayer({lobbyCode, player}) {
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
        players = removePlayer(players, player);

        // Add the new player ID
        players.push(player);

        db.data.lobbies[lobbyCode].players = players;
    }

    return db.data.lobbies[lobbyCode];
}

export function removePlayer(players, player) {
    return players.filter(storedPlayer => {
        return storedPlayer.username.toLowerCase() !== player.username.toLowerCase();
    });
}

export function getLobby(code) {
    return db.data.lobbies[code];
}

export function registerLobbyHandlers({io, socket}) {
    const createLobby = async function ({lobbyCode}) {
        const {id, username} = socket;
        const player = {id, username};
        const lobby = findOrCreateLobby({lobbyCode, player});

        socket.lobbyCode = lobbyCode;

        // Join room
        socket.join(lobbyCode);

        // Notify everyone except current user
        socket.broadcast.to(lobbyCode).emit("player:connected", player);

        // Notify everyone about new player numbers
        const totalPlayers = lobby.players.length;
        io.in(lobbyCode).emit('player:total', {totalPlayers});

        // Notify only current user about the current level selection
        const selectedLevel = lobby.level || '';
        io.to(socket.id).emit('level:selected', {selectedLevel});

        // Notify current user about lobby data
        io.to(socket.id).emit('lobby:created', {lobby});

        // Done, write the new data to storage.
        await db.write();
    }

    socket.on('lobby:create', createLobby);
}
