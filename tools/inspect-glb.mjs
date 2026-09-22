/* ============================================================
   GLB otopsisi. Optimizasyondan önce ve sonra aynı komut:

     node tools/inspect-glb.mjs models/mercedes.glb
     node tools/inspect-glb.mjs models/bmw.glb --meshes

   Ne verir: düğüm ağacı, materyal listesi (emissive + uzantılar),
   mesh başına üçgen sayısı ve yerel kutu (min/max). Jant/far gibi
   parçaların korunup korunmadığını buradan doğrularız.
   ============================================================ */

import fs from "node:fs";

const file = process.argv[2];
const wantMeshes = process.argv.indexOf("--meshes") >= 0;
if (!file) {
  console.error("kullanım: node tools/inspect-glb.mjs <dosya.glb> [--meshes]");
  process.exit(1);
}

const buf = fs.readFileSync(file);
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error("GLB değil: " + file);
const jsonLen = buf.readUInt32LE(12);
const g = JSON.parse(buf.slice(20, 20 + jsonLen).toString("utf8"));

const acc = g.accessors || [];
const meshes = g.meshes || [];
const nodes = g.nodes || [];
const mats = g.materials || [];

function triCount(mesh) {
  let t = 0;
  for (const p of mesh.primitives || []) {
    const a = acc[p.indices !== undefined ? p.indices : p.attributes.POSITION];
    if (a) t += a.count / 3;
  }
  return Math.round(t);
}

function boxOf(mesh) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of mesh.primitives || []) {
    const a = acc[p.attributes.POSITION];
    if (!a || !a.min) continue;
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], a.min[i]);
      max[i] = Math.max(max[i], a.max[i]);
    }
  }
  if (!isFinite(min[0])) return null;
  return { min: min, max: max };
}

function meshOfNode(node) {
  if (node.mesh === undefined) return null;
  return meshes[node.mesh];
}

let total = 0;
for (const m of meshes) total += triCount(m);

console.log("dosya        :", file);
console.log("boyut        :", (buf.length / 1048576).toFixed(2), "MB");
console.log("düğüm/mesh   :", nodes.length, "/", meshes.length);
console.log("materyal     :", mats.length, " doku:", (g.textures || []).length, " görsel:", (g.images || []).length);
console.log("üçgen        :", total.toLocaleString("tr-TR"));
console.log("uzantılar    :", (g.extensionsUsed || []).join(", ") || "-");

const emissive = mats
  .map(function (m, i) { return { i: i, m: m }; })
  .filter(function (o) {
    const e = o.m.emissiveFactor || [0, 0, 0];
    return e[0] > 0.01 || e[1] > 0.01 || e[2] > 0.01;
  });
console.log("\n-- emissive materyaller (" + emissive.length + ") --");
emissive.forEach(function (o) {
  const s = o.m.extensions && o.m.extensions.KHR_materials_emissive_strength;
  console.log("  " + o.m.name + "  rgb=" + o.m.emissiveFactor.map(function (x) { return x.toFixed(2); }).join(",") +
    (s ? "  güç=" + s.emissiveStrength : ""));
});

/* Geometrik ipucu: parlak/küçük parçalar nerede? Far/stop arayanlar için. */
console.log("\n-- düğüm adları --");
console.log("  " + nodes.map(function (n, i) {
  return (n.name || "node" + i) + (n.mesh !== undefined ? "*" : "");
}).join(" | "));

if (wantMeshes) {
  console.log("\n-- mesh'ler (üçgen | yerel kutu min → max) --");
  nodes.forEach(function (n) {
    const mesh = meshOfNode(n);
    if (!mesh) return;
    const b = boxOf(mesh);
    const matNames = (mesh.primitives || []).map(function (p) {
      return mats[p.material] ? mats[p.material].name : "?";
    }).join("+");
    console.log("  " + (n.name || "?") + " | " + triCount(mesh).toLocaleString("tr-TR") +
      " | " + (b ? b.min.map(function (x) { return x.toFixed(2); }).join(",") + " → " + b.max.map(function (x) { return x.toFixed(2); }).join(",") : "-") +
      " | " + matNames);
  });
}
