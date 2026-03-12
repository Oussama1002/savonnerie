import Database from 'better-sqlite3';
import path from 'path';

// Database lives in the backend folder – data persists across restarts.
// Do NOT delete -wal / -shm on startup: that would wipe recent data (orders, clients, etc.).
const dbPath = path.join(process.cwd(), 'my_database.db');

// timeout: wait up to 30s if DB is locked (e.g. DB Browser or another process has it open)
export const db = new Database(dbPath, { timeout: 30000 });

// VERY IMPORTANT
db.pragma('journal_mode = WAL'); // power-loss safe
db.pragma('busy_timeout = 30000'); // same in SQLite terms (ms)
