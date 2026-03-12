const Database = require("better-sqlite3");
const path = require("path");

// Database lives in the backend folder as my_database.db
const dbPath = path.join(process.cwd(), "my_database.db");
console.log("Opening DB at:", dbPath);

try {
  const db = new Database(dbPath, { fileMustExist: true });

  console.log("Tables:");
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all();
  console.log("Found tables:", tables.map((t) => t.name).join(", "));

  console.log("Columns in order_items:");
  const columns = db.pragma("table_info(order_items)");
  const columnNames = columns.map((c) => c.name);
  console.log("Found columns:", columnNames.join(", "));

  if (!columnNames.includes("placement")) {
    console.log("Result: PLACEMENT COLUMN IS MISSING!");
  } else {
    console.log("Result: PLACEMENT COLUMN EXISTS!");
  }
} catch (error) {
  console.error("Error opening DB:", error);
}
