import * as THREE from "../../vendor/three/three.module.js";
import { GLTFLoader } from "../../vendor/three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "../../vendor/three/addons/libs/meshopt_decoder.module.js";
import { CFG } from "../config.js";

/* ============================================================
   Araba modülü.

   Model birimi ne olursa olsun (m, cm, mm) araba CFG.car.length
   uzunluğuna ölçeklenir; böylece "6 birimden büyükse gizle" gibi
   kırılgan sezgiler gerekmez. Yerdeki asfalt düzlemi adından
   tanınır ve gizlenir.

   Parçalar isimlerinden sınıflandırılır: gövde, jantlar, camlar,
   iç mekân ve far/stop/sinyal grupları. Materyal SINIFI asla
   değiştirilmez, yalnızca parametreleri ayarlanır.
   ============================================================ */

/* ------------------------------------------------------------
   İSİM ÇÖZÜMLEYİCİ

   Gerçek dosyalarda materyal ve düğüm adları öngörülemez:
     "TTAudi_TTRSCoupeIERewardRecycled_2023Paint_Material1"
     "R:Rim_FL_C7M19_Material_Atlas_Mesh_2_004"
     "w206_WheelFtL"   "EXT_Carpaint_Inst"   "light_glasss"
   Düz regex aramaları bu yüzden yanılıyordu: `^paint` Audi'nin boya
   materyalini kaçırıyor (araba kalibresiz kalıyordu), "windows" VW'nin
   camı "gövde" sayılıyor (bembeyaz camlar), "R:" öneki Golf'ün jant
   düğümünü tanınmaz kılıyordu (lastik dönüyor, jant duruyordu).

   Çözüm: adı SÖZCÜKLERE ayır (camelCase + ayraçlar), kuralları sözcük
   sınırlarıyla eşle. "…23Paint_Material1" içindeki "paint" de,
   "R:Rim_FL…" içindeki "rim" de böyle bulunur.
   ------------------------------------------------------------ */
export function nameTokens(name) {
  const raw = String(name || "");
  if (!raw) return [];
  return raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(function (t) { return t.toLowerCase(); });
}

/* Kural eşleşmesi iki biçimde denenir: sözcükler boşlukla ve alt
   çizgiyle birleşik. Böylece hem " glass " hem "_glasslight_"
   kalıpları aynı anda çalışır. */
function textForm(name) {
  const t = nameTokens(name);
  return " " + t.join(" ") + " _" + t.join("_") + "_";
}

const W_HEAD = "(?:^|[\\s_])";      /* sözcük başı */
const W_TAIL = "(?:$|[\\s_])";      /* sözcük sonu */
/* Sözcüğün TAMAMI (eşanlamlı liste) */
function words(stems) {
  return new RegExp(W_HEAD + "(?:" + stems.join("|") + ")" + W_TAIL);
}
/* Sözcüğün BAŞI (ek alabilir: glass → glasss, light → lighta) */
function wordsStart(stems) {
  return new RegExp(W_HEAD + "(?:" + stems.join("|") + ")\\w*" + W_TAIL);
}

/* Sıra önemli: ilk eşleşen kural kazanır.
   "lens": lamba camı/lensi — hangi uçta olduğu İSİMDEN değil KONUMDAN
   bulunur (aşağıda). "glass" ise camdır (pencere), lamba değildir. */
const KIND_RULES = [
  ["signalL",  words(["leftflash", "blinker_l"])],
  ["signalR",  words(["rightflash", "blinker_r"])],
  ["reverse",  words(["reverse", "reverese", "rueckfahr", "backup"])],
  ["brake",    words(["w206_red", "shader_brake", "brake_light", "bremslicht"])],
  ["high",     wordsStart(["highbeam", "fernlicht"])],
  ["low",      wordsStart(["lowbeam", "abblend"])],
  ["drl",      words(["drl", "tagfahrlicht"])],
  ["glow",     wordsStart(["lights_", "lightglob", "vehiclelight"])],
  ["lens",     wordsStart(["lens", "light", "lamp", "leuchte", "scheinwerfer", "beam", "reflector", "glasslens", "lightglass", "glasslight", "glass_emissive", "emissive_glass", "red_glass"])],
  ["glass",    wordsStart(["glass", "window", "windscreen", "windshield", "scheibe", "fenster", "verre", "cristal"])],
  /* İç mekân: deri, ekran, koltuk, dikiş, hoparlör… */
  ["interior", wordsStart(["leather", "leder", "gauge", "screen", "burmester", "airbag", "simbs", "symbols", "speaker", "fabric", "vinyl", "plast", "interior", "int", "carpet", "costura", "seam", "display"])],
  ["trim",     wordsStart(["carbon", "kevlar"])],
  ["tyre",     wordsStart(["tyre", "tire", "reifen", "pneu", "llanta", "lastik"])],
  ["rim",      wordsStart(["rim", "jante", "felge", "esr", "cs1", "chrome", "metallic", "grille", "grill", "logo", "badge", "lettering", "mirror", "clipper", "caliper", "spoke", "trim"])],
  ["paint",    wordsStart(["paint", "carpaint", "karosserie", "autolack", "coloured", "colored", "etk800", "w206_color"])],
];

/* Bir adı kural tablosundan geçirir; hiçbiri tutmazsa "body". */
export function classifyKind(name) {
  const text = textForm(name);
  for (let i = 0; i < KIND_RULES.length; i++) {
    if (KIND_RULES[i][1].test(text)) return KIND_RULES[i][0];
  }
  return "body";
}

/* ---------------- jant/lastik sözlüğü ----------------
   Tekerlek parçası adları: Wheel_FL, 3DWheel_Front_L, Rim_FL_C7M19,
   Tire_FR_C7M_Tires, M_Rim_Main_Max… Direksiyon/koltuk uyarıları
   dışlanır, çünkü "Artificial leather for wheel" = direksiyondur. */
/* Tek harflik önek serbest: Golf'ün düğümleri "RRim_FL_C7M19",
   "RTire_FR_C7M_Tires" biçiminde gelir (R = Forza'nın önek işareti).
   Aksi hâlde jant düğümü tanınmaz ve lastik dönerken jant durur. */
