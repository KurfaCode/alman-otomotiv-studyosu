# Model optimizasyonu

Ham model (Blender ihracı) 1M+ üçgen ve onlarca 4K doku ile gelebilir. Eski akıllı tahtada
bu hâliyle açılmaz. Aşağıdaki tek komut 57 MB → ~3 MB indirir.

## Komut

```bash
# proje kökünde, ham model mercedes.glb olarak dururken:
npx --yes @gltf-transform/cli@3.10.0 optimize mercedes.glb models/mercedes.glb \
  --compress meshopt \
  --texture-compress webp \
  --texture-size 1024 \
  --simplify true \
  --simplify-error 0.001 \
  --flatten false --join false --instance false --palette false \
  --weld true
```

## Kritik bayraklar

| Bayrak | Neden |
|---|---|
| `--flatten false --join false` | Mesh'leri birleştirirse **jant düğümleri kaybolur** → jant dönüşü bozulur. |
| `--palette false` | Materyalleri palet dokusunda birleştirir → far/stop/boya adları kaybolur, ışık kontrolü çalışmaz. |
| `--compress meshopt` | Draco'dan hızlı açılır; çözücü `vendor/` içinde yereldir. |
| `--texture-size 1024` | VRAM ve indirme boyutunu düşürür. |
| `--simplify-error 0.001` | 1,03M → ~129k üçgen. `0.002` daha hafif (86k), `0.0005` daha yumuşak (~250k) sonuç verir. |

## Doğrulama

```bash
node -e '
const fs=require("fs");
const b=fs.readFileSync("models/mercedes.glb");
const j=JSON.parse(b.slice(20,20+b.readUInt32LE(12)).toString("utf8"));
console.log("boyut MB", (b.length/1048576).toFixed(2));
console.log("düğümler", (j.nodes||[]).map(n=>n.name).join(" | "));
console.log("materyaller", (j.materials||[]).length);
let t=0;(j.meshes||[]).forEach(m=>(m.primitives||[]).forEach(p=>{if(p.indices!=null)t+=j.accessors[p.indices].count/3}));
console.log("üçgen", Math.round(t));
console.log("uzantılar", (j.extensionsUsed||[]).join(","));
'
```

Beklenen çıktı: 10 düğüm (`w206_Body`, 4 × `w206_Wheel.*`, 4 × `w206_WheelBrake.*`, `Plane`),
55 materyal (`w206_paint`, `w206_headlight`… korunmuş), ~129k üçgen,
`EXT_meshopt_compression` + `EXT_texture_webp` uzantıları.

## Esrar artefakt görülürse

Model `KHR_materials_specular / ior / clearcoat` uzantıları taşır. Eski bir sürücüde yüzeyler
görünmez olursa materyalleri klasik metalik-pürüzlülüğe indirin:

```bash
npx --yes @gltf-transform/cli@3.10.0 metalrough models/mercedes.glb models/mercedes-mr.glb
```

(modeli görünür kılıp `--flatten/--join` bayraklarıyla optimize etmek en garantili yoldur.)
