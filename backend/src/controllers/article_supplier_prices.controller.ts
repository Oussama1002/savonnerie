import { Request, Response } from 'express';
import { db } from '../database/sqlite';

export const getBySupplier = (req: Request, res: Response) => {
  const { supplierId } = req.params;
  const rows = db.prepare(
    'SELECT article_id, price FROM article_supplier_prices WHERE supplier_id = ?'
  ).all(supplierId) as { article_id: string; price: number }[];
  const prices: Record<string, number> = {};
  rows.forEach((r) => { prices[r.article_id] = r.price; });
  res.json({ prices });
};

export const setPricesBulk = (req: Request, res: Response) => {
  const { supplierId } = req.params;
  const { prices } = req.body as { prices: Record<string, number> };
  if (!prices || typeof prices !== 'object') {
    res.status(400).json({ error: 'prices object required' });
    return;
  }
  const stmt = db.prepare(
    `INSERT INTO article_supplier_prices (article_id, supplier_id, price)
     VALUES (?, ?, ?)
     ON CONFLICT(article_id, supplier_id) DO UPDATE SET price = excluded.price`
  );
  for (const [articleId, price] of Object.entries(prices)) {
    if (typeof price === 'number') stmt.run(articleId, supplierId, price);
  }
  res.json({ ok: true });
};
