-- Mirror of database/schema.sql kept in sync.
-- See that file for detailed comments.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
    ticket_id TEXT PRIMARY KEY,
    client_id TEXT,
    total REAL NOT NULL,
    paid REAL NOT NULL DEFAULT 0,
    pickup_date TEXT,
    status TEXT NOT NULL DEFAULT 'reçu',
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    service TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    width REAL,
    height REAL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(ticket_id) ON DELETE CASCADE
);
