import {Server} from 'socket.io';
import {registerLobbyHandlers} from "./handlers/lobby.js"
import {registerLevelHandlers} from "./handlers/level.js";
import {Player} from "./handlers/player.js";
import {registerGameHandlers} from "./handlers/game.js";
import {SessionManager} from "./SessionManager.js";
import {randomId} from "./utilities.js";

class SocketServer {
    io;
    constructor(io) {
        this.io = io;
        this.sessionStore = new SessionManager();
        this.registerMiddleware();

        io.on("connection", (socket) => {
            this.onConnection(socket);
        });

        // Heroku likes this part.
        io.listen(process.env.PORT || 3000);
    }

    onConnection(socket) {
        const {lobbyCode} = socket;
        // Session manager
        this.sessionStore.saveSession(socket.sessionId, {
            userId: socket.userId,
            username: socket.username,
            connected: true,
            lobbyCode,
        });

        // emit session details
        socket.emit("session", {
            sessionId: socket.sessionId,
            userId: socket.userId,
        });

        const {io, sessionStore} = this;
        const parameters = {io, socket, sessionStore};
        registerLobbyHandlers(parameters);
        registerLevelHandlers(parameters);
        Player.registerHandlers(parameters);
        registerGameHandlers(parameters);

        // Broadcast current server version
        const version = process.env.npm_package_version;
        socket.emit('version', {version});

        // Game business
        socket.on('game:start', () => {
            //  Pass it on to the clients in the lobby
            io.to(socket.lobbyCode).emit('game:start');
        });
    }

    registerMiddleware() {
        const self = this;
        this.io.use((socket, next) => {
            const sessionId = socket.handshake.auth.sessionId;
            if (sessionId) {
                const session = self.sessionStore.findSession(sessionId);
                if (session) {
                    socket.sessionId = sessionId;
                    socket.userId = session.userId;
                    socket.username = session.username;
                    socket.lobbyCode = session.lobbyCode;
                    return next();
                }
            }

            const {username} = socket.handshake.auth;
            if (!username) {
                return next(new Error("invalid username"));
            }

            socket.sessionId = randomId();
            socket.userId = randomId();
            socket.username = username;
            return next();
        });


    }
}

new SocketServer(new Server({
    cors: ['http://localhost:*', 'http://kok.cattlea.com:*'],
    serveClient: false
}));
