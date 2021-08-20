import { Server } from 'socket.io';
import {registerLobbyHandlers} from "./handlers/lobby.js"
import {registerLevelHandlers} from "./handlers/level.js";
import {registerPlayerHandlers} from "./handlers/player.js";
import crypto from 'crypto';
import {SessionManager} from "./SessionManager.js";

const io = new Server({
    cors: ['http://localhost:*', 'http://kok.cattlea.com:*'],
    serveClient: false
});

const sessionStore = new SessionManager();
const randomId = () => crypto.randomBytes(8).toString("hex");

// Username middleware
io.use((socket, next) => {
    const sessionID = socket.handshake.auth.sessionID;
    if (sessionID) {
        const session = sessionStore.findSession(sessionID);
        if (session) {
            socket.sessionID = sessionID;
            socket.userID = session.userID;
            socket.username = session.username;
            return next();
        }
    }
    const username = socket.handshake.auth.username;
    if (!username) {
        return next(new Error("invalid username"));
    }

    socket.sessionID = randomId();
    socket.userID = randomId();
    socket.username = username;
    next();
});

// Init the server
const onConnection = async (socket) => {
    // Session manager
    sessionStore.saveSession(socket.sessionID, {
        userID: socket.userID,
        username: socket.username,
        connected: true,
    });

    // emit session details
    socket.emit("session", {
        sessionID: socket.sessionID,
        userID: socket.userID,
    });

    const parameters = {io, socket, sessionStore};
    registerLobbyHandlers(parameters);
    registerLevelHandlers(parameters);
    registerPlayerHandlers(parameters);

    // Broadcast current server version
    const version = process.env.npm_package_version;
    socket.emit('version', {version});
};
io.on("connection", onConnection);

// Heroku likes this part.
io.listen(process.env.PORT || 3000);
