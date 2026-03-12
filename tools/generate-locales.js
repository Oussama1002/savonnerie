const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const keysPath = path.join(__dirname, "i18n-keys.txt");
const outDir = path.join(repoRoot, "frontend", "locales");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function setNested(obj, dottedKey, value) {
  const parts = dottedKey.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length; i++) {
    const k = parts[i];
    if (i === parts.length - 1) {
      cur[k] = value;
    } else {
      if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
      cur = cur[k];
    }
  }
}

function prettifyLastSegment(key) {
  const last = key.split(".").pop() || key;
  return last.replace(/_/g, " ").trim();
}

const rawKeysText = fs.readFileSync(keysPath, "utf8");
// PowerShell redirection can create UTF-16LE-like output with null bytes.
const cleanedKeysText = rawKeysText.replace(/\u0000/g, "").replace(/\r/g, "");
const keys = cleanedKeysText
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

const fr = {};
const ar = {};

for (const k of keys) {
  const val = prettifyLastSegment(k);
  setNested(fr, k, val);
  setNested(ar, k, val); // will override below
}

// Targeted Arabic overrides requested by user
setNested(ar, "pos.cart_summary", "ملخص");
setNested(ar, "pos.clear_cart", "تفريغ السلة");
setNested(ar, "pos.remove_item", "حذف");
setNested(ar, "stock_client.add_old_stock", "إضافة إلى المخزون القديم");
setNested(ar, "stock_client.old_stock_items_label", "مقال(ات) في المخزون القديم");
setNested(ar, "placement.zones_title", "مناطق التموقع");
setNested(ar, "stock_client.lavage", "تصبين");
setNested(ar, "stock_client.lavage_repassage", "تصبين وكي");

// A few helpful Arabic labels that were previously French in UI
setNested(ar, "pos.cart_empty", "سلتك فارغة");
setNested(ar, "pos.items_selected", "المقالات المختارة");
setNested(ar, "pos.clear_cart", "تفريغ السلة");

// Keep French nicer for the new keys we’ll use
setNested(fr, "stock_client.add_old_stock", "Ajouter en ancien stock");
setNested(fr, "stock_client.old_stock_items_label", "article(s) en ancien stock");
setNested(fr, "placement.zones_title", "Zones d'emplacement");

ensureDir(outDir);
fs.writeFileSync(path.join(outDir, "fr.json"), JSON.stringify(fr, null, 2) + "\n");
fs.writeFileSync(path.join(outDir, "ar.json"), JSON.stringify(ar, null, 2) + "\n");

console.log("Generated locales:", outDir);

