import {Player} from "./player.js";

export function registerGameHandlers({io, socket, sessionStore}) {
    const completeGridColumn = async function ({columnLetter}) {
        const player = Player.getFromSession({socket, sessionStore});
        // Send to everyone including current user
        io.to(socket.lobbyCode).emit('grid:column-completed', {columnLetter, player, first: true});
    }

    socket.on('grid:column-complete', completeGridColumn);
}
