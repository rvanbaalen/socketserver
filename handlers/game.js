import {Player} from "./player.js";

export function registerGameHandlers({socket, sessionStore}) {
    const completeGridColumn = async function ({letter}) {
        socket.broadcast.emit('grid:column-completed', {letter});
    }
    const clearGridColumn = async function ({letter}) {
        socket.broadcast.emit('grid:column-cleared', {letter});
    }
    const completeGridColor = async function ({color}) {
        socket.broadcast.emit('grid:color-completed', {color});
    }
    const clearGridColor = async function ({color}) {
        socket.broadcast.emit('grid:color-cleared', {color});
    }

    socket.on('grid:column-complete', completeGridColumn);
    socket.on('grid:column-clear', clearGridColumn);
    socket.on('grid:color-complete', completeGridColor);
    socket.on('grid:color-clear', clearGridColor);
    socket.on('game:new', () => {
        socket.broadcast.emit('game:confirm-new', {player: Player.getFromSession({socket, sessionStore})});
    });
}
