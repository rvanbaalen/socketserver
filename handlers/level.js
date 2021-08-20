import db from "../database.js";
await db.read();

async function setLevel(code, level) {
    console.log('set level', code, level);
    db.data.lobbies[code].level = level;
    await db.write();
}

export function registerLevelHandlers({io, socket}) {
    const selectLevel = async function ({selectedLevel}) {
        await setLevel(socket.lobbyCode, selectedLevel);
        // Broadcast selected level to all players
        socket.broadcast.to(socket.lobbyCode).emit('level:selected', {selectedLevel});
    }

    socket.on('level:select', selectLevel);
}
