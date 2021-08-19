const options = {
    cors: ['http://localhost:*', 'http://kok.cattlea.com:*'],
    serveClient: false
};

const io = require("socket.io")(options);

io.on("connection", socket => {
    console.log('Received a new connection');
});

// Username middleware
io.use((socket, next) => {
    const {username, lobby} = socket.handshake.auth;
    if (!username || username === '') {
        return next(new Error("invalid username"));
    }

    socket.username = username;
    socket.lobby = lobby;
    next();
});

io.on("connection", (socket) => {
    const users = [];
    for (let [id, socket] of io.of("/").sockets) {
        const {username, lobby} = socket;
        users.push({id, username, lobby});
    }
    socket.emit("users", users);
});

io.on("connection", (socket) => {
    // notify existing users
    const {id, username, lobby} = socket;
    socket.to(lobby).emit("user connected", {id, username});
});

io.listen(process.env.PORT || 3000);
