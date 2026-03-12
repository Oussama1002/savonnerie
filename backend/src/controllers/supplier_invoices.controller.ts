import { Request, Response } from 'express';
import { db } from '../database/sqlite';
import { randomUUID } from 'crypto';

export const getAll = (req: Request, res: Response) => {
  const { supplierId } = req.query;
  let query = 'SELECT * FROM supplier_invoices';
  const params: any[] = [];
  
  if (supplierId) {
    query += ' WHERE supplier_id = ?';
    params.push(supplierId);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const invoices = db.prepare(query).all(...params) as any[];
  res.json(invoices.map(inv => ({
    id: inv.id,
    supplierId: inv.supplier_id,
    amount: inv.amount,
    status: inv.status,
    itemsCount: inv.items_count,
    createdAt: inv.created_at
  })));
};

export const create = (req: Request, res: Response) => {
  const { supplierId, amount, itemsCount } = req.body;
  
  if (!supplierId || amount === undefined) {
    return res.status(400).json({ error: 'supplierId and amount are required' });
  }
  
  const id = randomUUID();
  db.prepare(`
    INSERT INTO supplier_invoices (id, supplier_id, amount, items_count, status)
    VALUES (?, ?, ?, ?, 'A payer')
  `).run(id, supplierId, amount, itemsCount || 0);
  
  res.status(201).json({ id });
};

export const update = (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, amount } = req.body;
  
  if (status) {
    db.prepare('UPDATE supplier_invoices SET status = ? WHERE id = ?').run(status, id);
  }
  if (amount !== undefined) {
    db.prepare('UPDATE supplier_invoices SET amount = ? WHERE id = ?').run(amount, id);
  }
  
  res.json({ ok: true });
};

export const remove = (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM supplier_invoices WHERE id = ?').run(id);
  res.status(204).send();
};
