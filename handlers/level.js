import db from "../database.js";
import {Player} from "./player.js";

async function setLevel(code, level) {
    await db.read();
    db.data.lobbies[code].level = level;
    await db.write();
}

export function registerLevelHandlers({io, socket, sessionStore}) {
    const selectLevel = async function ({selectedLevel}) {
        const player = Player.getFromSession({socket, sessionStore})
        await setLevel(player.lobbyCode, selectedLevel);
        // Send to current user
        io.to(socket.id).emit('level:selected', {selectedLevel});
        // And everyone else
        socket.broadcast.to(player.lobbyCode).emit('level:selected', {selectedLevel});
    }

    socket.on('level:select', selectLevel);
}
