const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "frontend");

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const keys = new Set();
const re = /\bt\(\s*['"]([^'"]+)['"]\s*\)/g;

for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  let m;
  while ((m = re.exec(s))) keys.add(m[1]);
}

process.stdout.write(Array.from(keys).sort().join("\n"));

