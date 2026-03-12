const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(process.cwd(), "my_database.db");
const db = new Database(dbPath, { fileMustExist: true });
const items = db
  .prepare(
    "SELECT id, status, placement FROM order_items WHERE status = 'prêt'",
  )
  .all();
console.log("Items in DB with status prêt:", items);
