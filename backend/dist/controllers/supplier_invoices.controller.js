"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.create = exports.getAll = void 0;
const sqlite_1 = require("../database/sqlite");
const crypto_1 = require("crypto");
const getAll = (req, res) => {
    const { supplierId } = req.query;
    let query = 'SELECT * FROM supplier_invoices';
    const params = [];
    if (supplierId) {
        query += ' WHERE supplier_id = ?';
        params.push(supplierId);
    }
    query += ' ORDER BY created_at DESC';
    const invoices = sqlite_1.db.prepare(query).all(...params);
    res.json(invoices.map(inv => ({
        id: inv.id,
        supplierId: inv.supplier_id,
        amount: inv.amount,
        status: inv.status,
        itemsCount: inv.items_count,
        createdAt: inv.created_at
    })));
};
exports.getAll = getAll;
const create = (req, res) => {
    const { supplierId, amount, itemsCount } = req.body;
    if (!supplierId || amount === undefined) {
        return res.status(400).json({ error: 'supplierId and amount are required' });
    }
    const id = (0, crypto_1.randomUUID)();
    sqlite_1.db.prepare(`
    INSERT INTO supplier_invoices (id, supplier_id, amount, items_count, status)
    VALUES (?, ?, ?, ?, 'A payer')
  `).run(id, supplierId, amount, itemsCount || 0);
    res.status(201).json({ id });
};
exports.create = create;
const update = (req, res) => {
    const { id } = req.params;
    const { status, amount } = req.body;
    if (status) {
        sqlite_1.db.prepare('UPDATE supplier_invoices SET status = ? WHERE id = ?').run(status, id);
    }
    if (amount !== undefined) {
        sqlite_1.db.prepare('UPDATE supplier_invoices SET amount = ? WHERE id = ?').run(amount, id);
    }
    res.json({ ok: true });
};
exports.update = update;
const remove = (req, res) => {
    const { id } = req.params;
    sqlite_1.db.prepare('DELETE FROM supplier_invoices WHERE id = ?').run(id);
    res.status(204).send();
};
exports.remove = remove;
