#!/usr/bin/env node
/* ============================================================
   GLB tekerlek analizi. Optimized GLB'lerde (meshopt + quantization)
   POSITION accessor min/max kırpılmış olur; kutular DEKODE edilmiş
   pozisyonlardan hesaplanır — tarayıcıda ne görünüyorsa bu da o.

   Kullanım:
     node tools/analyze-wheels.mjs models/audi.glb
     node tools/analyze-wheels.mjs audi.glb --all
   ============================================================ */
import * as THREE from "../vendor/three/three.module.js";
import { GLTFLoader } from "../vendor/three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "../vendor/three/addons/libs/meshopt_decoder.module.js";
import fs from "node:fs";

/* Node'da GLTFLoader'ın FileLoader'ı tarayıcı API'leri ister: polyfill */
if (typeof globalThis.self === "undefined") globalThis.self = globalThis;
if (typeof globalThis.ProgressEvent === "undefined") {
  globalThis.ProgressEvent = class ProgressEvent {
    constructor(type, init) { this.type = type; Object.assign(this, init || {}); }
  };
}
if (typeof globalThis.document === "undefined") {
  globalThis.document = { createElementNS: function () { return { style: {} }; } };
}
if (typeof globalThis.Image === "undefined") {
  /* dokular decode edilemez; kutu analizi için gerekmez */
  globalThis.Image = class Image { set src(_) { setImmediate(() => this.onerror && this.onerror(new Error("Node'ta görsel okunmaz"))); } };
}
if (typeof globalThis.URL === "undefined" || !globalThis.URL.createObjectURL) {
  const orig = globalThis.URL;
  globalThis.URL = class extends orig {
    static createObjectURL() { return "data:,"; }
    static revokeObjectURL() { }
  };
}

const file = process.argv[2];
const wantAll = process.argv.indexOf("--all") >= 0;
if (!file) { console.error("kullanım: node tools/analyze-wheels.mjs <dosya.glb> [--all]"); process.exit(1); }

const loader = new GLTFLoader();
try { loader.setMeshoptDecoder(MeshoptDecoder); } catch (e) { }

/* Node'ta WebP dekode yok: GLB'nin JSON parçasından EXT_texture_webp
   uzantısını söker, dokular bilinmeyen ama kutu analizi için zararsız olur.
   (Bin chunk'a dokunulmaz; sadece json chunk yeniden yazılır.) */
function patchGlb(buffer) {
  const jl = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.slice(20, 20 + jl).toString("utf8"));
  json.extensionsUsed = (json.extensionsUsed || []).filter(e => e !== "EXT_texture_webp");
  if (json.extensionsRequired) json.extensionsRequired = json.extensionsRequired.filter(e => e !== "EXT_texture_webp");
  /* webp eklentisi sökülünce texture.source kaybolmasın: yedek resmi üst alana taşı */
  (json.textures || []).forEach(function (t) {
    const webp = t.extensions && t.extensions.EXT_texture_webp;
    if (webp && t.source === undefined && json.images && json.images[webp.source]) {
      t.source = webp.source;
    }
    if (t.extensions) delete t.extensions.EXT_texture_webp;
  });
  let js = Buffer.from(JSON.stringify(json), "utf8");
  while (js.length % 4 !== 0) js = Buffer.concat([js, Buffer.from(" ")]);
  const rest = buffer.slice(20 + jl);
  const binLen = rest.readUInt32LE(0);
  const bin = rest.slice(8);   // chunk başlığı (len+type) atlanır
  const header = Buffer.alloc(12);
  buffer.copy(header, 0, 0, 12);
  header.writeUInt32LE(12 + 8 + js.length + bin.length, 8);
  const jsonChunk = Buffer.alloc(8 + js.length);
  jsonChunk.writeUInt32LE(js.length, 0);
  jsonChunk.write("JSON", 4);
  js.copy(jsonChunk, 8);
  const binChunk = Buffer.alloc(8 + bin.length);
  binChunk.writeUInt32LE(bin.length, 0);
  binChunk.write("BIN\0", 4);
  bin.copy(binChunk, 8);
  return Buffer.concat([header, jsonChunk, binChunk]);
}

const data = patchGlb(fs.readFileSync(file));
const url = "data:application/octet-stream;base64," + data.toString("base64");

loader.load(url, function (gltf) {
  const root = gltf.scene;
  root.updateMatrixWorld(true);

  // dünya ölçeğini nötrle: kutu oranları korunur
  const boxAll = new THREE.Box3().setFromObject(root);
  const sizeAll = boxAll.getSize(new THREE.Vector3());
  const longest = Math.max(sizeAll.x, sizeAll.z, 1e-6);
  const s = 4.6 / longest;

  console.log("dosya      :", file);
  console.log("dünya boyu :", sizeAll.x.toFixed(1) + "×" + sizeAll.y.toFixed(1) + "×" + sizeAll.z.toFixed(1), "(ölçekli:", (sizeAll.x * s).toFixed(2) + "×" + (sizeAll.z * s).toFixed(2) + " m)");

  const adaylar = [];
  root.traverse(function (o) {
    const nm = (o.name || "").toLowerCase();
    const named = /wheel|tire|tyre|reifen|jant|felge|(^|[_\-.\/])rim([_\-.\/]|$)/.test(nm);
    const b = new THREE.Box3().setFromObject(o);
    if (b.isEmpty()) return;
    const size = b.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.y, size.z);
    const mats = [];
    o.traverse(function (c) {
      if (!c.isMesh || !c.material) return;
      (Array.isArray(c.material) ? c.material : [c.material]).forEach(function (m) { mats.push(m.name || "?"); });
    });
    const matHit = mats.some(function (n) { return /tire|tyre|reifen|wheel|rim|jante|felge/i.test(n); });
    if (!named && !matHit && !wantAll) return;
    if (span > longest * 0.30 && !wantAll) return;   // tüm tekerlek kümesi / gövde
    adaylar.push({
      name: o.name || "(isimsiz)",
      type: o.isMesh ? "mesh" : "grup",
      named: named,
      span: +(span * s).toFixed(2),
      size: [size.x, size.y, size.z].map(v => +(v * s).toFixed(2)),
      center: b.getCenter(new THREE.Vector3()).multiplyScalar(s),
      mats: Array.from(new Set(mats)).slice(0, 6).join(","),
    });
  });

  if (!adaylar.length) { console.log("tekerlek adayı yok"); return; }
  adaylar.forEach(function (a) {
    console.log(
      "  " + a.name + " [" + a.type + (a.named ? ", adlı" : ", materyal") + "]" +
      " span=" + a.span + "m boyut=" + a.size.join("×") +
      " merkez=" + a.center.toArray().map(v => +v.toFixed(2)).join(",") +
      (a.mats ? " | " + a.mats : "")
    );
  });

  // dünya merkezini göster (pivot sapmasını kıyaslamak için)
  const c = boxAll.getCenter(new THREE.Vector3());
  console.log("dünya merkezi:", [c.x, c.y, c.z].map(v => +v.toFixed(2)).join(","));
}, undefined, function (err) {
  console.error("okuma hatası:", err && err.message);
  process.exit(1);
});
