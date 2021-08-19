const options = {
    cors: ['http://localhost:*', 'http://kok.cattlea.com:*'],
    serveClient: false
};

const io = require("socket.io")(options);

io.on("connection", socket => {
    console.log('Received a new connection');
});

io.listen(3000);
