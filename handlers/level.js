import db from "../database.js";

async function setLevel(code, level) {
    await db.read();
    db.data.lobbies[code].level = level;
    await db.write();
}

export function registerLevelHandlers({io, socket}) {
    const selectLevel = async function ({selectedLevel}) {
        await setLevel(socket.lobbyCode, selectedLevel);
        // Send to current user
        io.to(socket.id).emit('level:selected', {selectedLevel});
        // And everyone else
        socket.broadcast.to(socket.lobbyCode).emit('level:selected', {selectedLevel});
    }

    socket.on('level:select', selectLevel);
}
