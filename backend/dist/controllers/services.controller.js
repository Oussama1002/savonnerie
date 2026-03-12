"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAll = void 0;
const sqlite_1 = require("../database/sqlite");
const getAll = (_req, res) => {
    const rows = sqlite_1.db.prepare('SELECT * FROM services ORDER BY id').all();
    res.json(rows.map(r => ({ id: r.id, name: r.name, name_ar: r.name_ar || '', multiplier: r.multiplier, image: r.image || '', color: r.color || '' })));
};
exports.getAll = getAll;