const WHEEL_WORD = /^(?:[rlbfmn]?)(?:wheels?|rims?|tyres?|tires?|reifen|felge|jantes?|jant|llanta|cerchio|pneu|lastik)\w*$/;
const WHEEL_BURIED = /wheel/;                       /* 3dWheel1, Wheel1A gibi gömülü adlar */
const WHEEL_MAT = /^(?:esr|cs1|rims?|wheels?|tyres?|tires?|jante|felge)\w*$/;
/* Önek serbest olunca gövde parçaları da eşleşebilir: "trim", "brim"… */
const NOT_WHEEL = /^(?:trim|trims|brims?|primes?|primer|crimes?|grimes?)$/;
const STEERING_WORD = /steering|direksiyon|lenkrad|leather|leder|seat|koltuk|sitz/;

function wheelish(name) {
  const toks = nameTokens(name);
  if (!toks.length) return false;
  if (toks.some(function (t) { return STEERING_WORD.test(t); })) return false;
  return toks.some(function (t) {
    return !NOT_WHEEL.test(t) && (WHEEL_WORD.test(t) || WHEEL_BURIED.test(t));
  });
}

function wheelishMaterial(name) {
  const toks = nameTokens(name);
  if (!toks.length) return false;
  return toks.some(function (t) {
    return !NOT_WHEEL.test(t) && (WHEEL_WORD.test(t) || WHEEL_MAT.test(t) || WHEEL_BURIED.test(t));
  });
}

/* İsimsiz modeller (Sketchfab/FBX ihracı) materyallerini "TEX.014"
   gibi opak adlarla taşır: isim eşleşmesi hiç tutmaz ve ne far ne stop
   bulunur. Bu durumda konum konuşur:
     • kırmızı emissive materyal → stop lambası (ve arka yönün işareti)
     • gövdenin en ucundaki lens/cam parçası → far (ön) veya lamba camı (arka)
   Aynı materyal hem ön hem arka uçta görünüyorsa (ön cam gibi) hiç
   dokunulmaz — yanlış parçayı yakmaktansa hiç yakmamak doğrudur. */
/* Doymuş KIRMIZI = stop lambası. Turuncu/amber kapsam dışıdır:
   BMW M5'in ön turuncu lambası (1.00, 0.16, 0.02) geniş ölçütle
   "önde kırmızı" sayılıp far grubuna hiç girmiyordu — "Far"a
   basınca modelde yanan hiçbir lamba yoktu. */
const REDDISH = function (c) { return !!c && c.r > 0.45 && c.g < 0.10 && c.b < 0.14; };
/* Saf kırmızı (doğrusal uzayda g ve b ~ 0): önde yanan böyle bir parça
   far değil, rozet/aksandır. Turuncu sinyal/DRL lambası bu ölçüte
   girmediği için ön lamba olarak yanabilir. */
const PURE_RED = function (c) { return !!c && c.r > 0.35 && c.g < 0.006 && c.b < 0.006; };

function isLensLike(m) {
  if (!m) return false;
  if (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.05) return true;
  if (typeof m.transmission === "number" && m.transmission > 0.35) return true;
  if (m.transparent && m.opacity < 0.7) return true;
  return /lens|light|lamp|leuchte|scheinwerfer/.test((m.name || "").toLowerCase());
}

/* Işık DÜĞÜMÜ adları: bazı modellerde (Audi) parçalar isimli ve tek
   uçtadır — ad + konum, yön için en güvenilir işarettir. */
const FRONT_NODE = /head.?light|front.?light|frontlamp|scheinwerfer/;
const REAR_NODE = /back.?light|tail.?light|rear.?light|stop.?light|brake.?light|heck|rueck|ruck|bremslicht/;

/* Bir parça kümesinin uzun eksende TEK bir uçta toplanıp toplanmadığı.
   Gövdeyi boydan boya kaplayan parçalar (ör. w206_lights_global) yön
   işareti sayılmaz: kutu merkezini arabanın ortasına çekip ön yönü ters
   çeviriyorlardı — "Far"a basınca huzme arkadan çıkıyordu. */
function endAlongAxis(meshes, center, size, axisX) {
  const alongX = axisX !== undefined ? axisX : size.x >= size.z;
  const half = Math.max(1e-4, (alongX ? size.x : size.z) / 2);
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  for (let i = 0; i < meshes.length; i++) {
    const o = meshes[i];
    if (!o || !o.isMesh) continue;
    tmp.setFromObject(o);
    if (!tmp.isEmpty()) box.union(tmp);
  }
  if (box.isEmpty()) return null;
  const c = box.getCenter(new THREE.Vector3());
  const s = box.getSize(new THREE.Vector3());
  const l = (alongX ? c.x - center.x : c.z - center.z);
  const spread = alongX ? s.x : s.z;
  if (spread > half * 1.05) return null;        /* iki uca yayılmış */
  if (Math.abs(l) < half * 0.20) return null;   /* ortada duruyor */
  return l >= 0 ? 1 : -1;
}

/* Düğüm adlarından yön: ön/arka ışık düğümlerinin konumları karşılaştırılır. */
function nodeNameHint(root, center, size, axisX) {
  const alongX = axisX !== undefined ? axisX : size.x >= size.z;
  const half = Math.max(1e-4, (alongX ? size.x : size.z) / 2);
  let fSum = 0, fN = 0, rSum = 0, rN = 0;
  root.traverse(function (o) {
    const nm = (o.name || "").toLowerCase();
    if (!nm) return;
    const isF = FRONT_NODE.test(nm);
    const isR = REAR_NODE.test(nm);
    if (!isF && !isR) return;
    const box = new THREE.Box3().setFromObject(o);
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    const l = alongX ? (c.x - center.x) : (c.z - center.z);
    const spread = alongX ? s.x : s.z;
    if (spread > half * 1.05 || Math.abs(l) < half * 0.12) return;
    if (isF) { fSum += l; fN++; } else { rSum += l; rN++; }
  });
  if (fN && rN) {
    const d = (fSum / fN) - (rSum / rN);
    if (Math.abs(d) > half * 0.25) return d > 0 ? 1 : -1;
    return null;
  }
  if (fN) return fSum >= 0 ? 1 : -1;
  if (rN) return rSum >= 0 ? -1 : 1;
  return null;
}

