"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.create = exports.getAll = void 0;
const sqlite_1 = require("../database/sqlite");
const crypto_1 = require("crypto");
const getAll = (_req, res) => {
    const stock = sqlite_1.db.prepare(`
    SELECT s.*, sup.name as supplier_name 
    FROM stock s 
    LEFT JOIN suppliers sup ON s.supplier_id = sup.id 
    ORDER BY s.name
  `).all();
    res.json(stock.map((item) => ({
        id: item.id,
        name: item.name,
        name_ar: item.name_ar,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        minQuantity: item.min_quantity,
        supplierId: item.supplier_id,
        supplierName: item.supplier_name,
        createdAt: item.created_at
    })));
};
exports.getAll = getAll;
const create = (req, res) => {
    const { name, name_ar, quantity, unitPrice, minQuantity, supplierId } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }
    const id = (0, crypto_1.randomUUID)();
    try {
        const stmt = sqlite_1.db.prepare(`
      INSERT INTO stock (id, name, name_ar, quantity, unit_price, min_quantity, supplier_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, name, name_ar || null, quantity || 0, unitPrice || 0, minQuantity || 5, supplierId || null);
        res.status(201).json({ id, name, name_ar, quantity, unitPrice, minQuantity, supplierId });
    }
    catch (error) {
        console.error('Failed to create stock item:', error);
        res.status(500).json({ error: 'Failed to create stock item' });
    }
};
exports.create = create;
const update = (req, res) => {
    const { id } = req.params;
    const { name, name_ar, quantity, unitPrice, minQuantity, supplierId } = req.body;
    try {
        const stmt = sqlite_1.db.prepare(`
      UPDATE stock 
      SET name = COALESCE(?, name),
          name_ar = COALESCE(?, name_ar),
          quantity = COALESCE(?, quantity),
          unit_price = COALESCE(?, unit_price),
          min_quantity = COALESCE(?, min_quantity),
          supplier_id = COALESCE(?, supplier_id)
      WHERE id = ?
    `);
        const result = stmt.run(name, name_ar, quantity, unitPrice, minQuantity, supplierId, id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Stock item not found' });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Failed to update stock item:', error);
        res.status(500).json({ error: 'Failed to update stock item' });
    }
};
exports.update = update;
const remove = (req, res) => {
    const { id } = req.params;
    try {
        const result = sqlite_1.db.prepare('DELETE FROM stock WHERE id = ?').run(id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Stock item not found' });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Failed to delete stock item:', error);
        res.status(500).json({ error: 'Failed to delete stock item' });
    }
};
exports.remove = remove;
