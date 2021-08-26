import { Server } from 'socket.io';
import {registerLobbyHandlers} from "./handlers/lobby.js"
import {registerLevelHandlers} from "./handlers/level.js";
import {registerPlayerHandlers} from "./handlers/player.js";
import {SessionManager} from "./SessionManager.js";
import {randomId} from "./utilities.js";

const io = new Server({
    cors: ['http://localhost:*', 'http://kok.cattlea.com:*'],
    serveClient: false
});

const sessionStore = new SessionManager();

console.log(sessionStore.findAllSessions());

// Username middleware
io.use((socket, next) => {
    const sessionId = socket.handshake.auth.sessionId;
    if (sessionId) {
        const session = sessionStore.findSession(sessionId);
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

io.use((socket, next) => {
    const sessionId = socket.handshake.auth.sessionId;
    const lobbyCode = socket.lobbyCode;
    if (!lobbyCode && sessionId) {
        const session = sessionStore.findSession(sessionId);
        if (session && session.lobbyCode) {
            console.log('set the lobby code from the session');
            socket.lobbyCode = session.lobbyCode;
        }
    }

    console.log('added lobbyCode to socket', lobbyCode);

    return next();
});

// Init the server
const onConnection = async (socket) => {
    const {lobbyCode} = socket;
    // Session manager
    sessionStore.saveSession(socket.sessionId, {
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

    const parameters = {io, socket, sessionStore};
    registerLobbyHandlers(parameters);
    registerLevelHandlers(parameters);
    registerPlayerHandlers(parameters);

    // Broadcast current server version
    const version = process.env.npm_package_version;
    socket.emit('version', {version});

    // Game business
    socket.on('game:start', () => {
        console.log('RECEIVED GAME START', {lobbyCode});
        //  Pass it on to the clients in the lobby
        io.to(lobbyCode).emit('game:start');
    });
};
io.on("connection", onConnection);

// Heroku likes this part.
io.listen(process.env.PORT || 3000);
