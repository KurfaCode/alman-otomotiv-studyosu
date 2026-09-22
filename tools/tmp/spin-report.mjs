#!/usr/bin/env node
/* Teşhis: her tekerlek GERÇEKTEN yerinde mi dönüyor?
   • dönüş öncesi/sonrası dünya kutuları karşılaştırılır:
       - kutu merkezi kaymamalı (pivot doğru)
       - köşe noktaları yer değiştirmeli (dönüş gerçekten oluyor)
   Kullanım: node tools/tmp/spin-report.mjs [dosya.glb ...] */
import fs from "node:fs";
import * as THREE from "../../vendor/three/three.module.js";
import { GLTFLoader } from "../../vendor/three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "../../vendor/three/addons/libs/meshopt_decoder.module.js";
import { prepareCar } from "../../src/scene/car.js";
import { createWheels } from "../../src/scene/wheels.js";

if (typeof globalThis.self === "undefined") globalThis.self = globalThis;
if (typeof globalThis.ProgressEvent === "undefined") globalThis.ProgressEvent = class ProgressEvent { constructor(t, i) { this.type = t; Object.assign(this, i || {}); } };
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

/* düğümün dünya uzayındaki 8 köşe noktası (yerel kutu üzerinden) */
function worldCorners(node) {
  node.updateWorldMatrix(true, true);
  const box = new THREE.Box3();
  const inv = new THREE.Matrix4().copy(node.matrixWorld).invert();
  const m = new THREE.Matrix4();
  const local = new THREE.Box3();
  node.traverse(function (o) {
    if (!o.isMesh || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    if (!o.geometry.boundingBox) return;
    o.updateWorldMatrix(true, false);
    m.multiplyMatrices(inv, o.matrixWorld);
    const b = o.geometry.boundingBox.clone().applyMatrix4(m);
    if (!b.isEmpty()) local.union(b);
  });
  const pts = [];
  for (let i = 0; i < 8; i++) {
    pts.push(new THREE.Vector3(
      i & 1 ? local.max.x : local.min.x,
      i & 2 ? local.max.y : local.min.y,
      i & 4 ? local.max.z : local.min.z
    ).applyMatrix4(node.matrixWorld));
  }
  return pts;
}

const loader = new GLTFLoader();
try { loader.setMeshoptDecoder(MeshoptDecoder); } catch (e) { }

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync("models").filter(f => f.endsWith(".glb") && !f.includes("light")).map(f => "models/" + f);

for (const file of files) {
  const url = "data:application/octet-stream;base64," + patchGlb(fs.readFileSync(file)).toString("base64");
  await new Promise(function (done) {
    loader.load(url, function (gltf) {
      const car = prepareCar(gltf.scene);
      const wheels = createWheels(car);
      const holders = new THREE.Group();
      holders.add(car.object);
      holders.updateMatrixWorld(true);

      const before = car.wheels.map(w => worldCorners(w.node));
      /* 1 saniyelik dönüş (idle hızı) */
      for (let i = 0; i < 20; i++) wheels.update(0.05);
      holders.updateMatrixWorld(true);
      const after = car.wheels.map(w => worldCorners(w.node));

      const size = car.size;
      const tol = Math.max(size.x, size.y, size.z) * 0.02;
      console.log("\n" + file + " — " + car.wheels.length + " tekerlek");
      car.wheels.forEach(function (w, i) {
        const cb = new THREE.Box3().setFromPoints(before[i]).getCenter(new THREE.Vector3());
        const ca = new THREE.Box3().setFromPoints(after[i]).getCenter(new THREE.Vector3());
        const shift = cb.distanceTo(ca);
        let moved = 0;
        for (let k = 0; k < 8; k++) moved = Math.max(moved, before[i][k].distanceTo(after[i][k]));
        const okPos = shift < tol;
        const okMove = moved > tol;
        console.log("   " + (oki(w.front) + " " + (w.node.name || "?").slice(0, 34)).padEnd(40) +
          " kayma=" + shift.toFixed(3) + "m hareket=" + moved.toFixed(3) + "m  " +
          (okPos ? "✔ yerinde" : "✗ SAVRULUYOR") + (okMove ? " ✔ dönüyor" : " ✗ DÖNMÜYOR"));
      });
      done();
    }, undefined, function (err) { console.error(file + " okunamadı: " + (err && err.message)); done(); });
  });
}

function oki(front) { return front ? "ÖN  " : "ARKA"; }
