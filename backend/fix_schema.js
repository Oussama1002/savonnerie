const db = require("better-sqlite3")("./my_database.db");

const columns = [
  "ALTER TABLE order_items ADD COLUMN status TEXT DEFAULT 'reçu'",
  "ALTER TABLE order_items ADD COLUMN is_supplier_item INTEGER DEFAULT 0",
  "ALTER TABLE order_items ADD COLUMN supplier_id TEXT",
  "ALTER TABLE order_items ADD COLUMN supplier_price REAL",
  "ALTER TABLE order_items ADD COLUMN supplier_status TEXT",
  "ALTER TABLE order_items ADD COLUMN sent_at TEXT",
  "ALTER TABLE order_items ADD COLUMN received_at TEXT",
  "ALTER TABLE order_items ADD COLUMN assigned_to TEXT",
];

for (const sql of columns) {
  try {
    db.exec(sql);
    console.log("OK: " + sql);
  } catch (e) {
    console.log("SKIP (already exists): " + e.message);
  }
}

// Also clean up the test row we inserted earlier
try {
  db.exec("DELETE FROM orders WHERE ticket_id = '2026021603'");
  console.log("Cleaned up test row");
} catch (e) {}

// Verify
const cols = db.prepare("PRAGMA table_info(order_items)").all();
console.log("\nFinal columns:");
cols.forEach((c) => console.log("  " + c.name + " (" + c.type + ")"));

db.close();
