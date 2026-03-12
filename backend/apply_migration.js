const Database = require("better-sqlite3");
const path = require("path");

// Database lives in the backend folder as my_database.db
const dbPath = path.join(process.cwd(), "my_database.db");
console.log("Migrating DB at:", dbPath);

try {
  const db = new Database(dbPath, { fileMustExist: true });

  console.log("Adding placement column to order_items...");
  try {
    db.prepare("ALTER TABLE order_items ADD COLUMN placement TEXT").run();
    console.log("Successfully added placement column.");
  } catch (err) {
    if (err.message.includes("duplicate column name")) {
      console.log("Column placement already exists (caught by SQL error).");
    } else {
      throw err;
    }
  }
} catch (error) {
  console.error("Migration failed:", error);
}
