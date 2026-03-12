"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPricesBulk = exports.getBySupplier = void 0;
const sqlite_1 = require("../database/sqlite");
const getBySupplier = (req, res) => {
    const { supplierId } = req.params;
    const rows = sqlite_1.db.prepare('SELECT article_id, price FROM article_supplier_prices WHERE supplier_id = ?').all(supplierId);
    const prices = {};
    rows.forEach((r) => { prices[r.article_id] = r.price; });
    res.json({ prices });
};
exports.getBySupplier = getBySupplier;
const setPricesBulk = (req, res) => {
    const { supplierId } = req.params;
    const { prices } = req.body;
    if (!prices || typeof prices !== 'object') {
        res.status(400).json({ error: 'prices object required' });
        return;
    }
    const stmt = sqlite_1.db.prepare(`INSERT INTO article_supplier_prices (article_id, supplier_id, price)
     VALUES (?, ?, ?)
     ON CONFLICT(article_id, supplier_id) DO UPDATE SET price = excluded.price`);
    for (const [articleId, price] of Object.entries(prices)) {
        if (typeof price === 'number')
            stmt.run(articleId, supplierId, price);
    }
    res.json({ ok: true });
};
exports.setPricesBulk = setPricesBulk;
