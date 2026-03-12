import { db } from "./sqlite";

export function seedDB() {
  const catCount = (
    db.prepare("SELECT COUNT(*) as c FROM categories").get() as { c: number }
  ).c;
  if (catCount > 0) return;

  console.log("[seed] Seeding reference data...");

  db.prepare(
    `INSERT INTO categories (id, name, name_ar, image, color) VALUES 
    ('homme', 'Homme', 'رجال', 'https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?q=80&w=1470&auto=format&fit=crop', 'bg-blue-500'),
    ('femme', 'Femme', 'نساء', 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=1470&auto=format&fit=crop', 'bg-pink-500'),
    ('maison', 'Maison', 'منزل', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1470&auto=format&fit=crop', 'bg-green-500')`,
  ).run();

  db.prepare(
    `INSERT INTO services (id, name, name_ar, multiplier, image, color) VALUES 
    ('lavage', 'Lavage', 'غسيل', 1, 'https://images.unsplash.com/photo-1545173153-594e220e084d2?q=80&w=500&auto=format&fit=crop', 'text-blue-500'),
    ('repassage', 'Repassage', 'كي', 0.8, 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=500&auto=format&fit=crop', 'text-yellow-500'),
    ('lavage_repassage', 'Mix', 'غسيل وكي', 1.5, 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?q=80&w=500&auto=format&fit=crop', 'text-blue-500')`,
  ).run();

  db.prepare(
    `INSERT INTO users (id, name, role, pin_code, avatar, salary) VALUES 
    ('u1', 'Admin', 'admin', '1234', '🔐', 0),
    ('u2', 'Caissier', 'cashier', '2222', '🧑‍💼', 3000)`,
  ).run();

  db.prepare(
    `INSERT INTO suppliers (id, name, name_ar, logo, contact) VALUES 
    ('sup1', 'Tapis Master', 'سجاد ماستر', 'https://picsum.photos/seed/sup1/100/100', ''),
    ('sup2', 'Clean Expert', 'كلين إكسبرت', 'https://picsum.photos/seed/sup2/100/100', '')`,
  ).run();

  db.prepare(
    `INSERT INTO machines (id, name, name_ar, type, status, capacity) VALUES 
    ('m1', 'Lave-Linge 1', 'غسالة 1', 'washer', 'disponible', '7kg'),
    ('m2', 'Lave-Linge 2', 'غسالة 2', 'washer', 'disponible', '12kg'),
    ('m3', 'Sèche-Linge 1', 'مجفف 1', 'dryer', 'disponible', '15kg')`,
  ).run();

  db.prepare(
    `INSERT INTO articles (id, category_id, name, name_ar, image, base_price) VALUES 
    ('jacket', 'homme', 'Jacket', 'سترة', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=500&auto=format&fit=crop', 40),
    ('pantalon', 'homme', 'Pantalon', 'سروال', 'https://images.unsplash.com/photo-1624371414361-e6e0ea58d38c?q=80&w=500&auto=format&fit=crop', 15),
    ('chemise', 'homme', 'Chemise', 'قميص', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=500&auto=format&fit=crop', 10),
    ('robe', 'femme', 'Robe', 'فستان', 'https://images.unsplash.com/photo-1539008835657-9e8e9680ac95?q=80&w=500&auto=format&fit=crop', 35),
    ('tapis', 'maison', 'Tapis', 'سجاد', 'https://images.unsplash.com/photo-1600166898405-da9535204843?q=80&w=500&auto=format&fit=crop', 100),
    ('couette', 'maison', 'Couette', 'لحاف', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=500&auto=format&fit=crop', 80)`,
  ).run();

  console.log("[seed] Done.");
}
