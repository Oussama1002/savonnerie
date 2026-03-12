"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStatus = exports.deleteMachine = exports.create = exports.getAll = void 0;
const sqlite_1 = require("../database/sqlite");
const uuid_1 = require("uuid");
const getAll = (_req, res) => {
    const rows = sqlite_1.db.prepare('SELECT * FROM machines ORDER BY name').all();
    res.json(rows.map(r => ({
        id: r.id,
        name: r.name,
        name_ar: r.name_ar,
        type: r.type,
        status: r.status || 'disponible',
        capacity: r.capacity,
        timeRemaining: r.time_remaining,
        program: r.program
    })));
};
exports.getAll = getAll;
const create = (req, res) => {
    const { name, name_ar, type, capacity } = req.body;
    if (!name || !type) {
        res.status(400).json({ error: 'Name and type are required' });
        return;
    }
    try {
        const id = (0, uuid_1.v4)();
        const insert = sqlite_1.db.prepare(`
      INSERT INTO machines (id, name, name_ar, type, capacity, status)
      VALUES (?, ?, ?, ?, ?, 'disponible')
    `);
        insert.run(id, name, name_ar || '', type, capacity || '10kg');
        res.status(201).json({ id, name, name_ar, type, capacity, status: 'disponible' });
    }
    catch (error) {
        console.error('CREATE ERROR:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.create = create;
const deleteMachine = (req, res) => {
    const { id } = req.params;
    try {
        const del = sqlite_1.db.prepare('DELETE FROM machines WHERE id = ?');
        del.run(id);
        res.status(204).send();
    }
    catch (error) {
        console.error('DELETE ERROR:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.deleteMachine = deleteMachine;
const updateStatus = (req, res) => {
    const { id } = req.params;
    const { status, timeRemaining, program } = req.body;
    try {
        const update = sqlite_1.db.prepare(`
      UPDATE machines 
      SET status = ?, time_remaining = ?, program = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
        update.run(status, timeRemaining || 0, program || '', id);
        res.json({ id, status, timeRemaining, program });
    }
    catch (error) {
        console.error('UPDATE ERROR:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.updateStatus = updateStatus;
