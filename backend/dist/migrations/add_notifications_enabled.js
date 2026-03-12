"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite_1 = require("../database/sqlite");
try {
    sqlite_1.db.prepare(`ALTER TABLE clients ADD COLUMN notifications_enabled INTEGER DEFAULT 1`).run();
    console.log('Added notifications_enabled column to clients table');
}
catch (e) {
    if (e.message?.includes('duplicate column')) {
        console.log('notifications_enabled column already exists');
    }
    else {
        throw e;
    }
}
