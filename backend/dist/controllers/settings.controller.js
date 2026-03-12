"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAdminWhatsApp = exports.getAdminWhatsApp = exports.set = exports.get = void 0;
const sqlite_1 = require("../database/sqlite");
const ADMIN_WHATSAPP_KEY = 'admin_whatsapp_phone';
const get = (req, res) => {
    const key = req.query.key;
    if (key) {
        const row = sqlite_1.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
        res.json({ key, value: row?.value ?? null });
        return;
    }
    const rows = sqlite_1.db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach((r) => { settings[r.key] = r.value; });
    res.json(settings);
};
exports.get = get;
const set = (req, res) => {
    const { key, value } = req.body;
    if (!key) {
        res.status(400).json({ error: 'key required' });
        return;
    }
    sqlite_1.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value == null ? '' : String(value));
    res.json({ key, value: value ?? '' });
};
exports.set = set;
const getAdminWhatsApp = (_req, res) => {
    const row = sqlite_1.db.prepare('SELECT value FROM settings WHERE key = ?').get(ADMIN_WHATSAPP_KEY);
    res.json({ phone: row?.value ?? '' });
};
exports.getAdminWhatsApp = getAdminWhatsApp;
const setAdminWhatsApp = (req, res) => {
    const { phone } = req.body;
    sqlite_1.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(ADMIN_WHATSAPP_KEY, phone == null ? '' : String(phone));
    res.json({ phone: phone ?? '' });
};
exports.setAdminWhatsApp = setAdminWhatsApp;
