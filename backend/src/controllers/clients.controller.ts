import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../database/sqlite';

export const getAll = (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM clients ORDER BY name').all() as any[];
  res.json(rows.map(r => ({ id: r.id, name: r.name, phone: r.phone || '', address: r.address || '', notificationsEnabled: r.notifications_enabled === 1 || r.notifications_enabled === undefined, discountRate: r.discount_rate || 0, note: r.note || '', createdAt: r.created_at })));
};

export const create = (req: Request, res: Response) => {
  const { name, phone, address } = req.body as { name?: string; phone?: string; address?: string };
  if (!name || name.trim() === '') return res.status(400).json({ error: 'name is required' });
  const id = randomUUID();
  db.prepare('INSERT INTO clients (id, name, phone, address, notifications_enabled, discount_rate) VALUES (?, ?, ?, ?, 1, 0)').run(id, name.trim(), (phone || '').trim(), (address || '').trim());
  const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as any;
  res.status(201).json({ id: row.id, name: row.name, phone: row.phone || '', address: row.address || '', notificationsEnabled: true, discountRate: 0, note: '', createdAt: row.created_at });
};

export const update = (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, phone, address, notificationsEnabled, discountRate, note } = req.body as { name?: string; phone?: string; address?: string; notificationsEnabled?: boolean; discountRate?: number; note?: string };
  const existing = db.prepare('SELECT id FROM clients WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Client not found' });
  if (name !== undefined) db.prepare('UPDATE clients SET name = ? WHERE id = ?').run((name ?? '').trim(), id);
  if (phone !== undefined) db.prepare('UPDATE clients SET phone = ? WHERE id = ?').run((phone ?? '').trim(), id);
  if (address !== undefined) db.prepare('UPDATE clients SET address = ? WHERE id = ?').run((address ?? '').trim(), id);
  if (notificationsEnabled !== undefined) db.prepare('UPDATE clients SET notifications_enabled = ? WHERE id = ?').run(notificationsEnabled ? 1 : 0, id);
  if (discountRate !== undefined) db.prepare('UPDATE clients SET discount_rate = ? WHERE id = ?').run(discountRate, id);
  if (note !== undefined) db.prepare('UPDATE clients SET note = ? WHERE id = ?').run(note.trim(), id);
  const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as any;
  res.json({ id: row.id, name: row.name, phone: row.phone || '', address: row.address || '', notificationsEnabled: row.notifications_enabled === 1 || row.notifications_enabled === undefined, discountRate: row.discount_rate || 0, note: row.note || '', createdAt: row.created_at });
};

export const remove = (req: Request, res: Response) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Client not found' });
  res.status(204).send();
};
