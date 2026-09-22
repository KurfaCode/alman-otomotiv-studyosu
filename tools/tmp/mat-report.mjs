#!/usr/bin/env node
/* Teşhis: bir GLB'nin mesh/materyal haritası — prepareCar sonrası çerçevede
   (+Z = ön). Hangi materyal sınıflanmış, hangisi lamba sayılmış? */
import fs from "node:fs";
import * as THREE from "../../vendor/three/three.module.js";
import { GLTFLoader } from "../../vendor/three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "../../vendor/three/addons/libs/meshopt_decoder.module.js";
import { prepareCar } from "../../src/scene/car.js";

if (typeof globalThis.self === "undefined") globalThis.self = globalThis;
if (typeof globalThis.ProgressEvent === "undefined") {
  globalThis.ProgressEvent = class ProgressEvent { constructor(t, i) { this.type = t; Object.assign(this, i || {}); } };
}
if (typeof globalThis.document === "undefined") globalThis.document = { createElementNS: () => ({ style: {} }) };
if (typeof globalThis.Image === "undefined") globalThis.Image = class Image { set src(_) { setImmediate(() => this.onerror && this.onerror(new Error("no img"))); } };
if (!globalThis.URL.createObjectURL) {
  const orig = globalThis.URL;
  globalThis.URL = class extends orig { static createObjectURL() { return "data:,"; } static revokeObjectURL() { } };
}

function patchGlb(buffer) {
  const jl = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.slice(20, 20 + jl).toString("utf8"));
  json.extensionsUsed = (json.extensionsUsed || []).filter(e => e !== "EXT_texture_webp");
  if (json.extensionsRequired) json.extensionsRequired = json.extensionsRequired.filter(e => e !== "EXT_texture_webp");
  (json.textures || []).forEach(function (t) {
    const webp = t.extensions && t.extensions.EXT_texture_webp;
    if (webp && t.source === undefined && json.images && json.images[webp.source]) t.source = webp.source;
    if (t.extensions) delete t.extensions.EXT_texture_webp;
  });
  let js = Buffer.from(JSON.stringify(json), "utf8");
  while (js.length % 4 !== 0) js = Buffer.concat([js, Buffer.from(" ")]);
  const rest = buffer.slice(20 + jl);
  const bin = rest.slice(8);
  const header = Buffer.alloc(12);
  buffer.copy(header, 0, 0, 12);
  header.writeUInt32LE(12 + 8 + js.length + bin.length, 8);
  const jc = Buffer.alloc(8 + js.length);
  jc.writeUInt32LE(js.length, 0); jc.write("JSON", 4); js.copy(jc, 8);
  const bc = Buffer.alloc(8 + bin.length);
  bc.writeUInt32LE(bin.length, 0); bc.write("BIN\0", 4); bin.copy(bc, 8);
  return Buffer.concat([header, jc, bc]);
}

const file = process.argv[2];
const filter = process.argv[3] ? new RegExp(process.argv[3], "i") : null;
if (!file) { console.error("kullanım: node tools/tmp/mat-report.mjs <dosya.glb> [ad-deseni]"); process.exit(1); }

const loader = new GLTFLoader();
try { loader.setMeshoptDecoder(MeshoptDecoder); } catch (e) { }
const url = "data:application/octet-stream;base64," + patchGlb(fs.readFileSync(file)).toString("base64");

loader.load(url, function (gltf) {
  const car = prepareCar(gltf.scene);
  const half = car.size.z / 2;
  const widthHalf = car.size.x / 2;
  const lightMats = new Map();
  Object.keys(car.parts.lights).forEach(function (k) {
    car.parts.lights[k].forEach(function (m) { lightMats.set(m, (lightMats.get(m) || "") + k + ","); });
  });
  const seen = new Set();
  const rows = [];
  car.object.traverse(function (o) {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const box = new THREE.Box3().setFromObject(o);
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    mats.forEach(function (m) {
      const nm = (m.name || "?") + " @" + (o.name || "?").slice(0, 40);
      if (filter && !filter.test(nm)) return;
      if (seen.has(nm)) return;
      seen.add(nm);
      const em = m.emissive ? [m.emissive.r, m.emissive.g, m.emissive.b].map(v => +v.toFixed(2)).join(",") : "-";
      rows.push({
        nm: nm,
        cls: lightMats.get(m) ? "IŞIK(" + lightMats.get(m) + ")" : (car.parts.paint.indexOf(o) >= 0 ? "boya?" : ""),
        em: em,
        tr: (m.transparent ? "T" : "") + (m.opacity !== undefined ? "o" + m.opacity : ""),
        z: +(c.z).toFixed(2), x: +(c.x).toFixed(2), y: +(c.y).toFixed(2),
        sz: [s.x, s.y, s.z].map(v => +v.toFixed(2)).join("×"),
        zrel: +(c.z / Math.max(1e-4, half)).toFixed(2),
      });
    });
  });
  rows.sort(function (a, b) { return b.z - a.z; });
  console.log("boyut:", [car.size.x, car.size.y, car.size.z].map(v => +v.toFixed(2)).join("×"), "| yarı boy Z:", half.toFixed(2));
  console.log("low=" + car.parts.lights.low.length + " high=" + car.parts.lights.high.length +
    " drl=" + car.parts.lights.drl.length + " brake=" + car.parts.lights.brake.length +
    " reverse=" + car.parts.lights.reverse.length + " signalL=" + car.parts.lights.signalL.length);
  console.log("z/YarıBoy | sınıf | emissive | şeffaf | boyut | ad");
  rows.forEach(function (r) {
    console.log(String(r.zrel).padStart(6) + " | " + (r.cls || "-").padEnd(14) + " | " + r.em.padEnd(12) + " | " + r.tr.padEnd(8) + " | " + r.sz.padEnd(16) + " | " + r.nm);
  });
}, undefined, function (err) { console.error("okuma hatası:", err && err.message); process.exit(1); });
