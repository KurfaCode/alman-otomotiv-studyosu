/* GLB hızlı analiz: düğüm adları + tekerlek adayları (yerel kutu boyutu) */
import fs from "node:fs";

const file = process.argv[2];
if (!file) { console.error("kullanım: node tools/tmp/analyze.mjs <dosya.glb> [ad-deseni]"); process.exit(1); }
const pattern = process.argv[3] ? new RegExp(process.argv[3], "i") : null;

const buf = fs.readFileSync(file);
const jsonLen = buf.readUInt32LE(12);
const g = JSON.parse(buf.slice(20, 20 + jsonLen).toString("utf8"));
const acc = g.accessors || [], meshes = g.meshes || [], nodes = g.nodes || [];

function triCount(mesh) {
  let t = 0;
  for (const p of mesh.primitives || []) {
    const a = acc[p.indices !== undefined ? p.indices : p.attributes.POSITION];
    if (a) t += a.count / 3;
  }
  return Math.round(t);
}
function boxOf(mesh) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of mesh.primitives || []) {
    const a = acc[p.attributes.POSITION];
    if (!a || !a.min) continue;
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], a.min[i]); max[i] = Math.max(max[i], a.max[i]); }
  }
  if (!isFinite(min[0])) return null;
  return { min, max };
}

console.log("dosya:", file, "| düğüm:", nodes.length, "| mesh:", meshes.length);
let shown = 0;
for (const n of nodes) {
  const nm = n.name || "";
  if (pattern && !pattern.test(nm)) continue;
  if (n.mesh === undefined) { if (pattern) console.log("  (grup)", nm); continue; }
  const m = meshes[n.mesh];
  const b = boxOf(m);
  if (!b) continue;
  const size = b.max.map((v, i) => +(v - b.min[i]).toFixed(1));
  const matNames = (m.primitives || []).map(p => (g.materials[p.material] || {}).name || "?").join("+");
  console.log("  " + nm + " | üçgen " + triCount(m) + " | boyut " + size.join("×") + " | " + matNames);
  shown++;
  if (shown > 40) { console.log("  …"); break; }
}
if (!shown && !pattern) console.log("  (mesh yok)");
