import {Player} from "./player.js";

let registeredColumns = {};
export function registerGameHandlers({socket, sessionStore}) {
    const completeGridColumn = async function ({columnLetter, highScore}) {
        const player = Player.getFromSession({socket, sessionStore});
        if (!registeredColumns[columnLetter]) {
            registeredColumns[columnLetter] = {
                high: {},
                low: {}
            };
        }

        const key = highScore ? 'high' : 'low';
        registeredColumns[columnLetter][key][player.userId] = player.username;

        socket.broadcast.emit('grid:column-completed', {columnLetter, player, highScore, registeredColumns});
    }

    socket.on('grid:column-complete', completeGridColumn);
}