/* Ön yön (uzun eksende ±1) veya kesin değilse null.
   Sıra: isimden bilinen ön lambalar → isimden bilinen arka lambalar →
   ışık düğümü adları. Hiçbiri kesin değilse model olduğu gibi kalır. */
function detectFront(parts, center, size, scene3d, axisX) {
  const lmx = parts.lightMeshes;
  const fronts = [lmx.low, lmx.high, lmx.drl];
  const rears = [lmx.brake, lmx.reverse, lmx.signalL, lmx.signalR];
  let s = 0;
  for (let i = 0; i < fronts.length && !s; i++) s = endAlongAxis(fronts[i] || [], center, size, axisX) || 0;
  if (s) return s;
  for (let j = 0; j < rears.length && !s; j++) {
    const r = endAlongAxis(rears[j] || [], center, size, axisX);
    if (r) s = -r;
  }
  if (s) return s;
  const byName = nodeNameHint(scene3d, center, size, axisX);
  if (byName) return byName;
  return redEndHint(scene3d, center, size, axisX);
}

/* Son çare: kırmızı yanan lambalar ARKAYI gösterir (Sketchfab ihracı:
   TEX.010 gibi opak adlar, başka hiçbir işaret yok). Gövdeyi boydan boya
   kaplayan parçalar işaret sayılmaz. */
function redEndHint(scene3d, center, size, axisX) {
  const alongX = axisX !== undefined ? axisX : size.x >= size.z;
  const half = Math.max(1e-4, (alongX ? size.x : size.z) / 2);
  let sum = 0, n = 0;
  scene3d.traverse(function (o) {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (!mats.some(function (m) { return m.emissive && PURE_RED(m.emissive); })) return;
    const box = new THREE.Box3().setFromObject(o);
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    const l = alongX ? (c.x - center.x) : (c.z - center.z);
    const spread = alongX ? s.x : s.z;
    if (spread > half * 1.05 || Math.abs(l) < half * 0.18) return;
    sum += l;
    n++;
  });
  if (!n) return null;
  const m = sum / n;
  if (Math.abs(m) < half * 0.18) return null;
  return m > 0 ? -1 : 1;
}

/* TEK MATERYALLİ LAMBA GÖVDESİ BÖLMESİ

   Bazı modeller (Audi TT RS, Golf 8) bütün lamba donanımını TEK bir
   materyalde toplar ve o materyal gövde boyunca uzanır. Böyle bir
   parça "iki uca yayılmış" sayılıp hiçbir gruba yazılmıyordu; sonuçta
   "Far" düğmesi yanan hiçbir parça bulamıyordu.

   Çözüm: mesh'in üçgenleri konuma göre ayrılır (ön / geri kalanı),
   indeks tamponu yeniden sıralanıp iki grup kurulur. Yalnızca ÖN
   grubun materyali klonlanır ve far grubuna verilir; arka ve orta
   kısım özgün materyalle (sönük) çizilmeye devam eder. Böylece
   "Far"a basınca arabanın arkası da beyaz yanmaz.

   Koruma kuralları (yanlış parçayı yakmamak için):
     • materyal adı lamba sözcüğü içermeli (light/lamp/leuchte…)
     • adı cam sözcüğü içerenler (glass/window/scheibe) bölünmez —
       aksi hâlde ön cam ve kelebek camı far gibi yanardı
     • cam/jant/lastik/iç mekân grubuna düşmüş mesh'e dokunulmaz
   Dönüş: far grubuna yazılacak klon materyal ya da null. */
const LENS_NAME = /light|lamp|leuchte|scheinwerfer|beam/;
const GLASS_NAME = /glass|window|scheibe|fenster|windshield|windscreen/;
/* "light_glasss", "glass_light", "EXT_Glass_Emissive_Front": cam
   sözcüğü taşır ama CAM DEĞİL, lamba camıdır → bölünebilir. */
const LENS_GLASS_NAME = /light\w*glass|glass\w*light|glass\w*emissive|emissive\w*glass|red_glass/;

function isGlassPart(mesh, parts) {
  const lists = [parts.glass, parts.tyre, parts.rim, parts.interior];
  for (let i = 0; i < lists.length; i++) {
    if (lists[i] && lists[i].indexOf(mesh) >= 0) return true;
  }
  return false;
}

/* Lamba camı adı mı? (bölmeye değer mi sorusunun ilk kapısı) */
function isLensMaterialName(name) {
  const nm = String(name || "").toLowerCase();
  if (!LENS_NAME.test(nm)) return false;
  if (GLASS_NAME.test(nm) && !LENS_GLASS_NAME.test(nm)) return false;
  return true;
}

function splitFrontLens(mesh, mat, parts, center, size) {
  if (!isLensMaterialName(mat.name || "")) return null;
  if (isGlassPart(mesh, parts)) return null;

  const geo = mesh.geometry;
  const pos = geo && geo.attributes ? geo.attributes.position : null;
  if (!geo || !pos || !isFinite(pos.count) || pos.count < 12) return null;
  const idx = geo.index;
  const tris = Math.floor((idx ? idx.count : pos.count) / 3);
  if (tris < 8) return null;

  mesh.updateWorldMatrix(true, false);
  const v = new THREE.Vector3();
  const half = Math.max(1e-4, size.z / 2);
  const front = [], rest = [];
  for (let t = 0; t < tris; t++) {
    let cz = 0;
    for (let k = 0; k < 3; k++) {
      const vi = idx ? idx.getX(t * 3 + k) : (t * 3 + k);
      v.fromBufferAttribute(pos, vi).applyMatrix4(mesh.matrixWorld);
      cz += v.z;
    }
    (cz / 3 - center.z > half * 0.20 ? front : rest).push(t);
  }
  /* Bölmeye değer mi? Ön parça ne yok sayılacak kadar küçük ne de
     bütün mesh olmalı (ikisinde de "iki uçta toplanmış" değildir). */
  if (front.length < 4 || front.length > tris * 0.85) return null;

  const order = front.concat(rest);
  const src = idx ? idx.array : null;
  const out = new Uint32Array(tris * 3);
  for (let i = 0; i < tris; i++) {
    const t = order[i];
    for (let k = 0; k < 3; k++) out[i * 3 + k] = src ? src[t * 3 + k] : (t * 3 + k);
  }
  geo.setIndex(new THREE.BufferAttribute(out, 1));
  geo.clearGroups();
  geo.addGroup(0, front.length * 3, 0);
  geo.addGroup(front.length * 3, (tris - front.length) * 3, 1);

  const frontMat = mat.clone();
  frontMat.name = (mat.name || "lens") + "::front";
  markLensCover(frontMat);
  mesh.material = [frontMat, mat];
  return frontMat;
}

