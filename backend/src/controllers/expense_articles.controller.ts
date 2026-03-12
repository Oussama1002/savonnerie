import { Request, Response } from 'express';
import { db } from '../database/sqlite';

// Generate ID: exp_ + timestamp + random
function generateId(): string {
  return 'exp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export const getAll = (req: Request, res: Response) => {
  try {
    const articles = db.prepare('SELECT * FROM expense_articles ORDER BY name ASC').all();
    res.json(articles);
  } catch (error: any) {
    console.error('Failed to fetch expense articles:', error);
    res.status(500).json({ error: 'Failed to fetch expense articles', details: error.message });
  }
};

export const create = (req: Request, res: Response) => {
  const { name, price, image } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  try {
    const id = generateId();
    db.prepare('INSERT INTO expense_articles (id, name, price, image) VALUES (?, ?, ?, ?)').run(
      id,
      name,
      price,
      image || null,
    );
    const newArticle = db.prepare('SELECT * FROM expense_articles WHERE id = ?').get(id);
    res.status(201).json(newArticle);
  } catch (error: any) {
    console.error('Failed to create expense article:', error);
    res.status(500).json({ error: 'Failed to create expense article', details: error.message });
  }
};

export const update = (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, price, image } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  try {
    const result = db
      .prepare('UPDATE expense_articles SET name = ?, price = ?, image = ? WHERE id = ?')
      .run(name, price, image || null, id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Expense article not found' });
    }
    const updated = db.prepare('SELECT * FROM expense_articles WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update expense article:', error);
    res.status(500).json({ error: 'Failed to update expense article', details: error.message });
  }
};

export const remove = (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = db.prepare('DELETE FROM expense_articles WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Expense article not found' });
    }
    res.json({ ok: true });
  } catch (error: any) {
    console.error('Failed to delete expense article:', error);
    res.status(500).json({ error: 'Failed to delete expense article', details: error.message });
  }
};
