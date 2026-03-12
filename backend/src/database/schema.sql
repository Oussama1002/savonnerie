-- ===============================
-- SAVONNERIE / BLANCHISSERIE POS
-- Full SQLite Database Schema
-- ===============================

PRAGMA foreign_keys = ON;

-- ===============================
-- 1. USERS (Caissiers / Admin)
-- ===============================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'cashier')) NOT NULL DEFAULT 'cashier',
    pin_code TEXT NOT NULL,
    avatar TEXT,
    salary REAL DEFAULT 0,
    phone TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ===============================
-- 2. CLIENTS
-- ===============================
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ===============================
-- 3. CATEGORIES (Homme / Femme / Maison / Produits)
-- ===============================
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    image TEXT,
    color TEXT
);

-- ===============================
-- 4. ARTICLES (Clothing types: Veste, Hoodie, Pantalon, etc.)
-- ===============================
CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    name_ar TEXT,
    image TEXT,
    base_price REAL NOT NULL DEFAULT 0,
    stock INTEGER,
    supplier_cost REAL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories (id)
);

-- ===============================
-- 5. SERVICES (Lavage, Repassage, Mix, Dry Clean, Express)
-- ===============================
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    multiplier REAL NOT NULL DEFAULT 1,
    image TEXT,
    color TEXT
);

-- ===============================
-- 6. SUPPLIERS
-- ===============================
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    logo TEXT,
    contact TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ===============================
-- 7. STOCK (Internal Products / Consumables)
-- ===============================
CREATE TABLE IF NOT EXISTS stock (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit_price REAL DEFAULT 0,
    min_quantity INTEGER DEFAULT 5,
    supplier_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
);

-- ===============================
-- 8. ORDERS (Tickets)
-- ===============================
CREATE TABLE IF NOT EXISTS orders (
    ticket_id TEXT PRIMARY KEY,
    client_id TEXT,
    total REAL NOT NULL,
    paid REAL NOT NULL DEFAULT 0,
    pickup_date TEXT,
    status TEXT NOT NULL DEFAULT 'reçu',
    payment_mode TEXT CHECK (
        payment_mode IN ('place', 'avance', 'credit')
    ),
    customer_phone TEXT,
    is_delivery INTEGER DEFAULT 0,
    delivery_address TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients (id)
);

-- ===============================
-- 8. ORDER ITEMS
-- ===============================
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
    status TEXT DEFAULT 'reçu',
    is_supplier_item INTEGER DEFAULT 0,
    supplier_id TEXT,
    supplier_price REAL,
    supplier_status TEXT,
    sent_at TEXT,
    received_at TEXT,
    assigned_to TEXT,
    barcode TEXT,
    placement TEXT,
    status_updated_at TEXT DEFAULT (datetime('now')),
    client_notified_at TEXT,
    delayed_notified_at TEXT,
    caissier_stuck_notified_at TEXT,
    FOREIGN KEY (order_id) REFERENCES orders (ticket_id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
);

-- ===============================
-- 9. PAYMENTS
-- ===============================
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    method TEXT CHECK (
        method IN (
            'cash',
            'card',
            'mobile',
            'place',
            'avance',
            'credit'
        )
    ) NOT NULL,
    amount REAL NOT NULL,
    paid_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (order_id) REFERENCES orders (ticket_id)
);

-- ===============================
-- 10. TRANSACTIONS (Withdrawals, salary, expenses)
-- ===============================
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT,
    amount REAL NOT NULL,
    type TEXT CHECK (
        type IN (
            'withdrawal',
            'salary_payment',
            'expense'
        )
    ) NOT NULL,
    date TEXT NOT NULL,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- ===============================
-- 11. SUPPLIER INVOICES
-- ===============================
CREATE TABLE IF NOT EXISTS supplier_invoices (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT CHECK (status IN ('A payer', 'Payé')) NOT NULL DEFAULT 'A payer',
    items_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
);

-- ===============================
-- 12. MACHINES (Lave-linge, Sèche-linge)
-- ===============================
CREATE TABLE IF NOT EXISTS machines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    type TEXT CHECK (type IN ('washer', 'dryer')) NOT NULL,
    status TEXT CHECK (
        status IN (
            'disponible',
            'en_cours',
            'maintenance',
            'panne',
            'terminé'
        )
    ) DEFAULT 'disponible',
    capacity TEXT,
    time_remaining INTEGER,
    program TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ===============================
-- 13. AUDIT LOGS
-- ===============================
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    action TEXT NOT NULL,
    details TEXT,
    type TEXT CHECK (
        type IN (
            'ORDER',
            'PAYMENT',
            'INVENTORY',
            'USER',
            'SUPPLIER',
            'SYSTEM',
            'CLIENT'
        )
    ) NOT NULL,
    order_id TEXT,
    timestamp TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- ===============================
-- 14. EXPENSE ARTICLES
-- ===============================
CREATE TABLE IF NOT EXISTS expense_articles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ===============================
-- 14. SETTINGS (Key-value config)
-- ===============================
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- ===============================
-- 15. ARTICLE SUPPLIER PRICES (price per article per fournisseur)
-- ===============================
CREATE TABLE IF NOT EXISTS article_supplier_prices (
    article_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (article_id, supplier_id),
    FOREIGN KEY (article_id) REFERENCES articles (id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
);