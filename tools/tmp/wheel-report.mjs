#!/usr/bin/env node
/* Teşhis: models/*.glb için kaç tekerlek bulundu, ön/arka dağılımı ne? */
import fs from "node:fs";
import * as THREE from "../../vendor/three/three.module.js";
import { GLTFLoader } from "../../vendor/three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "../../vendor/three/addons/libs/meshopt_decoder.module.js";
import { prepareCar } from "../../src/scene/car.js";

if (typeof globalThis.self === "undefined") globalThis.self = globalThis;
if (typeof globalThis.ProgressEvent === "undefined") {
  globalThis.ProgressEvent = class ProgressEvent { constructor(t, i) { this.type = t; Object.assign(this, i || {}); } };
}
if (typeof globalThis.document === "undefined") {
  globalThis.document = { createElementNS: () => ({ style: {} }) };
}
if (typeof globalThis.Image === "undefined") {
  globalThis.Image = class Image { set src(_) { setImmediate(() => this.onerror && this.onerror(new Error("no img"))); } };
}
if (!globalThis.URL.createObjectURL) {
  const orig = globalThis.URL;
  globalThis.URL = class extends orig {
    static createObjectURL() { return "data:,"; }
    static revokeObjectURL() { }
  };
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

const loader = new GLTFLoader();
try { loader.setMeshoptDecoder(MeshoptDecoder); } catch (e) { }

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync("models").filter(f => f.endsWith(".glb") && !f.includes("light")).map(f => "models/" + f);

for (const file of files) {
  const data = patchGlb(fs.readFileSync(file));
  const url = "data:application/octet-stream;base64," + data.toString("base64");
  await new Promise(function (done) {
    loader.load(url, function (gltf) {
      const car = prepareCar(gltf.scene);
      const w = car.wheels || [];
      const fronts = w.filter(x => x.front).length;
      console.log("\n" + file + " — tekerlek: " + w.length + " (ön " + fronts + " / arka " + (w.length - fronts) + ")");
      w.forEach(function (x) {
        console.log("   " + (x.front ? "ÖN " : "ARKA") + " " + (x.node.name || "(isimsiz)") +
          " r=" + x.radius.toFixed(2) + " eksen=" + x.axis.toArray().map(v => +v.toFixed(2)).join(",") +
          " merkez=" + [x.center.x, x.center.y, x.center.z].map(v => +v.toFixed(2)).join(","));
      });
      const p = car.parts.lights;
      console.log("   ışık grupları: low=" + p.low.length + " high=" + p.high.length + " drl=" + p.drl.length +
        " brake=" + p.brake.length + " signal=" + (p.signalL.length + p.signalR.length) + " reverse=" + p.reverse.length);
      done();
    }, undefined, function (err) { console.error(file + " okunamadı: " + (err && err.message)); done(); });
  });
}
