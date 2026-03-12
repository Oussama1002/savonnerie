"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.create = exports.getAll = void 0;
const sqlite_1 = require("../database/sqlite");
const crypto_1 = require("crypto");
const getAll = (_req, res) => {
    const rows = sqlite_1.db.prepare('SELECT * FROM suppliers ORDER BY name').all();
    res.json(rows.map(r => ({ id: r.id, name: r.name, name_ar: r.name_ar, logo: r.logo || '', contact: r.contact || '' })));
};
exports.getAll = getAll;
const create = (req, res) => {
    const { name, name_ar, logo, contact } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'name is required' });
    }
    const id = (0, crypto_1.randomUUID)();
    sqlite_1.db.prepare(`INSERT INTO suppliers (id, name, name_ar, logo, contact) VALUES (?, ?, ?, ?, ?)`).run(id, name.trim(), name_ar?.trim() || null, logo?.trim() || '', contact?.trim() || '');
    const row = sqlite_1.db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    return res.status(201).json({ id: row.id, name: row.name, name_ar: row.name_ar, logo: row.logo || '', contact: row.contact || '' });
};
exports.create = create;
const update = (req, res) => {
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ error: 'Supplier id is required' });
    const body = req.body || {};
    const { name, name_ar, logo, contact } = body;
    const existing = sqlite_1.db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    if (!existing)
        return res.status(404).json({ error: 'Supplier not found' });
    if (name !== undefined) {
        if (typeof name !== 'string' || !String(name).trim())
            return res.status(400).json({ error: 'name must be a non-empty string' });
    }
    const next = {
        name: name !== undefined ? String(name).trim() : existing.name,
        name_ar: name_ar !== undefined ? (String(name_ar).trim() || null) : existing.name_ar,
        logo: logo !== undefined ? (String(logo).trim() || '') : (existing.logo || ''),
        contact: contact !== undefined ? (String(contact).trim() || '') : (existing.contact || ''),
    };
    sqlite_1.db.prepare(`UPDATE suppliers SET name = ?, name_ar = ?, logo = ?, contact = ? WHERE id = ?`).run(next.name, next.name_ar, next.logo, next.contact, id);
    const row = sqlite_1.db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    return res.json({ id: row.id, name: row.name, name_ar: row.name_ar, logo: row.logo || '', contact: row.contact || '' });
};
exports.update = update;
const remove = (req, res) => {
    const { id } = req.params;
    const existing = sqlite_1.db.prepare('SELECT id FROM suppliers WHERE id = ?').get(id);
    if (!existing)
        return res.status(404).json({ error: 'Supplier not found' });
    sqlite_1.db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
    return res.status(204).send();
};
exports.remove = remove;
