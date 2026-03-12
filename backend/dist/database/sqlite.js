"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
// Database lives in the backend folder – data persists across restarts.
// Do NOT delete -wal / -shm on startup: that would wipe recent data (orders, clients, etc.).
const dbPath = path_1.default.join(process.cwd(), 'my_database.db');
// timeout: wait up to 30s if DB is locked (e.g. DB Browser or another process has it open)
exports.db = new better_sqlite3_1.default(dbPath, { timeout: 30000 });
// VERY IMPORTANT
exports.db.pragma('journal_mode = WAL'); // power-loss safe
exports.db.pragma('busy_timeout = 30000'); // same in SQLite terms (ms)
