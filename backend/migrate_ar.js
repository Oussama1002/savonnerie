const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "my_database.db");
const db = new Database(dbPath);

console.log("Starting migration...");

const tables = [
  { name: "categories", ar: { homme: "رجال", femme: "نساء", maison: "منزل" } },
  {
    name: "services",
    ar: {
      lavage: "غسيل",
      repassage: "كي",
      lavage_repassage: "غسيل وكي",
      dry_clean: "تنظيف جاف",
      express: "سريع",
    },
  },
  {
    name: "articles",
    ar: {
      jacket: "سترة",
      pantalon: "سروال",
      chemise: "قميص",
      robe: "فستان",
      tapis: "سجاد",
      couette: "لحاف",
    },
  },
  { name: "suppliers", ar: { sup1: "سجاد ماستر", sup2: "كلين إكسبرت" } },
  { name: "stock", ar: {} },
  { name: "machines", ar: { m1: "غسالة 1", m2: "غسالة 2", m3: "مجفف 1" } },
];

tables.forEach((table) => {
  try {
    db.prepare(`ALTER TABLE ${table.name} ADD COLUMN name_ar TEXT`).run();
    console.log(`Added name_ar to ${table.name}`);
  } catch (e) {
    if (e.message.includes("duplicate column name")) {
      console.log(`name_ar already exists in ${table.name}`);
    } else {
      console.error(`Error adding column to ${table.name}:`, e.message);
    }
  }

  // Populate initial data
  Object.entries(table.ar).forEach(([id, name_ar]) => {
    try {
      db.prepare(`UPDATE ${table.name} SET name_ar = ? WHERE id = ?`).run(
        name_ar,
        id,
      );
    } catch (e) {
      console.error(`Error updating ${table.name} (id: ${id}):`, e.message);
    }
  });
});

console.log("Migration complete.");
db.close();