/* Lamba CAMI/gövdesi işareti.

   Audi'de olduğu gibi bütün lamba donanımı TEK materyalde toplanırsa o
   materyal bir "far camı"dır: tam güçte yakıldığında tamponun yarısı
   bembeyaz bir leke olur. Bu yüzden camlar/gövdeler (1) kısılmış güçle
   yanar (40%) ve (2) ton eşlemesi açık kalır — parlaklık kırpılmak
   yerine yuvarlanır: lamba yanar ama patlamaz. */
function markLensCover(m) {
  if (!m || !m.userData) return;
  m.userData.lensCover = true;
  m.userData.powerScale = 0.4;
  return m;
}

/* Işıkları GEOMETRİDEN bulur: isimler işe yaramadığında (Sketchfab
   ihracı "TEX.014" gibi opak adlar) materyal özellikleri + konum konuşur.
   Çağrıldığında araba çoktan +Z'ye dönmüştür: +Z = ön, +X = sağ. */
function classifyLightsByGeometry(scene3d, parts, kindOf, center, size, staged, full) {
  const half = Math.max(1e-4, size.z / 2);
  const widthHalf = Math.max(1e-4, size.x / 2);
  /* Gerçek lamba UÇLARDA durur. Eşik gevşek tutulunca ön panel /
     gösterge ekranı (VW: Display_1, Maybach panosu) far sanılıp
     yanıyordu; gövde yarısının %55'i hem farı hem stopu rahat yakalar. */
  const endRatio = 0.55;

  const stagedList = staged || [];
  function isStaged(m) { return stagedList.indexOf(m) >= 0; }

  const known = new Map();
  Object.keys(parts.lights).forEach(function (k) {
    if (k === "lens") return;              /* toplama alanı kural saymaz */
    parts.lights[k].forEach(function (m) { known.set(m, k); });
  });

  /* Materyal bazında kayıt: çoklu materyalli mesh'lerde (Sketchfab
     ihracı) yalnızca lamba materyali yanar, krom/lastik yanmaz. */
  const recs = [];
  scene3d.traverse(function (o) {
    if (!o.isMesh || !o.material) return;
    const box = new THREE.Box3().setFromObject(o);
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    const wide = s.z > Math.max(size.z * 0.5, half);   /* gövdeye yayılmış */
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (let i = 0; i < mats.length; i++) {
      const m = mats[i];
      if (!m) continue;
      const lit = !!m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.05;
      if (!isStaged(m)) {
        if (known.has(m)) continue;
        if (!full) continue;          /* adıyla lamba bulunduysa ekstra tarama yok */
        /* Sınıflandırılmış parçalar lamba sayılmaz: jant, lastik, krom,
           cam, iç mekân. Bu süzgeç olmadan Porsche'nin EXT_RIM ve
           EXT_Windows materyalleri "far" olup jantlar/camlar yanıyordu. */
        const kind = kindOf ? kindOf.get(m) : "body";
        if (kind && kind !== "body" && kind !== "lens") continue;
        if (!lit && !isLensLike(m)) continue;
        if (wide && !lit) {
          /* gövde boyunca uzanan tek lamba gövdesi: ön parçası ayrılır */
          const frontMat = splitFrontLens(o, m, parts, center, size);
          if (frontMat) recs.push({ m: frontMat, mesh: o, z: half * 0.6, x: c.x - center.x, lit: false, front: true });
          continue;
        }
      } else if (wide && !lit) {
        /* Lamba camı gövde boyunca uzanıyorsa ön parçası ayrılır. */
        const frontMat = splitFrontLens(o, m, parts, center, size);
        if (frontMat) {
          recs.push({ m: frontMat, mesh: o, z: half * 0.6, x: c.x - center.x, lit: false, front: true });
          continue;
        }
      }
      recs.push({ m: m, mesh: o, z: c.z - center.z, x: c.x - center.x, lit: lit });
    }
  });
  if (!recs.length) return;

  /* Aynı materyal iki UÇTA birden kullanılıyorsa (VW'nin "Glow"u, Porsche
     LED şeritleri) tek grupla yetinmek yanlış: "Far"a basınca arka lamba
     da beyaz yanardı. O yüzden materyal, o mesh için KOPYALANIR ve
     yalnızca bu uçtaki parça kopyayı kullanır. */
  const FRONT_KEYS = { low: true, high: true, drl: true };
  function endOf(key) { return FRONT_KEYS[key] ? 1 : -1; }
  const endsOf = new Map();              /* materyal → hangi uçlara yazıldı */
  const cloneCache = new Map();          /* materyal → { 1: kopya, -1: kopya } */

  function add(rec, key) {
    const end = endOf(key);
    let m = rec.m;
    /* İsimden "lens" çıkan materyal bir lamba CAMIDIR: kısılmış güçle yanar. */
    if (isStaged(m)) markLensCover(m);
    const used = endsOf.get(m);
    if (used && used.has(-end)) {
      /* Aynı uç için tek kopya yeter: dört mesh için dört kopya
         çıkarmak materyal sayısını gereksiz şişirirdi. */
      let shelf = cloneCache.get(m);
      if (!shelf) { shelf = {}; cloneCache.set(m, shelf); }
      let clone = shelf[end];
      const fresh = !clone;
      if (fresh) {
        clone = m.clone();
        clone.name = (m.name || "lens") + (end > 0 ? "::front" : "::rear");
        shelf[end] = clone;
        markLensCover(clone);
      }
      const mesh = rec.mesh;
      if (mesh && mesh.material) {
        if (Array.isArray(mesh.material)) {
          const arr = mesh.material.slice();
          for (let i = 0; i < arr.length; i++) if (arr[i] === m) arr[i] = clone;
          mesh.material = arr;
        } else if (mesh.material === m) {
          mesh.material = clone;
        }
      }
      if (fresh && kindOf) kindOf.set(clone, "lens");
      m = clone;
      rec.m = clone;
    }
    if (!endsOf.has(m)) endsOf.set(m, new Set());
    endsOf.get(m).add(end);
    if (parts.lights[key].indexOf(m) >= 0) return;
    parts.lights[key].push(m);
    parts.lightMeshes[key].push(rec.mesh);
  }

  recs.forEach(function (r) {
    const frontOnly = r.front === true || r.z > half * endRatio;
    const rearOnly = !r.front && r.z < -half * endRatio;
    if (!frontOnly && !rearOnly) return;             /* ortada: dokunma */
    const red = r.lit && REDDISH(r.m.emissive);
    if (frontOnly) {
      /* önde SAF KIRMIZI yanan parça far değildir (rozet, aksan);
         turuncu DRL/sinyal lambası ise far grubuna girer. */
      if (r.lit && PURE_RED(r.m.emissive)) return;
      add(r, "low");
      add(r, r.lit ? "high" : "drl");
      return;
    }
    if (red) { add(r, "brake"); return; }
    if (r.lit) { add(r, "reverse"); return; }
    /* arkadaki lens: sinyal burada yanar. Tek parça iki yanı kapsıyorsa
       (orta eksende duruyorsa) iki tarafa da yazılır. */
    if (Math.abs(r.x) < widthHalf * 0.12) { add(r, "signalL"); add(r, "signalR"); }
    else if (r.x > 0) add(r, "signalR");
    else add(r, "signalL");
  });

  /* Sinyal için ayrı lens bulunamadıysa stop lambalarının camı sinyal
     olarak da kullanılır: düğme boşa basmasın, bir tepki versin. */
  if (!parts.lights.signalL.length && parts.lights.brake.length) {
    parts.lights.signalL = parts.lights.brake.slice();
    parts.lights.signalR = parts.lights.brake.slice();
    parts.lightMeshes.signalL = parts.lightMeshes.brake.slice();
    parts.lightMeshes.signalR = parts.lightMeshes.brake.slice();
  }

  /* Ters yön: stop grubu boş kaldıysa aynı arka camlar "Stop" için de
     kullanılır. Yukarıdaki tarama stop adaylarını yalnızca KIRMIZI
     yanan parçalardan seçiyor; kırmızı cam sönük bırakılmış modellerde
     (Audi, Maybach, Porsche) "Stop" düğmesi hiçbir şey yakmıyordu.
     Bu tarama yalnızca isimden ışık bulunamayan modellerde çalışır. */
  if (!parts.lights.brake.length && parts.lights.signalL.length) {
    parts.lights.brake = parts.lights.signalL.slice();
    parts.lightMeshes.brake = parts.lightMeshes.signalL.slice();
  }
}

