"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.updateStatus = exports.create = exports.getAll = void 0;
const crypto_1 = require("crypto");
const sqlite_1 = require("../database/sqlite");
const getAll = (_req, res) => {
    const rows = sqlite_1.db.prepare(`
    SELECT os.id,
           os.client_id,
           os.placement,
           os.article_id,
           os.article_name,
           os.service_id,
           os.barcode,
           os.status,
           os.created_at,
           c.name AS client_name
    FROM old_stock_items os
    LEFT JOIN clients c ON c.id = os.client_id
    ORDER BY os.created_at DESC
  `).all();
    res.json(rows.map(r => ({
        id: r.id,
        clientId: r.client_id,
        clientName: r.client_name || (r.client_id === 'passager' ? 'Passager' : ''),
        placement: r.placement || '',
        articleId: r.article_id || null,
        articleName: r.article_name || '',
        serviceId: r.service_id || null,
        barcode: r.barcode || '',
        status: (r.status || 'prêt'),
        createdAt: r.created_at,
    })));
};
exports.getAll = getAll;
const create = (req, res) => {
    const { clientId, placement, articleId, articleName, serviceId, barcode } = req.body;
    const effectiveClientId = (clientId === '' || clientId == null) ? 'passager' : String(clientId).trim();
    if (!articleName?.trim() || !barcode?.trim()) {
        return res.status(400).json({
            error: 'articleName and barcode are required',
        });
    }
    // Ensure "Passager" client exists when that option is used
    if (effectiveClientId === 'passager') {
        const cols = sqlite_1.db.prepare('PRAGMA table_info(clients)').all().map(c => c.name);
        try {
            if (cols.includes('notifications_enabled') && cols.includes('discount_rate')) {
                sqlite_1.db.prepare('INSERT OR IGNORE INTO clients (id, name, phone, address, notifications_enabled, discount_rate) VALUES (?, ?, ?, ?, 1, 0)').run('passager', 'Passager', '', '');
            }
            else {
                sqlite_1.db.prepare('INSERT OR IGNORE INTO clients (id, name, phone, address) VALUES (?, ?, ?, ?)').run('passager', 'Passager', '', '');
            }
        }
        catch (e) {
            console.error('[old_stock] Ensure passager client:', e);
        }
    }
    const existing = sqlite_1.db.prepare('SELECT id FROM clients WHERE id = ?').get(effectiveClientId);
    if (!existing) {
        return res.status(400).json({ error: 'Client non trouvé. Choisissez "Passager" ou un client existant.' });
    }
    const id = (0, crypto_1.randomUUID)();
    try {
        sqlite_1.db.prepare(`
      INSERT INTO old_stock_items (id, client_id, placement, article_id, article_name, service_id, barcode, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, effectiveClientId, (placement || '').trim(), articleId || null, articleName.trim(), serviceId || null, barcode.trim(), 'prêt');
        const row = sqlite_1.db.prepare(`
      SELECT os.id,
             os.client_id,
             os.placement,
             os.article_id,
             os.article_name,
             os.service_id,
             os.barcode,
             os.status,
             os.created_at,
             c.name AS client_name
      FROM old_stock_items os
      LEFT JOIN clients c ON c.id = os.client_id
      WHERE os.id = ?
    `).get(id);
        res.status(201).json({
            id: row.id,
            clientId: row.client_id,
            clientName: row.client_name || (row.client_id === 'passager' ? 'Passager' : ''),
            placement: row.placement || '',
            articleId: row.article_id || null,
            articleName: row.article_name || '',
            serviceId: row.service_id || null,
            barcode: row.barcode || '',
            status: (row.status || 'prêt'),
            createdAt: row.created_at,
        });
    }
    catch (err) {
        console.error('[old_stock] Create failed:', err);
        return res.status(500).json({
            error: err?.message || 'Erreur lors de l\'enregistrement de l\'ancien stock.',
        });
    }
};
exports.create = create;
const updateStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || (status !== 'prêt' && status !== 'livré')) {
        return res.status(400).json({ error: 'Statut invalide pour ancien stock.' });
    }
    const result = sqlite_1.db.prepare('UPDATE old_stock_items SET status = ? WHERE id = ?').run(status, id);
    if (result.changes === 0) {
        return res.status(404).json({ error: 'Old stock item not found' });
    }
    const row = sqlite_1.db.prepare(`
    SELECT os.id,
           os.client_id,
           os.placement,
           os.article_id,
           os.article_name,
           os.service_id,
           os.barcode,
           os.status,
           os.created_at,
           c.name AS client_name
    FROM old_stock_items os
    LEFT JOIN clients c ON c.id = os.client_id
    WHERE os.id = ?
  `).get(id);
    res.json({
        id: row.id,
        clientId: row.client_id,
        clientName: row.client_name || (row.client_id === 'passager' ? 'Passager' : ''),
        placement: row.placement || '',
        articleId: row.article_id || null,
        articleName: row.article_name || '',
        serviceId: row.service_id || null,
        barcode: row.barcode || '',
        status: (row.status || 'prêt'),
        createdAt: row.created_at,
    });
};
exports.updateStatus = updateStatus;
const remove = (req, res) => {
    const { id } = req.params;
    const result = sqlite_1.db.prepare('DELETE FROM old_stock_items WHERE id = ?').run(id);
    if (result.changes === 0) {
        return res.status(404).json({ error: 'Old stock item not found' });
    }
    res.status(204).send();
};
exports.remove = remove;
