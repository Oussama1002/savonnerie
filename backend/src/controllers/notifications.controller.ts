import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../database/sqlite';

export type NotificationType =
  | 'client_reminder'
  | 'supplier_reminder'
  | 'article_reminder'
  | 'salary_reminder'
  | 'withdrawal_reminder'
  | 'expense_notification';

export const getForUser = (req: Request, res: Response) => {
  const userId = String(req.query.userId || '').trim();

  const rows = userId
    ? db
        .prepare(
          `
        SELECT * FROM notifications
        WHERE user_id = ? OR user_id IS NULL
        ORDER BY datetime(created_at) DESC
        LIMIT 50
      `,
        )
        .all(userId)
    : db
        .prepare(
          `
        SELECT * FROM notifications
        ORDER BY datetime(created_at) DESC
        LIMIT 50
      `,
        )
        .all();

  res.json(
    (rows as any[]).map((r) => ({
      id: r.id,
      userId: r.user_id || null,
      type: r.type as NotificationType,
      title: r.title,
      body: r.body,
      createdAt: r.created_at,
      readAt: r.read_at,
    })),
  );
};

export const markRead = (req: Request, res: Response) => {
  const { id } = req.params;
  const result = db
    .prepare("UPDATE notifications SET read_at = datetime('now') WHERE id = ?")
    .run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  res.status(204).send();
};

export const markAllRead = (req: Request, res: Response) => {
  const userId = String(req.body.userId || '').trim();
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  db.prepare(
    `
      UPDATE notifications
      SET read_at = datetime('now')
      WHERE read_at IS NULL AND (user_id = ? OR user_id IS NULL)
    `,
  ).run(userId);
  res.status(204).send();
};

export const create = (req: Request, res: Response) => {
  const { userId, type, title, body } = req.body as {
    userId?: string | null;
    type?: NotificationType;
    title?: string;
    body?: string;
  };

  if (!type || !title || !body) {
    return res.status(400).json({ error: 'type, title and body are required' });
  }

  const id = randomUUID();
  db.prepare(
    `
    INSERT INTO notifications (id, user_id, type, title, body)
    VALUES (?, ?, ?, ?, ?)
  `,
  ).run(id, userId || null, type, title, body);

  const row = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id) as any;

  res.status(201).json({
    id: row.id,
    userId: row.user_id || null,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
  });
};

// Helper to insert a notification (can be reused from other services)
export const createNotification = (opts: {
  userId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
}) => {
  const id = randomUUID();
  db.prepare(
    `
    INSERT INTO notifications (id, user_id, type, title, body)
    VALUES (?, ?, ?, ?, ?)
  `,
  ).run(id, opts.userId || null, opts.type, opts.title, opts.body);
  return id;
};

