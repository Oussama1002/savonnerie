const db = require("better-sqlite3")(
  "c:/Users/YASSINE/Downloads/savonnerie-pro-pos/savonnerie-pro-pos/backend/src/database/savonnerie.db",
);

console.log("Creating expense_articles table...");

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS expense_articles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`,
).run();

const articles = [
  { id: "exp_1", name: "Gaz", price: 50 },
  { id: "exp_2", name: "Javel 5L", price: 20 },
  { id: "exp_3", name: "Zif", price: 10 },
];

const insert = db.prepare(
  "INSERT OR IGNORE INTO expense_articles (id, name, price) VALUES (?, ?, ?)",
);

articles.forEach((art) => {
  insert.run(art.id, art.name, art.price);
});

console.log("Done! expense_articles table created and seeded.");
const count = db
  .prepare("SELECT COUNT(*) as total FROM expense_articles")
  .get();
console.log("Total articles count:", count.total);
