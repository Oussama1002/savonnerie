import Database from 'better-sqlite3';
import path from 'path';

// Use your existing database
const dbPath = path.join(process.cwd(), 'my_database.db');
const db = new Database(dbPath, { verbose: console.log });

export default db;