/* Huzme/hale odağı: YALNIZCA ön uçta toplanan lamba parçalarından.
   Gölge/hale arabanın ortasından çıkmasın diye bütün gövdeyi kaplayan
   ışık parçaları (lights_global gibi) hesaba katılmaz. */
function frontLightBox(parts, center, size) {
  const half = Math.max(1e-4, size.z / 2);
  const out = new THREE.Box3();
  const tmp = new THREE.Box3();
  ["low", "high", "drl"].forEach(function (key) {
    const list = parts.lightMeshes[key] || [];
    const box = new THREE.Box3();
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (!o || !o.isMesh) continue;
      tmp.setFromObject(o);
      if (!tmp.isEmpty()) box.union(tmp);
    }
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    if (c.z - center.z < half * 0.18) return;      /* ön uçta değil */
    if (s.z > size.z * 0.55) return;               /* iki uca yayılmış */
    out.union(box);
  });
  return out;
}

const EMISSIVE = {
  drl:    { hex: 0xeaf2ff, power: 1.6 },
  glow:   { hex: 0xfff4dd, power: 0.5 },
  low:    { hex: 0xfff3d6, power: 3.2 },
  high:   { hex: 0xffffff, power: 5.0 },
  brake:  { hex: 0xff2617, power: 2.6 },
  reverse:{ hex: 0xf4f8ff, power: 1.8 },
  signalL:{ hex: 0xff8a1e, power: 3.0 },
  signalR:{ hex: 0xff8a1e, power: 3.0 },
};

export function createLoader() {
  const loader = new GLTFLoader();
  try { loader.setMeshoptDecoder(MeshoptDecoder); } catch (e) { }
  return loader;
}

/* Sırayla dener; hepsi başarısız olursa null döner (çökme yok). */
export function loadFirst(loader, urls, onProgress) {
  return new Promise(function (resolve) {
    let i = 0;
    function next() {
      if (i >= urls.length) { resolve(null); return; }
      const url = urls[i++];
      try {
        loader.load(url, function (gltf) {
          if (gltf && gltf.scene) resolve(gltf);
          else next();
        }, onProgress, next);
      } catch (e) { next(); }
    }
    next();
  });
}

/* Görünür mesh'lerin birleşik kutusu (gizli parçalar hesaba katılmaz) */
function visibleBox(root) {
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse(function (o) {
    if (!o.isMesh || !o.geometry) return;
    let p = o, vis = true, ignored = false;
    while (p) {
      if (p.userData && p.userData.ignoreBox) { ignored = true; break; }
      if (p.visible === false) { vis = false; break; }
      p = p.parent;
    }
    if (ignored || !vis) return;
    tmp.setFromObject(o);
    if (!tmp.isEmpty()) box.union(tmp);
  });
  return box;
}

/* Bir düğümün kendi yerel uzayındaki birleşik kutu (üst ölçekler hariç).
   Jant ekseni için ve teşhis panelinde kullanılır. */
export function localBox(node) {
  const box = new THREE.Box3();
  try {
    node.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(node.matrixWorld).invert();
    const m = new THREE.Matrix4();
    node.traverse(function (o) {
      if (!o.isMesh || !o.geometry) return;
      /* görünmez parçalar (yer düzlemi) ve sahne yardımcıları
         (ışık huzmesi, zemin ışığı) hesaba girmez */
      let p = o, vis = true;
      while (p && p !== node) {
        if (p.userData && p.userData.ignoreBox) { vis = false; break; }
        if (p.visible === false) { vis = false; break; }
        p = p.parent;
      }
      if (!vis) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      if (!o.geometry.boundingBox) return;
      o.updateWorldMatrix(true, false);
      m.multiplyMatrices(inv, o.matrixWorld);
      const b = o.geometry.boundingBox.clone().applyMatrix4(m);
      if (!b.isEmpty()) box.union(b);
    });
  } catch (e) { }
  return box;
}

