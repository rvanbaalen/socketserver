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
    const username = socket.handshake.auth.username;
    if (!username || username === '') {
        return next(new Error("invalid username"));
    }

    socket.username = username;
    next();
});

io.on("connection", (socket) => {
    const users = [];
    for (let [id, socket] of io.of("/").sockets) {
        const {username} = socket;
        users.push({id, username});
    }
    socket.emit("users", users);
});

io.listen(process.env.PORT || 3000);
