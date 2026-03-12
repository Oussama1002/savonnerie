"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.create = exports.getAll = void 0;
const sqlite_1 = require("../database/sqlite");
// Generate ID: exp_ + timestamp + random
function generateId() {
    return 'exp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
const getAll = (req, res) => {
    try {
        const articles = sqlite_1.db.prepare('SELECT * FROM expense_articles ORDER BY name ASC').all();
        res.json(articles);
    }
    catch (error) {
        console.error('Failed to fetch expense articles:', error);
        res.status(500).json({ error: 'Failed to fetch expense articles', details: error.message });
    }
};
exports.getAll = getAll;
const create = (req, res) => {
    const { name, price, image } = req.body;
    if (!name || price === undefined) {
        return res.status(400).json({ error: 'Name and price are required' });
    }
    try {
        const id = generateId();
        sqlite_1.db.prepare('INSERT INTO expense_articles (id, name, price, image) VALUES (?, ?, ?, ?)').run(id, name, price, image || null);
        const newArticle = sqlite_1.db.prepare('SELECT * FROM expense_articles WHERE id = ?').get(id);
        res.status(201).json(newArticle);
    }
    catch (error) {
        console.error('Failed to create expense article:', error);
        res.status(500).json({ error: 'Failed to create expense article', details: error.message });
    }
};
exports.create = create;
const update = (req, res) => {
    const { id } = req.params;
    const { name, price, image } = req.body;
    if (!name || price === undefined) {
        return res.status(400).json({ error: 'Name and price are required' });
    }
    try {
        const result = sqlite_1.db
            .prepare('UPDATE expense_articles SET name = ?, price = ?, image = ? WHERE id = ?')
            .run(name, price, image || null, id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Expense article not found' });
        }
        const updated = sqlite_1.db.prepare('SELECT * FROM expense_articles WHERE id = ?').get(id);
        res.json(updated);
    }
    catch (error) {
        console.error('Failed to update expense article:', error);
        res.status(500).json({ error: 'Failed to update expense article', details: error.message });
    }
};
exports.update = update;
const remove = (req, res) => {
    const { id } = req.params;
    try {
        const result = sqlite_1.db.prepare('DELETE FROM expense_articles WHERE id = ?').run(id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Expense article not found' });
        }
        res.json({ ok: true });
    }
    catch (error) {
        console.error('Failed to delete expense article:', error);
        res.status(500).json({ error: 'Failed to delete expense article', details: error.message });
    }
};
exports.remove = remove;
