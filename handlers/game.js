export function registerGameHandlers({socket}) {
    const completeGridColumn = async function ({letter}) {
        console.log('complete column', letter);
        socket.broadcast.emit('grid:column-completed', {letter});
    }
    const clearGridColumn = async function ({letter}) {
        console.log('clear column', letter);
        socket.broadcast.emit('grid:column-cleared', {letter});
    }

    socket.on('grid:column-complete', completeGridColumn);
    socket.on('grid:column-clear', clearGridColumn);
}
