#!/usr/bin/env node
/* ============================================================
   Model teşhis raporu: her GLB için sınıflandırma ve jant özeti.

   Neden gerekli: materyal/jant tespiti isim sezgisiyle çalışıyor ve
   gerçek dosyalarda (Forza/Sketchfab ihracı) adlar öngörülemez.
   Bu rapor "hangi parça hangi gruba düştü" sorusunu ölçerek yanıtlar.

   Kullanım:
     node tools/diagnose.mjs                 (models/*.glb, hafif sürümler hariç)
     node tools/diagnose.mjs models/audi.glb
   ============================================================ */
import fs from "node:fs";
import * as THREE from "../vendor/three/three.module.js";
import { GLTFLoader } from "../vendor/three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "../vendor/three/addons/libs/meshopt_decoder.module.js";
import { prepareCar } from "../src/scene/car.js";
import { createWheels } from "../src/scene/wheels.js";

/* Node'da GLTFLoader tarayıcı API'leri ister: en küçük polyfill */
if (typeof globalThis.self === "undefined") globalThis.self = globalThis;
if (typeof globalThis.ProgressEvent === "undefined") {
  globalThis.ProgressEvent = class ProgressEvent { constructor(t, i) { this.type = t; Object.assign(this, i || {}); } };
}
if (typeof globalThis.document === "undefined") globalThis.document = { createElementNS: function () { return { style: {} }; } };
if (typeof globalThis.Image === "undefined") {
  globalThis.Image = class Image { set src(_) { setImmediate(() => this.onerror && this.onerror(new Error("Node görsel okumaz"))); } };
}
if (!globalThis.URL.createObjectURL) {
  const orig = globalThis.URL;
  globalThis.URL = class extends orig {
    static createObjectURL() { return "data:,"; }
    static revokeObjectURL() { }
  };
}

/* WebP dekode edilemez: JSON parçasından EXT_texture_webp sökülür
   (bin parçasına dokunulmaz; kutu/sınıflandırma analizi etkilenmez). */
function patchGlb(buffer) {
  const jl = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.slice(20, 20 + jl).toString("utf8"));
  json.extensionsUsed = (json.extensionsUsed || []).filter(function (e) { return e !== "EXT_texture_webp"; });
  if (json.extensionsRequired) json.extensionsRequired = json.extensionsRequired.filter(function (e) { return e !== "EXT_texture_webp"; });
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

/* Düğümün yerel kutusunun 8 köşesi (dünya uzayında): dönüş kanıtı */
function worldCorners(node) {
  node.updateWorldMatrix(true, true);
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
  : fs.readdirSync("models").filter(function (f) {
    return f.endsWith(".glb") && f.indexOf("-light") < 0;
  }).map(function (f) { return "models/" + f; });

function short(name, n) {
  const s = String(name || "?");
  const limit = n || 44;
  return s.length > limit ? s.slice(0, limit - 1) + "…" : s;
}

for (const file of files) {
  const url = "data:application/octet-stream;base64," + patchGlb(fs.readFileSync(file)).toString("base64");
  await new Promise(function (done) {
    loader.load(url, function (gltf) {
      const car = prepareCar(gltf.scene);
      const p = car.parts;
      console.log("\n=== " + file + " ===");
      console.log("  boyut " + car.size.x.toFixed(2) + " × " + car.size.y.toFixed(2) + " × " + car.size.z.toFixed(2) + " m" +
        "   ön düzeltmesi " + (car.object.rotation.y * 180 / Math.PI).toFixed(0) + "°");
      console.log("  parçalar: boya=" + p.paint.length + " cam=" + p.glass.length + " jant=" + p.rim.length +
        " lastik=" + p.tyre.length + " iç=" + p.interior.length + " diğer=" + p.body.length);

      const keys = ["low", "high", "drl", "glow", "brake", "reverse", "signalL", "signalR", "lens"];
      console.log("  ışıklar: " + keys.map(function (k) { return k + "=" + (p.lights[k] ? p.lights[k].length : 0); }).join(" "));
      ["lens", "low", "high", "brake", "reverse", "signalL"].forEach(function (k) {
        if (!p.lights[k] || !p.lights[k].length) return;
        console.log("     " + k + ": " + p.lights[k].slice(0, 8).map(function (m) { return short(m.name, 30); }).join(", "));
      });
      console.log("  camlar: " + (p.glass.length ? p.glass.slice(0, 6).map(function (o) {
        return short(o.material && o.material.name, 26);
      }).join(", ") : "—"));

      const wheels = car.wheels || [];
      console.log("  tekerlek parçaları: " + wheels.length);
      wheels.forEach(function (w) {
        console.log("     " + (w.front ? "ÖN  " : "ARKA") + " " + short(w.node.name, 46).padEnd(48) +
          " r=" + w.radius.toFixed(2) + "  eksen=(" + w.axis.toArray().map(function (v) { return v.toFixed(1); }).join(",") + ")");
      });

      /* Her parça gerçekten yerinde dönüyor mu? */
      const inst = createWheels(car);
      const host = new THREE.Group();
      host.add(car.object);
      const corners = wheels.map(function (w) { return worldCorners(w.node); });
      const centers = corners.map(function (pts) { return new THREE.Box3().setFromPoints(pts).getCenter(new THREE.Vector3()); });
      for (let i = 0; i < 20; i++) inst.update(0.05);        /* 1 sn dönüş */
      let maxDrift = 0, minMove = Infinity, spinning = 0;
      wheels.forEach(function (w, i) {
        const now = worldCorners(w.node);
        const c1 = new THREE.Box3().setFromPoints(now).getCenter(new THREE.Vector3());
        maxDrift = Math.max(maxDrift, centers[i].distanceTo(c1));
        let moved = 0;
        for (let k = 0; k < 8; k++) moved = Math.max(moved, corners[i][k].distanceTo(now[k]));
        if (moved > 1e-3) spinning++;
        minMove = Math.min(minMove, moved);
      });
      console.log("  dönüş: dönen parça=" + spinning + "/" + wheels.length +
        "  en büyük kayma=" + maxDrift.toFixed(4) + " m  en küçük hareket=" +
        (isFinite(minMove) ? minMove.toFixed(3) : "-") + " m");
      done();
    }, undefined, function (err) { console.error(file + " okunamadı: " + (err && err.message)); done(); });
  });
}
