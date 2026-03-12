"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.create = exports.getAll = void 0;
const sqlite_1 = require("../database/sqlite");
function toCategory(r) {
    return { id: r.id, name: r.name, name_ar: r.name_ar, image: r.image || '', color: r.color || '' };
}
const getAll = (_req, res) => {
    const rows = sqlite_1.db.prepare('SELECT * FROM categories ORDER BY id').all();
    res.json(rows.map(toCategory));
};
exports.getAll = getAll;
const create = (req, res) => {
    const { name, name_ar, image, color } = req.body;
    if (!name || name.trim() === '')
        return res.status(400).json({ error: 'name is required' });
    const id = name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const finalId = id || 'cat_' + Date.now();
    const existing = sqlite_1.db.prepare('SELECT id FROM categories WHERE id = ?').get(finalId);
    if (existing)
        return res.status(400).json({ error: 'Category with this id already exists' });
    sqlite_1.db.prepare('INSERT INTO categories (id, name, name_ar, image, color) VALUES (?, ?, ?, ?, ?)').run(finalId, name.trim(), (name_ar || '').trim(), (image || '').trim(), (color || 'bg-gray-500').trim());
    const row = sqlite_1.db.prepare('SELECT * FROM categories WHERE id = ?').get(finalId);
    res.status(201).json(toCategory(row));
};
exports.create = create;
const update = (req, res) => {
    const { id } = req.params;
    const { name, name_ar, image, color } = req.body;
    const existing = sqlite_1.db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing)
        return res.status(404).json({ error: 'Category not found' });
    const newName = typeof name === 'string' && name.trim() !== '' ? name.trim() : existing.name;
    const newNameAr = typeof name_ar === 'string' ? name_ar.trim() : existing.name_ar || '';
    const newImage = typeof image === 'string' ? image.trim() : existing.image || '';
    const newColor = typeof color === 'string' && color.trim() !== ''
        ? color.trim()
        : existing.color || 'bg-gray-500';
    sqlite_1.db.prepare('UPDATE categories SET name = ?, name_ar = ?, image = ?, color = ? WHERE id = ?').run(newName, newNameAr, newImage, newColor, id);
    const row = sqlite_1.db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json(toCategory(row));
};
exports.update = update;
const remove = (req, res) => {
    const { id } = req.params;
    const articleCount = sqlite_1.db.prepare('SELECT COUNT(*) as c FROM articles WHERE category_id = ?').get(id).c;
    if (articleCount > 0)
        return res.status(400).json({ error: 'Cannot delete category that has articles' });
    const result = sqlite_1.db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    if (result.changes === 0)
        return res.status(404).json({ error: 'Category not found' });
    res.status(204).send();
};
exports.remove = remove;
