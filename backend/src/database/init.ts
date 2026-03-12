import fs from 'fs';
import path from 'path';
import { db } from './sqlite';

const MAX_RETRIES = 12;
const RETRY_DELAY_MS = 2000;

function execWithRetry(fn: () => void) {
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            fn();
            return;
        } catch (e: any) {
            if (e?.code === 'SQLITE_BUSY' && i < MAX_RETRIES - 1) {
                const delay = RETRY_DELAY_MS;
                console.warn(`[initDB] Database busy (${i + 1}/${MAX_RETRIES}), retrying in ${delay}ms... Close DB Browser / other Node processes if this repeats.`);
                const start = Date.now();
                while (Date.now() - start < delay) { /* wait */ }
            } else {
                if (e?.code === 'SQLITE_BUSY') {
                    console.error('[initDB] Database still locked after retries. Close any app using my_database.db (DB Browser, other terminal), then delete backend/my_database.db-wal and backend/my_database.db-shm and run again.');
                }
                throw e;
            }
        }
    }
}

export function initDB() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    execWithRetry(() => db.exec(schema));
    // Migration: add phone to users if missing (existing DBs)
    try {
        const info = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
        if (!info.some((c) => c.name === 'phone')) {
            db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
        }
    } catch (_) {
        // ignore
    }
    // Migration: notifications table (for in-app user/admin reminders)
    try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            read_at TEXT
          )
        `);
    } catch (_) {
        // ignore
    }
    // Migration: add customer_phone to orders if missing (existing DBs)
    try {
        const orderCols = db.prepare('PRAGMA table_info(orders)').all() as { name: string }[];
        if (!orderCols.some((c) => c.name === 'customer_phone')) {
            db.exec('ALTER TABLE orders ADD COLUMN customer_phone TEXT');
        }
        // Backfill customer_phone from client phone where order has client_id but no customer_phone
        db.prepare(`
          UPDATE orders SET customer_phone = (SELECT c.phone FROM clients c WHERE c.id = orders.client_id AND trim(c.phone) != '')
          WHERE orders.client_id IS NOT NULL AND (orders.customer_phone IS NULL OR trim(orders.customer_phone) = '')
        `).run();
    } catch (_) {
        // ignore
    }
    // Migration: add caissier_stuck_notified_at to order_items (for 12h caissier reminders)
    try {
        const itemsInfo = db.prepare('PRAGMA table_info(order_items)').all() as { name: string }[];
        if (!itemsInfo.some((c) => c.name === 'caissier_stuck_notified_at')) {
            db.exec('ALTER TABLE order_items ADD COLUMN caissier_stuck_notified_at TEXT');
        }
    } catch (_) {
        // ignore
    }
    // Migration: old_stock_items table (client + placement + article + service + barcode for Suivi)
    try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS old_stock_items (
            id TEXT PRIMARY KEY,
            client_id TEXT NOT NULL,
            placement TEXT,
            article_id TEXT,
            article_name TEXT NOT NULL,
            service_id TEXT,
            barcode TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'prêt',
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (client_id) REFERENCES clients (id)
          )
        `);
        const cols = (db.prepare('PRAGMA table_info(old_stock_items)').all() as { name: string }[]).map(c => c.name);
        if (!cols.includes('article_id')) {
            db.exec('ALTER TABLE old_stock_items ADD COLUMN article_id TEXT');
        }
        if (!cols.includes('service_id')) {
            db.exec('ALTER TABLE old_stock_items ADD COLUMN service_id TEXT');
        }
        if (!cols.includes('status')) {
            db.exec(`ALTER TABLE old_stock_items ADD COLUMN status TEXT NOT NULL DEFAULT 'prêt'`);
        }
    } catch (_) {
        // ignore
    }
    // Ensure Passager client exists for old stock
    try {
        const clientCols = (db.prepare('PRAGMA table_info(clients)').all() as { name: string }[]).map((c: { name: string }) => c.name);
        if (clientCols.includes('notifications_enabled') && clientCols.includes('discount_rate')) {
            db.prepare('INSERT OR IGNORE INTO clients (id, name, phone, address, notifications_enabled, discount_rate) VALUES (?, ?, ?, ?, 1, 0)').run('passager', 'Passager', '', '');
        } else {
            db.prepare('INSERT OR IGNORE INTO clients (id, name, phone, address) VALUES (?, ?, ?, ?)').run('passager', 'Passager', '', '');
        }
    } catch (_) {
        // ignore
    }
    // Migration: add image column to expense_articles for Gestion des Dépenses
    try {
        const info = db.prepare('PRAGMA table_info(expense_articles)').all() as { name: string }[];
        if (!info.some((c) => c.name === 'image')) {
            db.exec('ALTER TABLE expense_articles ADD COLUMN image TEXT');
        }
    } catch (_) {
        // ignore
    }
}
