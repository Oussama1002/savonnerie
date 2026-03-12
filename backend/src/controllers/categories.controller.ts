import { Request, Response } from 'express';
import { db } from '../database/sqlite';

function toCategory(r: any) {
  return { id: r.id, name: r.name, name_ar: r.name_ar, image: r.image || '', color: r.color || '' };
}

export const getAll = (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY id').all() as any[];
  res.json(rows.map(toCategory));
};

export const create = (req: Request, res: Response) => {
  const { name, name_ar, image, color } = req.body as { name?: string; name_ar?: string; image?: string; color?: string };
  if (!name || name.trim() === '') return res.status(400).json({ error: 'name is required' });
  const id = name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const finalId = id || 'cat_' + Date.now();
  const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(finalId);
  if (existing) return res.status(400).json({ error: 'Category with this id already exists' });
  db.prepare('INSERT INTO categories (id, name, name_ar, image, color) VALUES (?, ?, ?, ?, ?)').run(
    finalId,
    name.trim(),
    (name_ar || '').trim(),
    (image || '').trim(),
    (color || 'bg-gray-500').trim()
  );
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(finalId) as any;
  res.status(201).json(toCategory(row));
};

export const update = (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, name_ar, image, color } = req.body as {
    name?: string;
    name_ar?: string;
    image?: string;
    color?: string;
  };
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Category not found' });

  const newName = typeof name === 'string' && name.trim() !== '' ? name.trim() : existing.name;
  const newNameAr =
    typeof name_ar === 'string' ? name_ar.trim() : existing.name_ar || '';
  const newImage =
    typeof image === 'string' ? image.trim() : existing.image || '';
  const newColor =
    typeof color === 'string' && color.trim() !== ''
      ? color.trim()
      : existing.color || 'bg-gray-500';

  db.prepare('UPDATE categories SET name = ?, name_ar = ?, image = ?, color = ? WHERE id = ?').run(
    newName,
    newNameAr,
    newImage,
    newColor,
    id,
  );
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as any;
  res.json(toCategory(row));
};

export const remove = (req: Request, res: Response) => {
  const { id } = req.params;
  const articleCount = (db.prepare('SELECT COUNT(*) as c FROM articles WHERE category_id = ?').get(id) as { c: number }).c;
  if (articleCount > 0) return res.status(400).json({ error: 'Cannot delete category that has articles' });
  const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Category not found' });
  res.status(204).send();
};
