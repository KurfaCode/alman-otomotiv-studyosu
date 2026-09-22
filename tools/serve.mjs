#!/usr/bin/env node
/* ============================================================
   Geliştirme sunucusu — bilinçli olarak ÖNBELLEKSİZ.

   Neden gerekli: tarayıcılar ES modüllerini (.js) ve model
   dosyalarını (.glb) HTTP önbelleğine alır. `python3 -m http.server`
   önbellek başlığı göndermediği için tarayıcı eski sürümü
   göstermeye devam eder; kod ya da model değiştiği hâlde sahne
   aynı kalır ("Audi değişmedi" görüntüsünün asıl nedeni buydu).

   Bu sunucu her yanıta `Cache-Control: no-store` koyar: kaydet →
   sayfayı yenile, başka hiçbir şey yapmana gerek yok.

   Kullanım:
     node tools/serve.mjs            → http://localhost:8000/
     node tools/serve.mjs 8123       → başka port
     npm run serve -- 8123           → aynısı
   ============================================================ */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argPort = process.argv[2] || process.env.PORT;
const PORT = Math.max(0, parseInt(argPort || "8000", 10)) || 8000;

/* Sahne hangi dosyaları istiyorsa o tür burada tanımlı olmalı:
   yanlış MIME türü .glb'yi bazı tarayıcılarda bozar. */
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".bin": "application/octet-stream",
  ".ktx2": "image/ktx2",
  ".hdr": "application/octet-stream",
  ".mp4": "video/mp4",
};

function send(res, code, headers, body) {
  /* no-store + eski tarayıcılar için Pragma: iki satır da şart. */
  res.writeHead(code, Object.assign({
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
    "Access-Control-Allow-Origin": "*",
  }, headers || {}));
  if (body === undefined) res.end();
  else res.end(body);
}

const server = http.createServer(function (req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, { "Content-Type": "text/plain; charset=utf-8" }, "Yalnızca GET/HEAD");
    return;
  }

  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch (e) {
    send(res, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Bozuk adres");
    return;
  }
  if (rel.endsWith("/")) rel += "index.html";

  const target = path.resolve(ROOT, "." + rel);
  /* Kök dizin dışına çıkan istekleri reddet (../../etc/passwd) */
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    send(res, 403, { "Content-Type": "text/plain; charset=utf-8" }, "Yasak");
    return;
  }

  fs.stat(target, function (err, st) {
    if (err || !st.isFile()) {
      send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Bulunamadı: " + rel);
      return;
    }
    const type = TYPES[path.extname(target).toLowerCase()] || "application/octet-stream";
    const head = { "Content-Type": type, "Content-Length": st.size };
    if (req.method === "HEAD") { send(res, 200, head); return; }
    res.writeHead(200, Object.assign({
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
      "Access-Control-Allow-Origin": "*",
    }, head));
    const stream = fs.createReadStream(target);
    stream.on("error", function () { res.destroy(); });
    stream.pipe(res);
  });
});

server.on("error", function (e) {
  if (e && e.code === "EADDRINUSE") {
    console.error("Port " + PORT + " kullanımda. Başka bir port dene:  node tools/serve.mjs 8123");
  } else {
    console.error("Sunucu başlatılamadı:", e && e.message);
  }
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", function () {
  console.log("Alman Otomotiv Stüdyosu → http://localhost:" + PORT + "/");
  console.log("Önbellek kapalı: kaydettiğin an tarayıcıda yeni sürüm görünür.");
  console.log("Durdurmak için Ctrl+C.");
});
