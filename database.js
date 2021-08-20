import { join, dirname } from 'path'
import { Low, JSONFile } from 'lowdb'
import { fileURLToPath } from 'url'

// Use JSON file for storage
const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, '/storage/db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

await db.read();
db.data = db.data || {
    lobbies: {},
    players: [],
};
await db.write();

export default db;
