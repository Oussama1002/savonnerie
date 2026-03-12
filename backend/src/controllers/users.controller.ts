import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../database/sqlite';

function toUser(r: any) {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    pin: r.pin_code,
    avatar: r.avatar || '👤',
    salary: r.salary ?? 0,
    phone: r.phone ?? '',
  };
}

export const getAll = (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM users ORDER BY name').all() as any[];
  res.json(rows.map(toUser));
};

export const create = (req: Request, res: Response) => {
  const { name, role, pin, avatar, salary, phone } = req.body as { name?: string; role?: string; pin?: string; avatar?: string; salary?: number; phone?: string };
  if (!name || name.trim() === '') return res.status(400).json({ error: 'name is required' });
  const r = (role === 'admin' ? 'admin' : 'cashier') as 'admin' | 'cashier';
  const pinCode = (pin && String(pin).trim()) ? String(pin).trim() : '0000';
  const id = randomUUID();
  db.prepare(
    'INSERT INTO users (id, name, role, pin_code, avatar, salary, phone) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name.trim(), r, pinCode, avatar || '👤', salary ?? 0, (phone != null && String(phone).trim()) ? String(phone).trim() : null);
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  res.status(201).json(toUser(row));
};

export const update = (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, role, pin, avatar, salary, phone } = req.body as { name?: string; role?: string; pin?: string; avatar?: string; salary?: number; phone?: string };
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  if (name !== undefined) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), id);
  if (role !== undefined) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role === 'admin' ? 'admin' : 'cashier', id);
  if (pin !== undefined) db.prepare('UPDATE users SET pin_code = ? WHERE id = ?').run(String(pin).trim(), id);
  if (avatar !== undefined) db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, id);
  if (salary !== undefined) db.prepare('UPDATE users SET salary = ? WHERE id = ?').run(salary, id);
  if (phone !== undefined) db.prepare('UPDATE users SET phone = ? WHERE id = ?').run((phone != null && String(phone).trim()) ? String(phone).trim() : null, id);
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  res.json(toUser(row));
};

export const remove = (req: Request, res: Response) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.status(204).send();
};
