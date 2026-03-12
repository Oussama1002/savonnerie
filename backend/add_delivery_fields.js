const db = require("better-sqlite3")("./src/database/pos.db");

try {
  // Add address to clients
  db.prepare(`ALTER TABLE clients ADD COLUMN address TEXT`).run();
  console.log("Added address column to clients table.");
} catch (e) {
  if (e.message.includes("duplicate column name")) {
    console.log("Column address already exists in clients.");
  } else {
    console.error("Error adding address to clients:", e.message);
  }
}

try {
  // Add is_delivery and delivery_address to orders
  db.prepare(
    `ALTER TABLE orders ADD COLUMN is_delivery INTEGER DEFAULT 0`,
  ).run();
  console.log("Added is_delivery column to orders table.");
} catch (e) {
  if (e.message.includes("duplicate column name")) {
    console.log("Column is_delivery already exists in orders.");
  } else {
    console.error("Error adding is_delivery to orders:", e.message);
  }
}

try {
  db.prepare(`ALTER TABLE orders ADD COLUMN delivery_address TEXT`).run();
  console.log("Added delivery_address column to orders table.");
} catch (e) {
  if (e.message.includes("duplicate column name")) {
    console.log("Column delivery_address already exists in orders.");
  } else {
    console.error("Error adding delivery_address to orders:", e.message);
  }
}

console.log("Migration completed.");
