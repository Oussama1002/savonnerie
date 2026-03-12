"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.create = exports.getAll = void 0;
const crypto_1 = require("crypto");
const sqlite_1 = require("../database/sqlite");
const getAll = (_req, res) => {
    const rows = sqlite_1.db.prepare('SELECT * FROM clients ORDER BY name').all();
    res.json(rows.map(r => ({ id: r.id, name: r.name, phone: r.phone || '', address: r.address || '', notificationsEnabled: r.notifications_enabled === 1 || r.notifications_enabled === undefined, discountRate: r.discount_rate || 0, note: r.note || '', createdAt: r.created_at })));
};
exports.getAll = getAll;
const create = (req, res) => {
    const { name, phone, address } = req.body;
    if (!name || name.trim() === '')
        return res.status(400).json({ error: 'name is required' });
    const id = (0, crypto_1.randomUUID)();
    sqlite_1.db.prepare('INSERT INTO clients (id, name, phone, address, notifications_enabled, discount_rate) VALUES (?, ?, ?, ?, 1, 0)').run(id, name.trim(), (phone || '').trim(), (address || '').trim());
    const row = sqlite_1.db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    res.status(201).json({ id: row.id, name: row.name, phone: row.phone || '', address: row.address || '', notificationsEnabled: true, discountRate: 0, note: '', createdAt: row.created_at });
};
exports.create = create;
const update = (req, res) => {
    const { id } = req.params;
    const { name, phone, address, notificationsEnabled, discountRate, note } = req.body;
    const existing = sqlite_1.db.prepare('SELECT id FROM clients WHERE id = ?').get(id);
    if (!existing)
        return res.status(404).json({ error: 'Client not found' });
    if (name !== undefined)
        sqlite_1.db.prepare('UPDATE clients SET name = ? WHERE id = ?').run((name ?? '').trim(), id);
    if (phone !== undefined)
        sqlite_1.db.prepare('UPDATE clients SET phone = ? WHERE id = ?').run((phone ?? '').trim(), id);
    if (address !== undefined)
        sqlite_1.db.prepare('UPDATE clients SET address = ? WHERE id = ?').run((address ?? '').trim(), id);
    if (notificationsEnabled !== undefined)
        sqlite_1.db.prepare('UPDATE clients SET notifications_enabled = ? WHERE id = ?').run(notificationsEnabled ? 1 : 0, id);
    if (discountRate !== undefined)
        sqlite_1.db.prepare('UPDATE clients SET discount_rate = ? WHERE id = ?').run(discountRate, id);
    if (note !== undefined)
        sqlite_1.db.prepare('UPDATE clients SET note = ? WHERE id = ?').run(note.trim(), id);
    const row = sqlite_1.db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    res.json({ id: row.id, name: row.name, phone: row.phone || '', address: row.address || '', notificationsEnabled: row.notifications_enabled === 1 || row.notifications_enabled === undefined, discountRate: row.discount_rate || 0, note: row.note || '', createdAt: row.created_at });
};
exports.update = update;
const remove = (req, res) => {
    const { id } = req.params;
    const result = sqlite_1.db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    if (result.changes === 0)
        return res.status(404).json({ error: 'Client not found' });
    res.status(204).send();
};
exports.remove = remove;
