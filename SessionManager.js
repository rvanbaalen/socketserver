export class SessionManager {
    constructor() {
        this.sessions = new Map();
    }

    findSession(id) {
        return this.sessions.get(id);
    }

    saveSession(id, session) {
        this.sessions.set(id, session);
    }

    findAllSessions() {
        return [...this.sessions.values()];
    }

    setValue(id, key, value) {
        const session = this.sessions.get(id);
        session[key] = value;
        this.saveSession(id, session);

        return this;
    }
}