function hideGround(root) {
  root.traverse(function (o) {
    if (!o.isMesh) return;
    const name = (o.name || "").toLowerCase();
    const matName = o.material && o.material.name ? String(o.material.name).toLowerCase() : "";
    if (/asphalt|ground|floor|plane/.test(name) || /asphalt|ground|floor/.test(matName)) {
      o.visible = false;
    }
  });
}

export function prepareCar(scene3d) {
  const outer = new THREE.Group();      // yön düzeltmesi (ön daima +Z)
  outer.add(scene3d);

  scene3d.traverse(function (o) {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
      o.frustumCulled = true;
    }
  });

  hideGround(scene3d);

  /* ---- ölçek: uzun eksen CFG.car.length olacak ---- */
  let box = visibleBox(outer);
  if (box.isEmpty()) box = new THREE.Box3().setFromObject(outer);
  const raw = new THREE.Vector3();
  box.getSize(raw);
  const longest = Math.max(raw.x, raw.z, 1e-6);
  let scale = CFG.car.length / longest;
  if (!isFinite(scale) || scale <= 0) scale = 1;
  scale = Math.max(Math.min(scale, 200), 0.002);
  scene3d.scale.setScalar(scale);

  /* ---- merkezle ve tabanı sıfıra oturt ---- */
  box = visibleBox(outer);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  scene3d.position.x -= center.x;
  scene3d.position.z -= center.z;
  scene3d.position.y -= box.min.y;

  /* ---- parçaları ve materyalleri sınıflandır ---- */
  /* lights: MATERYAL listesi (ışık kontrolü materyalde yapılır).
     lightMeshes: aynı grupların mesh listesi (kutu/yön hesabı için).
     Çoklu materyalli tek mesh'lerde (Audi, VW, Porsche) bu ayrım
     şart: yoksa krom ve lastik de beraberinde yanardı.
     "lens" grubu bir TOPLAMA ALANIDIR: lamba camı olduğu anlaşılan ama
     hangi uçta durduğu isimden bilinmeyen materyaller önce buraya girer,
     sonra KONUMA göre gerçek gruplara dağıtılır (aşağıda). */
  const parts = {
    paint: [], glass: [], rim: [], tyre: [], interior: [], body: [],
    lights: { low: [], high: [], drl: [], glow: [], brake: [], reverse: [], signalL: [], signalR: [], lens: [] },
    lightMeshes: { low: [], high: [], drl: [], glow: [], brake: [], reverse: [], signalL: [], signalR: [], lens: [] },
  };
  const kindOfMaterial = new Map();

  scene3d.traverse(function (o) {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(function (m) {
      if (kindOfMaterial.has(m)) return;
      const kind = classifyKind(m.name || "");
      kindOfMaterial.set(m, kind);
      if (parts.lights[kind]) {
        parts.lights[kind].push(m);
        parts.lightMeshes[kind].push(o);
      } else if (parts[kind]) parts[kind].push(o);
    });
  });

  /* ---- ön yön: modeli +Z'ye çevir ----
     Işık donanımı, kamera odakları ve kılavuz çizgileri "+Z = ön"
     kabulüne dayanır; bu adım yanlış olursa "Far"a basınca huzme
     arabanın arkasından çıkardı. */
  outer.updateMatrixWorld(true);
  const carBox = visibleBox(outer);
  const carCenter = new THREE.Vector3();
  const carSize = new THREE.Vector3();
  carBox.getCenter(carCenter);
  carBox.getSize(carSize);

  const axisX = carSize.x > carSize.z;
  const front = detectFront(parts, carCenter, carSize, scene3d) || 1;
  outer.rotation.y = axisX ? -Math.atan2(front, 0) : -Math.atan2(0, front);

  /* ---- lamba camları ve isimsiz modeller: geometriden sezgi ----
     İki durumda gerekir:
       • adıyla hiç lamba bulunamadı (BMW M5, Maybach: "TEX.010",
         "Mphong3SG1") → TAM tarama: konum + parlaklık konuşur
       • isimden "lens" çıkan ama hangi uçta durduğu bilinmeyen lamba
         camları ("glass_light", "light_glasss", "red_glass") →
         yalnızca onlar konuma göre dağıtılır
     Bu adım DÖNÜŞTEN SONRA çalışır: +Z = ön, +X = sağ. */
  const staged = parts.lights.lens.slice();
  const fullScan = !parts.lights.low.length && !parts.lights.high.length && !parts.lights.drl.length &&
    !parts.lights.brake.length && !parts.lights.reverse.length &&
    !parts.lights.signalL.length && !parts.lights.signalR.length;
  if (fullScan || staged.length) {
    outer.updateMatrixWorld(true);
    const geoBox = visibleBox(outer);
    if (!geoBox.isEmpty()) {
      classifyLightsByGeometry(
        scene3d, parts, kindOfMaterial,
        geoBox.getCenter(new THREE.Vector3()),
        geoBox.getSize(new THREE.Vector3()),
        staged, fullScan
      );
    }
  }
  /* Toplama alanı işini bitirdi. Dağıtılamayanlar (iki uçta da
     olmayan lamba camları) hiçbir gruba yazılmaz: dokunulmayınca
     modelin kendi görünümü korunur. Alan tamamen silinir ki
     kalibrasyon onları "lamba" sanmasın. */
  delete parts.lights.lens;
  delete parts.lightMeshes.lens;

  /* ---- materyal kalibrasyonu (sınıf değiştirmeden) ---- */
  const materials = [];
  kindOfMaterial.forEach(function (kind, m) {
    materials.push(m);
    try {
      if (kind === "glass") {
        m.transparent = true;
        m.opacity = 0.42;
        m.depthWrite = false;
        if (m.color) m.color.setHex(0x0d1119);
        if ("metalness" in m) m.metalness = 0.1;
        if ("roughness" in m) m.roughness = 0.06;
        m.envMapIntensity = 1.4;
        m.side = THREE.DoubleSide;
      } else if (kind === "paint") {
        /* Otomotiv boyası AYNA DEĞİLDİR. Audi'nin boya materyali 0,035
           pürüzlülükle geliyordu; eski üst sınır 0,04 olduğu için boya
           cilalı plastik gibi davranıp stüdyo ışıklarını kaputta sert
           beyaz lekeler hâlinde yansıtıyordu ("dokular saçma"). Gerçek
           boya 0,14–0,32 pürüzlülükte yumuşak bir parlaklık verir. */
        m.envMapIntensity = 1.05;
        if ("roughness" in m) m.roughness = Math.min(Math.max(m.roughness, 0.14), 0.32);
        if ("metalness" in m) {
          m.metalness = Math.min(Math.max(m.metalness, 0.35), 0.75);
        }
      } else if (kind === "rim") {
        m.envMapIntensity = 1.45;
        if ("metalness" in m) m.metalness = Math.max(m.metalness, 0.8);
        if ("roughness" in m) m.roughness = Math.min(Math.max(m.roughness, 0.06), 0.42);
      } else if (kind === "tyre") {
        m.envMapIntensity = 0.25;
        if ("roughness" in m) m.roughness = 0.95;
        if ("metalness" in m) m.metalness = 0.0;
      } else if (kind === "interior") {
        m.envMapIntensity = 0.55;
      } else if (kind === "trim") {
        /* karbon/kevlar: mat siyah değil, yarı parlak bir derinlik */
        m.envMapIntensity = 1.1;
        if ("metalness" in m) m.metalness = Math.min(Math.max(m.metalness, 0.30), 0.85);
        if ("roughness" in m) m.roughness = Math.min(Math.max(m.roughness, 0.12), 0.52);
      } else if (parts.lights[kind]) {
        m.emissive = m.emissive || new THREE.Color(0x000000);
        m.userData.baseEmissive = m.emissive.clone();
        m.userData.basePower = typeof m.emissiveIntensity === "number" ? m.emissiveIntensity : 1;
        m.toneMapped = false;
      } else {
        if ("envMapIntensity" in m) m.envMapIntensity = 0.75;
      }
      m.needsUpdate = true;
    } catch (e) { }
  });

  /* Geometriden bulunan lambaların materyalleri de kalibrasyon
     defterine girer: kapatınca ilk hâillerine dönebilsinler. */
  Object.keys(parts.lights).forEach(function (key) {
    parts.lights[key].forEach(function (m) {
      if (!m || (m.userData && m.userData.baseEmissive)) return;
      const known = Object.keys(parts.lights).some(function (k2) {
        return kindOfMaterial.get(m) === k2;
      });
      if (known) return;
      kindOfMaterial.set(m, key);
      materials.push(m);
      try {
        m.emissive = m.emissive || new THREE.Color(0x000000);
        m.userData.baseEmissive = m.emissive.clone();
        m.userData.basePower = typeof m.emissiveIntensity === "number" ? m.emissiveIntensity : 1;
        m.toneMapped = false;
        m.needsUpdate = true;
      } catch (e) { }
    });
  });

  /* Lamba camları ton eşlemesine döner: parlaklık kırpılmaz, yuvarlanır.
     (Aksi hâlde kocaman bir lamba gövdesi tam beyaz bir leke olurdu.) */
  Object.keys(parts.lights).forEach(function (key) {
    parts.lights[key].forEach(function (m) {
      if (m && m.userData && m.userData.lensCover) m.toneMapped = true;
    });
  });

  /* ---- jantlar ----
     Dönüş ekseni düğümün KENDİ yerel uzayında bulunur; böylece
     podyum dönerken de eksen doğru kalır. En ince eksen aks eksenidir. */
  const wheels = [];
  outer.updateMatrixWorld(true);
  const carSpan = Math.max(carSize.x, carSize.z) || 1;
  scene3d.traverse(function (o) {
    const toks = nameTokens(o.name || "");
    /* Fren parçaları tekerlekle birlikte DÖNMEZ (kaliper sabittir):
       karışıklık olmasın diye hiç aday olmazlar. */
    if (toks.some(function (t) { return /^(brakes?|discs?|disks?|rotors?|calipers?|clippers?)$/.test(t); })) return;
    /* Tekerlek parçası adları: Wheel_FL, 3DWheel_Front_L, Rim_FL_C7M19,
       Tire_FR_C7M_Tires, esr cs1 gloss black… Golf'te olduğu gibi LASTİK
       ve JANT AYRI düğümlerse ikisi de aday olmalı; yoksa lastik döner,
       jant yerinde kalır (bildirilen hata). Ad tutmuyorsa altındaki
       jant/lastik MATERYALİNE bakılır. */
    let named = wheelish(o.name || "");
    const world = new THREE.Box3().setFromObject(o);
    if (world.isEmpty()) return;
    const center = world.getCenter(new THREE.Vector3());
    const ws = world.getSize(new THREE.Vector3());
    const radius = Math.max(ws.x, ws.y, ws.z) / 2;
    const span = Math.max(ws.x, ws.y, ws.z);

    /* Boyut şartı HER İKİ yolda da geçerli: adı "Tires" olan tek bir
       düğüm dört lastiği birden taşıyabilir. Tek tekerlek, arabanın
       en büyük ekseninin dörtte birinden küçük olmak zorunda. */
    if (span > carSpan * 0.30) return;

    if (!named) {
      /* Ad tutmuyorsa jant/lastik MATERYALİNE bakılır; mesh de olabilir. */
      o.traverse(function (c) {
        if (named || !c.isMesh || !c.material) return;
        const mats = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach(function (m) {
          if (m && wheelishMaterial(m.name)) named = true;
        });
      });
      if (!named) return;
    }

    /* Tekerlek YUVARLAKTIR: en büyük iki kenarı birbirine yakın olmalı.
       "Wheel arch" kaplaması, marşpiyel gibi uzun "wheel" adlı parçalar
       bu testte elenir — eskiden adı tutan her parça dönüyordu. */
    const dims = [ws.x, ws.y, ws.z].sort(function (a, b) { return a - b; });
    if (dims[2] > 1e-4 && Math.abs(dims[1] - dims[2]) > dims[2] * 0.45) return;

    /* Kabin eleme kuralı: "wheel" adlı KOLTUK/DEKSİYON parçaları (Audi:
       "Artificial leather for wheel" = direksiyon) tabandan çok yukarıda
       durur. Sınır GEVŞEKTİR: jant lastiğin İÇİNDE oturur, yarıçapı
       lastiğinkinden küçük olduğu için sıkı bir "yarıçap kadar yüksek"
       kuralı gerçek jantları da eliyordu (Golf'te tam bu oluyordu).
       Kesin ölçü aşağıdaki "arabanın alt yarısı" şartıdır. */
    const centerY = center.y - (carCenter.y - carSize.y / 2);   /* tabana göre yükseklik */
    if (radius > 1e-3 && centerY > radius * 2.5) return;
    if (carSize.y > 1e-3 && centerY > carSize.y * 0.55) return;  /* tekerlek alt yarıda durur */

    const local = localBox(o);
    let axis = new THREE.Vector3(0, 0, 1);
    if (!local.isEmpty()) {
      const ls = local.getSize(new THREE.Vector3());
      if (ls.x <= ls.y && ls.x <= ls.z) axis.set(1, 0, 0);
      else if (ls.y <= ls.x && ls.y <= ls.z) axis.set(0, 1, 0);
    }
    /* Ön/arka, yön düzeltmesinden SONRAKİ konuma göre belirlenir:
       isim (ft/bk) yanıltıcı olabilir, konum olamaz. */
    const front = Math.abs(center.z) > 0.05 ? center.z > 0 : /ft|front|vorn/.test(nm);
    wheels.push({
      node: o,
      axis: axis.normalize(),
      radius: radius,
      center: center,
      front: front,
    });
  });

  /* Aynı tekerleğin hem grubu hem alt mesh'i aday olmuşsa yalnızca
     en üstteki kalır: yoksa dönüş iki kez uygulanır (çift hız). */
  const kept = wheels.filter(function (w) {
    return !wheels.some(function (other) {
      if (other === w) return false;
      let p = w.node.parent;
      while (p) { if (p === other.node) return true; p = p.parent; }
      return false;
    });
  });
  wheels.length = 0;
  Array.prototype.push.apply(wheels, kept);

  /* ---- son ölçü: yön düzeltmesinden SONRAKİ çerçevede ----
     (önü +X'te olan modellerde genişlik/uzunluk yer değiştirdiği için
     gölge, kadraj ve ışık konumları yanlış hesaplanıyordu.) */
  outer.updateMatrixWorld(true);
  const finalBox = visibleBox(outer);
  const finalSize = new THREE.Vector3();
  const finalCenter = new THREE.Vector3();
  if (!finalBox.isEmpty()) {
    finalBox.getSize(finalSize);
    finalBox.getCenter(finalCenter);
  } else {
    finalSize.copy(carSize);
    finalCenter.copy(carCenter);
  }

  /* ---- İKİNCİ GEÇİŞ taban düzeltmesi ----
     İlk geçişte quantization kırpıklığı veya gövdeye gömülü root
     kaymaları (Audi: root Y +0.17) tabanı +0,14 m yukarı ölçebiliyor;
     araba podyuma gömülüyor ve "alt yarısı yok" görünüyor. Kutu,
     dönüşten sonra bir kez daha ölçülüp taban gerçekten sıfıra
     oturtulur; X/Z merkezlemesi ilk geçişte zaten doğru. */
  if (!finalBox.isEmpty() && Math.abs(finalBox.min.y) > 1e-4) {
    scene3d.position.y -= finalBox.min.y;
    outer.updateMatrixWorld(true);
    const reBox = visibleBox(outer);
    if (!reBox.isEmpty()) {
      reBox.getSize(finalSize);
      reBox.getCenter(finalCenter);
    }
  }

  /* ---- huzme/hale odağı: dönüşten SONRAKİ çerçevede (+Z = ön) ----
     Yalnızca ön uçta toplanan lamba parçalarından türetilir; bütün
     gövdeyi kaplayan ışık parçaları odağı arabanın ortasına
     çekiyordu. Bulunamazsa ön ucun ortası kullanılır. */
  const anchorBox = frontLightBox(parts, finalCenter, finalSize);
  const lightAnchor = {
    x: 0,
    y: Math.max(0.35, finalSize.y * 0.5),
    z: Math.max(0.5, finalSize.z * 0.5 - 0.05),
    spread: 0.62,
  };
  if (!anchorBox.isEmpty()) {
    const ac = anchorBox.getCenter(new THREE.Vector3());
    const asz = anchorBox.getSize(new THREE.Vector3());
    /* TEK TARAFLI tespit düzeltmesi: bazı modellerde (Audi) yalnızca bir
       far materyali ad yakalar; odağı sağ fara hapseder. Lambalar daima
       simetrik olduğundan |x| gövde genişliğinin %12'sini aşarsa odağı
       merkeze çek; huzme iki farın ortasından çıkar. */
    const ax = Math.abs(ac.x) > finalSize.x * 0.12 ? 0 : ac.x;
    lightAnchor.x = Math.max(-0.95, Math.min(0.95, ax));
    lightAnchor.y = Math.max(0.32, ac.y);
    lightAnchor.z = Math.max(0.5, Math.abs(ac.z));
    lightAnchor.spread = Math.max(0.42, Math.min(1.1, asz.x * 0.34));
  }

  const spin = CFG.motion.wheelSpinIdle;

  return {
    object: outer,
    inner: scene3d,
    parts: parts,
    materials: materials,
    wheels: wheels,
    size: finalSize,
    center: finalCenter,
    lightAnchor: lightAnchor,
    front: new THREE.Vector3(0, 0, 1),   // yön düzeltmesinden sonra daima +Z
    spin: spin,
  };
}

/* Sahneden sökerken GPU belleğini bırak */
export function disposeCar(car) {
  if (!car) return;
  car.object.traverse(function (o) {
    if (o.isMesh) {
      try { if (o.geometry) o.geometry.dispose(); } catch (e) { }
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(function (m) {
        if (!m) return;
        for (const k in m) {
          const v = m[k];
          if (v && v.isTexture) { try { v.dispose(); } catch (e) { } }
        }
        try { m.dispose(); } catch (e) { }
      });
    }
  });
  if (car.object.parent) car.object.parent.remove(car.object);
}
