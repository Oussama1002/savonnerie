import { Request, Response } from 'express';
import { db } from '../database/sqlite';
import { randomUUID } from 'crypto';

export const getAll = (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM suppliers ORDER BY name').all() as any[];
  res.json(rows.map(r => ({ id: r.id, name: r.name, name_ar: r.name_ar, logo: r.logo || '', contact: r.contact || '' })));
};

export const create = (req: Request, res: Response) => {
  const { name, name_ar, logo, contact } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO suppliers (id, name, name_ar, logo, contact) VALUES (?, ?, ?, ?, ?)`
  ).run(id, (name as string).trim(), (name_ar as string)?.trim() || null, (logo as string)?.trim() || '', (contact as string)?.trim() || '');
  const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as any;
  return res.status(201).json({ id: row.id, name: row.name, name_ar: row.name_ar, logo: row.logo || '', contact: row.contact || '' });
};

export const update = (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Supplier id is required' });
  const body = req.body || {};
  const { name, name_ar, logo, contact } = body;
  const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Supplier not found' });
  if (name !== undefined) {
    if (typeof name !== 'string' || !String(name).trim()) return res.status(400).json({ error: 'name must be a non-empty string' });
  }
  const next = {
    name: name !== undefined ? String(name).trim() : existing.name,
    name_ar: name_ar !== undefined ? (String(name_ar).trim() || null) : existing.name_ar,
    logo: logo !== undefined ? (String(logo).trim() || '') : (existing.logo || ''),
    contact: contact !== undefined ? (String(contact).trim() || '') : (existing.contact || ''),
  };
  db.prepare(
    `UPDATE suppliers SET name = ?, name_ar = ?, logo = ?, contact = ? WHERE id = ?`
  ).run(next.name, next.name_ar, next.logo, next.contact, id);
  const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as any;
  return res.json({ id: row.id, name: row.name, name_ar: row.name_ar, logo: row.logo || '', contact: row.contact || '' });
};

export const remove = (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM suppliers WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Supplier not found' });
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
  return res.status(204).send();
};
