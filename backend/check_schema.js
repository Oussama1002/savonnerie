const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "src", "database", "pos.db");
const db = new Database(dbPath);

const info = db.pragma("table_info(order_items)");
console.log(info);
