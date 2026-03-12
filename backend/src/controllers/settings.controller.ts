import { Request, Response } from 'express';
import { db } from '../database/sqlite';

const ADMIN_WHATSAPP_KEY = 'admin_whatsapp_phone';

export const get = (req: Request, res: Response) => {
  const key = req.query.key as string;
  if (key) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    res.json({ key, value: row?.value ?? null });
    return;
  }
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  rows.forEach((r) => { settings[r.key] = r.value; });
  res.json(settings);
};

export const set = (req: Request, res: Response) => {
  const { key, value } = req.body as { key: string; value: string };
  if (!key) {
    res.status(400).json({ error: 'key required' });
    return;
  }
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value == null ? '' : String(value));
  res.json({ key, value: value ?? '' });
};

export const getAdminWhatsApp = (_req: Request, res: Response) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(ADMIN_WHATSAPP_KEY) as { value: string } | undefined;
  res.json({ phone: row?.value ?? '' });
};

export const setAdminWhatsApp = (req: Request, res: Response) => {
  const { phone } = req.body as { phone: string };
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(ADMIN_WHATSAPP_KEY, phone == null ? '' : String(phone));
  res.json({ phone: phone ?? '' });
};
