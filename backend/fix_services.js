const Database = require("better-sqlite3");
const db = new Database("my_database.db");

// High-quality laundry service images from Unsplash
const services = [
  {
    id: "lavage",
    image:
      "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?q=80&w=500&auto=format&fit=crop",
  },
  {
    id: "repassage",
    image:
      "https://images.unsplash.com/photo-1489274495757-95c7c837b101?q=80&w=500&auto=format&fit=crop",
  },
  {
    id: "lavage_repassage",
    image:
      "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?q=80&w=500&auto=format&fit=crop",
  },
];

for (const s of services) {
  db.prepare("UPDATE services SET image = ? WHERE id = ?").run(s.image, s.id);
}

// Verify
const rows = db.prepare("SELECT id, name, name_ar, image FROM services").all();
console.log("Updated service images:");
rows.forEach((r) =>
  console.log(`  ${r.id} | ${r.name} | image: ${r.image.substring(0, 60)}...`),
);
