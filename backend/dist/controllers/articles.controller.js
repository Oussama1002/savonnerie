"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.create = exports.getAll = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const sqlite_1 = require("../database/sqlite");
const DEBUG_LOG = path_1.default.resolve(__dirname, '../../../debug-4d2292.log');
function agentLog(payload) {
    try {
        fs_1.default.appendFileSync(DEBUG_LOG, JSON.stringify({ ...payload, timestamp: Date.now() }) + '\n');
    }
    catch (_) { }
}
function toArticle(r) {
    return {
        id: r.id,
        name: r.name,
        name_ar: r.name_ar,
        categoryId: r.category_id,
        image: r.image || '',
        basePrice: r.base_price,
        stock: r.stock ?? undefined,
        supplierCost: r.supplier_cost,
    };
}
const getAll = (_req, res) => {
    const rows = sqlite_1.db.prepare('SELECT * FROM articles ORDER BY category_id, name').all();
    res.json(rows.map(toArticle));
};
exports.getAll = getAll;
const create = (req, res) => {
    try {
        const { id, name, name_ar, categoryId, image, basePrice, stock, supplierCost } = req.body;
        // #region agent log
        agentLog({
            sessionId: '4d2292',
            hypothesisId: 'H2',
            location: 'articles.controller.ts',
            message: 'articles_create_called',
            data: { method: req.method, url: req.originalUrl, id, name, categoryId },
        });
        fetch('http://127.0.0.1:7742/ingest/8891bdea-7168-4cb4-b1af-1b5dde681c4a', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Debug-Session-Id': '4d2292',
            },
            body: JSON.stringify({
                sessionId: '4d2292',
                runId: 'initial',
                hypothesisId: 'H2',
                location: 'articles.controller.ts:32',
                message: 'articles_create_called',
                data: {
                    method: req.method,
                    url: req.originalUrl,
                    id,
                    name,
                    categoryId,
                },
                timestamp: Date.now(),
            }),
        }).catch(() => { });
        // #endregion
        if (!name || !categoryId) {
            return res.status(400).json({ error: 'name and categoryId are required' });
        }
        const articleId = id || (0, crypto_1.randomUUID)();
        sqlite_1.db.prepare(`INSERT INTO articles (id, category_id, name, name_ar, image, base_price, stock, supplier_cost)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(articleId, categoryId, name, name_ar ?? null, image ?? '', basePrice ?? 0, stock ?? null, supplierCost ?? null);
        const row = sqlite_1.db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId);
        res.status(201).json(toArticle(row));
    }
    catch (err) {
        console.error('Article create error:', err);
        res.status(500).json({ error: err?.message || 'Erreur lors de la création de l\'article.' });
    }
};
exports.create = create;
const update = (req, res) => {
    try {
        const { id } = req.params;
        const existing = sqlite_1.db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Article not found' });
        }
        const { name, name_ar, categoryId, image, basePrice, stock, supplierCost } = req.body;
        // #region agent log
        agentLog({
            sessionId: '4d2292',
            hypothesisId: 'H3',
            location: 'articles.controller.ts',
            message: 'articles_update_called',
            data: { method: req.method, url: req.originalUrl, id },
        });
        fetch('http://127.0.0.1:7742/ingest/8891bdea-7168-4cb4-b1af-1b5dde681c4a', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Debug-Session-Id': '4d2292',
            },
            body: JSON.stringify({
                sessionId: '4d2292',
                runId: 'initial',
                hypothesisId: 'H3',
                location: 'articles.controller.ts:76',
                message: 'articles_update_called',
                data: {
                    method: req.method,
                    url: req.originalUrl,
                    id,
                    hasBodyName: typeof name !== 'undefined',
                    hasBodyCategoryId: typeof categoryId !== 'undefined',
                },
                timestamp: Date.now(),
            }),
        }).catch(() => { });
        // #endregion
        const updated = {
            category_id: categoryId ?? existing.category_id,
            name: name ?? existing.name,
            name_ar: name_ar ?? existing.name_ar,
            image: image ?? existing.image,
            base_price: basePrice ?? existing.base_price,
            stock: stock ?? existing.stock,
            supplier_cost: supplierCost ?? existing.supplier_cost,
        };
        sqlite_1.db.prepare(`UPDATE articles
       SET category_id = ?, name = ?, name_ar = ?, image = ?, base_price = ?, stock = ?, supplier_cost = ?
       WHERE id = ?`).run(updated.category_id, updated.name, updated.name_ar, updated.image, updated.base_price, updated.stock, updated.supplier_cost, id);
        const row = sqlite_1.db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
        res.json(toArticle(row));
    }
    catch (err) {
        console.error('Article update error:', err);
        res.status(500).json({ error: err?.message || 'Erreur lors de la mise à jour de l\'article.' });
    }
};
exports.update = update;
const remove = (req, res) => {
    const { id } = req.params;
    const result = sqlite_1.db.prepare('DELETE FROM articles WHERE id = ?').run(id);
    if (result.changes === 0) {
        return res.status(404).json({ error: 'Article not found' });
    }
    res.status(204).send();
};
exports.remove = remove;
