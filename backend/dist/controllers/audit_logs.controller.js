"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = exports.getAll = void 0;
const crypto_1 = require("crypto");
const sqlite_1 = require("../database/sqlite");
const getAll = (_req, res) => {
    const rows = sqlite_1.db
        .prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000')
        .all();
    res.json(rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        action: r.action,
        details: r.details,
        type: r.type,
        orderId: r.order_id,
        timestamp: r.timestamp,
    })));
};
exports.getAll = getAll;
const create = (req, res) => {
    const { type, action, details, userId, userName, orderId } = req.body;
    if (!type || !action) {
        return res
            .status(400)
            .json({ error: 'type and action are required for audit log' });
    }
    const id = (0, crypto_1.randomUUID)();
    sqlite_1.db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, details, type, order_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId || null, userName || null, action, details || null, type, orderId || null);
    const row = sqlite_1.db
        .prepare('SELECT * FROM audit_logs WHERE id = ?')
        .get(id);
    res.status(201).json({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        action: row.action,
        details: row.details,
        type: row.type,
        orderId: row.order_id,
        timestamp: row.timestamp,
    });
};
exports.create = create;
