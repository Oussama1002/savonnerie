"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.create = exports.getAll = void 0;
const crypto_1 = require("crypto");
const sqlite_1 = require("../database/sqlite");
function toUser(r) {
    return {
        id: r.id,
        name: r.name,
        role: r.role,
        pin: r.pin_code,
        avatar: r.avatar || '👤',
        salary: r.salary ?? 0,
        phone: r.phone ?? '',
    };
}
const getAll = (_req, res) => {
    const rows = sqlite_1.db.prepare('SELECT * FROM users ORDER BY name').all();
    res.json(rows.map(toUser));
};
exports.getAll = getAll;
const create = (req, res) => {
    const { name, role, pin, avatar, salary, phone } = req.body;
    if (!name || name.trim() === '')
        return res.status(400).json({ error: 'name is required' });
    const r = (role === 'admin' ? 'admin' : 'cashier');
    const pinCode = (pin && String(pin).trim()) ? String(pin).trim() : '0000';
    const id = (0, crypto_1.randomUUID)();
    sqlite_1.db.prepare('INSERT INTO users (id, name, role, pin_code, avatar, salary, phone) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, name.trim(), r, pinCode, avatar || '👤', salary ?? 0, (phone != null && String(phone).trim()) ? String(phone).trim() : null);
    const row = sqlite_1.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.status(201).json(toUser(row));
};
exports.create = create;
const update = (req, res) => {
    const { id } = req.params;
    const { name, role, pin, avatar, salary, phone } = req.body;
    const existing = sqlite_1.db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!existing)
        return res.status(404).json({ error: 'User not found' });
    if (name !== undefined)
        sqlite_1.db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), id);
    if (role !== undefined)
        sqlite_1.db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role === 'admin' ? 'admin' : 'cashier', id);
    if (pin !== undefined)
        sqlite_1.db.prepare('UPDATE users SET pin_code = ? WHERE id = ?').run(String(pin).trim(), id);
    if (avatar !== undefined)
        sqlite_1.db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, id);
    if (salary !== undefined)
        sqlite_1.db.prepare('UPDATE users SET salary = ? WHERE id = ?').run(salary, id);
    if (phone !== undefined)
        sqlite_1.db.prepare('UPDATE users SET phone = ? WHERE id = ?').run((phone != null && String(phone).trim()) ? String(phone).trim() : null, id);
    const row = sqlite_1.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json(toUser(row));
};
exports.update = update;
const remove = (req, res) => {
    const { id } = req.params;
    const result = sqlite_1.db.prepare('DELETE FROM users WHERE id = ?').run(id);
    if (result.changes === 0)
        return res.status(404).json({ error: 'User not found' });
    res.status(204).send();
};
exports.remove = remove;
