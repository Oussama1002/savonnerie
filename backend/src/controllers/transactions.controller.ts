import { Request, Response } from 'express';
import { db } from '../database/sqlite';

export const getAll = (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM transactions ORDER BY date DESC').all() as any[];
  res.json(rows.map(r => ({
    id: r.id, userId: r.user_id, userName: r.user_name, amount: r.amount,
    type: r.type, date: r.date, note: r.note
  })));
};
