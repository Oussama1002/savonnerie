"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = exports.create = exports.markAllRead = exports.markRead = exports.getForUser = void 0;
const crypto_1 = require("crypto");
const sqlite_1 = require("../database/sqlite");
const getForUser = (req, res) => {
    const userId = String(req.query.userId || '').trim();
    const rows = userId
        ? sqlite_1.db
            .prepare(`
        SELECT * FROM notifications
        WHERE user_id = ? OR user_id IS NULL
        ORDER BY datetime(created_at) DESC
        LIMIT 50
      `)
            .all(userId)
        : sqlite_1.db
            .prepare(`
        SELECT * FROM notifications
        ORDER BY datetime(created_at) DESC
        LIMIT 50
      `)
            .all();
    res.json(rows.map((r) => ({
        id: r.id,
        userId: r.user_id || null,
        type: r.type,
        title: r.title,
        body: r.body,
        createdAt: r.created_at,
        readAt: r.read_at,
    })));
};
exports.getForUser = getForUser;
const markRead = (req, res) => {
    const { id } = req.params;
    const result = sqlite_1.db
        .prepare("UPDATE notifications SET read_at = datetime('now') WHERE id = ?")
        .run(id);
    if (result.changes === 0) {
        return res.status(404).json({ error: 'Notification not found' });
    }
    res.status(204).send();
};
exports.markRead = markRead;
const markAllRead = (req, res) => {
    const userId = String(req.body.userId || '').trim();
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }
    sqlite_1.db.prepare(`
      UPDATE notifications
      SET read_at = datetime('now')
      WHERE read_at IS NULL AND (user_id = ? OR user_id IS NULL)
    `).run(userId);
    res.status(204).send();
};
exports.markAllRead = markAllRead;
const create = (req, res) => {
    const { userId, type, title, body } = req.body;
    if (!type || !title || !body) {
        return res.status(400).json({ error: 'type, title and body are required' });
    }
    const id = (0, crypto_1.randomUUID)();
    sqlite_1.db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, body)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId || null, type, title, body);
    const row = sqlite_1.db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    res.status(201).json({
        id: row.id,
        userId: row.user_id || null,
        type: row.type,
        title: row.title,
        body: row.body,
        createdAt: row.created_at,
        readAt: row.read_at,
    });
};
exports.create = create;
// Helper to insert a notification (can be reused from other services)
const createNotification = (opts) => {
    const id = (0, crypto_1.randomUUID)();
    sqlite_1.db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, body)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, opts.userId || null, opts.type, opts.title, opts.body);
    return id;
};
exports.createNotification = createNotification;
