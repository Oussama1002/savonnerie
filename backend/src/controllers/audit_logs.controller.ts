import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../database/sqlite';

export const getAll = (_req: Request, res: Response) => {
  const rows = db
    .prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000')
    .all() as any[];
  res.json(
    rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      action: r.action,
      details: r.details,
      type: r.type,
      orderId: r.order_id,
      timestamp: r.timestamp,
    })),
  );
};

export const create = (req: Request, res: Response) => {
  const { type, action, details, userId, userName, orderId } = req.body as {
    type?: string;
    action?: string;
    details?: string;
    userId?: string;
    userName?: string;
    orderId?: string;
  };

  if (!type || !action) {
    return res
      .status(400)
      .json({ error: 'type and action are required for audit log' });
  }

  const id = randomUUID();
  db.prepare(
    `
      INSERT INTO audit_logs (id, user_id, user_name, action, details, type, order_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    id,
    userId || null,
    userName || null,
    action,
    details || null,
    type,
    orderId || null,
  );

  const row = db
    .prepare('SELECT * FROM audit_logs WHERE id = ?')
    .get(id) as any;

  res.status(201).json({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    action: row.action,
    details: row.details,
    type: row.type,
    orderId: row.order_id,
    timestamp: row.timestamp,
  });
};
