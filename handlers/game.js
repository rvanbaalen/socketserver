import {Player} from "./player.js";

export function registerGameHandlers({socket, sessionStore}) {
    const completeGridColumn = async function ({columnLetter}) {
        const player = Player.getFromSession({socket, sessionStore});
        // Send to everyone including current user
        socket.broadcast.to(player.lobbyCode).emit('grid:column-completed', {columnLetter, player, first: true});
    }

    socket.on('grid:column-complete', completeGridColumn);
}
