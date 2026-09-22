#!/usr/bin/env node
/* ============================================================
   Hızlı doğrulama: her modülü ESM olarak ayrıştırır ve göreli
   import yollarının diskte var olduğunu kontrol eder.
   Tarayıcı açmadan yapılabilecek en hızlı güvenlik ağı.

   Kullanım:  npm run check
   ============================================================ */

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
let errors = 0;
let checked = 0;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walk(p, out);
    } else if (name.endsWith(".js") || name.endsWith(".mjs")) {
      out.push(p);
    }
  }
  return out;
}

const files = [...walk(join(ROOT, "src")), ...walk(join(ROOT, "vendor"))];

for (const file of files) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, "utf8");

  /* 1) sözdizimi (ESM olarak) */
  const res = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (res.status !== 0) {
    errors++;
    console.log("✗ sözdizimi  " + rel);
    console.log("   " + String(res.stderr || "").split("\n").slice(0, 4).join("\n   "));
  } else {
    checked++;
  }

  /* 2) göreli import yolları */
  const re = /from\s+["'](\.[^"']+)["']/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const target = resolve(dirname(file), m[1]);
    if (!existsSync(target)) {
      errors++;
      console.log("✗ eksik dosya " + rel + " → " + m[1]);
    }
  }
}

/* 3) index.html içindeki yerel dosyalar */
const html = readFileSync(join(ROOT, "index.html"), "utf8");
for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const url = m[1];
  if (/^(https?:|data:|#)/.test(url)) continue;
  if (!existsSync(resolve(ROOT, url))) {
    errors++;
    console.log("✗ index.html eksik dosya → " + url);
  }
}

/* 4) içerik tutarlılığı: her markanın model yolu + kategori kartları */
const brandsSrc = readFileSync(join(ROOT, "src/data/brands.js"), "utf8");
const catIds = [...brandsSrc.matchAll(/id:\s*"(\w+)",\s*label:/g)].map((m) => m[1]);
for (const id of catIds) {
  const count = (brandsSrc.match(new RegExp("^\\s{6}" + id + ":", "gm")) || []).length;
  if (count === 0) {
    errors++;
    console.log("✗ hiçbir markada '" + id + "' kategorisi yok");
  }
}
console.log("kategori kapsaması: " + catIds.join(", "));

console.log("");
console.log(errors === 0
  ? "✔ " + checked + " modül denetlendi, hata yok."
  : "✗ " + errors + " hata bulundu (" + checked + " dosya denetlendi).");
process.exit(errors === 0 ? 0 : 1);
