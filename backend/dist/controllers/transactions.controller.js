"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAll = void 0;
const sqlite_1 = require("../database/sqlite");
const getAll = (_req, res) => {
    const rows = sqlite_1.db.prepare('SELECT * FROM transactions ORDER BY date DESC').all();
    res.json(rows.map(r => ({
        id: r.id, userId: r.user_id, userName: r.user_name, amount: r.amount,
        type: r.type, date: r.date, note: r.note
    })));
};
exports.getAll = getAll;
