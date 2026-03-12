"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSupplier = void 0;
const sqlite_1 = require("../database/sqlite");
const updateSupplier = (req, res) => {
    const { id } = req.params;
    const { supplierId, supplierPrice } = req.body;
    sqlite_1.db.prepare(`
    UPDATE order_items 
    SET supplier_id = ?, supplier_price = ?, is_supplier_item = ?
    WHERE id = ?
  `).run(supplierId ?? null, supplierPrice ?? null, supplierId ? 1 : 0, id);
    res.json({ ok: true });
};
exports.updateSupplier = updateSupplier;
