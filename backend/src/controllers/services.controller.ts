import { Request, Response } from 'express';
import { db } from '../database/sqlite';

export const getAll = (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM services ORDER BY id').all() as any[];
  res.json(rows.map(r => ({ id: r.id, name: r.name, name_ar: r.name_ar || '', multiplier: r.multiplier, image: r.image || '', color: r.color || '' })));
};
