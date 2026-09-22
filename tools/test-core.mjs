#!/usr/bin/env node
/* ============================================================
   Çekirdek mantık testleri (tarayıcı gerekmez).

   Burada en kırılgan kısımlar sınanır:
     • model ölçekleme / merkezleme / podyuma oturma (birimden bağımsız)
     • ön yön tespiti (far konumundan) ve +Z'ye çevrilmesi
     • parça ve materyal sınıflandırması
     • jant aks ekseninin yerel uzayda bulunması
     • kamera odaklarının kutup/azimut sınırları içinde kalması
     • performans kademelerinin düşme ve geri yükselme davranışı
     • akıllı tahta sınıflandırması (Faz 1/2 güvenli başlangıç profili)
     • konsept maketin sahne arayüzünü doğru doldurması

   Kullanım:  node tools/test-core.mjs
   ============================================================ */

import * as THREE from "../vendor/three/three.module.js";
import { CFG, level as levelOf, guessStartLevel, deviceClass, parseLevel } from "../src/config.js";
import { prepareCar, classifyKind } from "../src/scene/car.js";
import { buildConceptCar } from "../src/scene/concept.js";
import { computeAnchors } from "../src/scene/focus.js";
import { createMonitor } from "../src/perf/monitor.js";
import { CATEGORIES, BRANDS } from "../src/data/brands.js";
import { createLighting } from "../src/scene/effects.js";
import { createWheels } from "../src/scene/wheels.js";
import { emblemSVG, emblemDataURI, hasEmblem } from "../src/ui/emblems.js";
import fs from "node:fs";

let pass = 0, fail = 0;
const EPS = 1e-3;

function ok(cond, label, extra) {
  if (cond) { pass++; console.log("  ✔ " + label); }
  else { fail++; console.log("  ✗ " + label + (extra !== undefined ? "  → " + extra : "")); }
}
function near(a, b, eps, label) {
  ok(Math.abs(a - b) <= (eps || EPS), label, "beklenen " + b + ", gelen " + a);
}
function section(t) { console.log("\n" + t); }

/* ---------------- sahte model (santimetre biriminde) ---------------- */
function fakeModel(nodeName) {
  const root = new THREE.Group();

  /* yerdeki asfalt düzlemi — gizlenmeli */
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshStandardMaterial({ name: "Asphalt.003" })
  );
  plane.name = "Plane";
  plane.rotation.x = -Math.PI / 2;
  root.add(plane);

  /* gövde: uzunluk Z, genişlik X (ön +Z) */
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(190, 100, 440),
    new THREE.MeshStandardMaterial({ name: "w206_paint", metalness: 0.4, roughness: 0.6 })
  );
  body.position.y = 100;
  root.add(body);

  /* cam */
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(170, 60, 210),
    new THREE.MeshStandardMaterial({ name: "w206_glass" })
  );
  glass.position.y = 165;
  root.add(glass);

  /* iç mekân */
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(140, 50, 120),
    new THREE.MeshStandardMaterial({ name: "w206_leather_black" })
  );
  seat.position.set(0, 118, -30);
  root.add(seat);

  /* farlar (+Z) ve stoplar (−Z) */
  [1, -1].forEach(function (s) {
    const low = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 12), new THREE.MeshStandardMaterial({ name: "w206_lowbeam" }));
    low.position.set(s * 60, 92, 220);
    root.add(low);
    const drl = new THREE.Mesh(new THREE.BoxGeometry(40, 8, 10), new THREE.MeshStandardMaterial({ name: "w206_drl_L" }));
    drl.position.set(s * 60, 72, 218);
    root.add(drl);
    const brake = new THREE.Mesh(new THREE.BoxGeometry(44, 18, 12), new THREE.MeshStandardMaterial({ name: "w206_red" }));
    brake.position.set(s * 62, 96, -220);
    root.add(brake);
  });

  /* jantlar: silindirin ekseni X (yan eksen) → aks ekseni X olmalı */
  const tyreGeo = new THREE.CylinderGeometry(40, 40, 30, 16);
  tyreGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(22, 22, 32, 10);
  rimGeo.rotateZ(Math.PI / 2);
  const corners = [["ft", "l", 1, 1], ["ft", "r", 1, -1], ["bk", "l", -1, 1], ["bk", "r", -1, -1]];
  corners.forEach(function (c) {
    const g = new THREE.Group();
    g.name = "w206_Wheel." + (c[0] === "ft" ? "Ft." : "Bk.") + (c[1] === "l" ? "L" : "R");
    const tyre = new THREE.Mesh(tyreGeo, new THREE.MeshStandardMaterial({ name: "Tyre" }));
    const rim = new THREE.Mesh(rimGeo, new THREE.MeshStandardMaterial({ name: "Rim" }));
    g.add(tyre);
    g.add(rim);
    g.position.set(c[3] * 95, 40, c[2] * 150);
    root.add(g);
  });

  const outer = new THREE.Group();
  outer.name = nodeName || "fake";
  outer.add(root);
  return outer;
}

/* Canvas yalnızca doku üretiminde kullanılıyor (ışık donanımı huzme/hale
   dokusu çizer): tarayıcısız testte küçük bir taklit yeterli, GPU'ya hiç
   yüklenmiyor. Işık donanımı testleri ondan ÖNCE çalıştığı için burada,
   dosyanın başında tanımlıdır. */
if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    createElement: function () {
      return {
        width: 0, height: 0,
        getContext: function () {
          return {
            fillStyle: "",
            createRadialGradient: function () { return { addColorStop: function () { } }; },
            createLinearGradient: function () { return { addColorStop: function () { } }; },
            fillRect: function () { },
          };
        },
      };
    },
  };
}

/* ================= 1) model hazırlama ================= */
section("1) Model normalizasyonu (santimetre birimli sahte model)");
const car = prepareCar(fakeModel());

near(car.size.z, CFG.car.length, 0.02, "uzun eksen " + CFG.car.length + " m'ye ölçeklendi (" + car.size.z.toFixed(2) + ")");
ok(car.size.x < car.size.z, "genişlik uzunluktan küçük (" + car.size.x.toFixed(2) + ")");

/* prepareCar kendi çerçevesinde tabanı 0'a oturtur; podyum yüksekliğini
   sahne (carSlot) ekler. Toplam yükseklik = CFG.car.podiumTop + 0. */
const bottom = new THREE.Box3().setFromObject(car.object);
near(bottom.min.y, 0, 0.02, "araba kendi çerçevesinde tabana oturuyor");
ok(CFG.car.podiumTop > 0.2 && CFG.car.podiumTop < 0.6, "podyum yüksekliği makul (" + CFG.car.podiumTop + " m)");
near((bottom.min.x + bottom.max.x) / 2, 0, 0.02, "yatay merkez tam ortada (X)");
near((bottom.min.z + bottom.max.z) / 2, 0, 0.02, "yatay merkez tam ortada (Z)");

let asphaltVisible = null;
car.object.traverse(function (o) {
  if (o.name === "Plane") asphaltVisible = o.visible;
});
ok(asphaltVisible === false, "asfalt düzlemi gizlendi");

ok(car.parts.paint.length === 1, "boya grubu bulundu (1 mesh)", car.parts.paint.length);
/* Boya AYNA olmamalı: 0,04 pürüzlülükte kalan boya stüdyo ışıklarını
   kaputta sert beyaz lekeler hâlinde yansıtıyordu. */
const paintMat = car.parts.paint[0].material;
ok(paintMat.roughness >= 0.139 && paintMat.roughness <= 0.321,
  "boya pürüzlülüğü otomotiv boyası aralığında", paintMat.roughness);
ok(paintMat.metalness >= 0.34 && paintMat.metalness <= 0.76,
  "boya metalliği sınırlar içinde", paintMat.metalness);
ok(car.parts.glass.length === 1, "cam grubu bulundu", car.parts.glass.length);
ok(car.parts.interior.length === 1, "iç mekân grubu bulundu", car.parts.interior.length);
ok(car.parts.lights.low.length === 2, "far (lowbeam) 2 mesh", car.parts.lights.low.length);
ok(car.parts.lights.drl.length === 2, "gündüz farı 2 mesh", car.parts.lights.drl.length);
ok(car.parts.lights.brake.length === 2, "stop lambası 2 mesh", car.parts.lights.brake.length);

section("2) Yön tespiti ve jantlar");
near(car.object.rotation.y, 0, 0.02, "farlar +Z'de olduğu için döndürme gerekmedi");
ok(car.wheels.length === 4, "4 jant bulundu", car.wheels.length);
const frontWheels = car.wheels.filter(function (w) { return w.front; });
ok(frontWheels.length === 2, "ön jantlar doğru işaretlendi", frontWheels.length);
ok(car.wheels.every(function (w) { return Math.abs(w.axis.x) > 0.99; }), "jant aks ekseni yerel X olarak bulundu");
near(car.wheels[0].radius * 2, 0.84, 0.05, "jant çapı modele göre ölçüldü (" + (car.wheels[0].radius * 2).toFixed(2) + " m)");
ok(frontWheels.every(function (w) { return w.center.z > 0.5; }), "ön jantlar +Z tarafında");

/* farlar −Z'ye konursa ön yön 180° dönmeli */
const flipped = fakeModel("flipped");
flipped.traverse(function (o) {
  if (o.isMesh && o.material && /lowbeam|drl/.test(o.material.name)) o.position.z = -Math.abs(o.position.z);
});
const car2 = prepareCar(flipped);
near(Math.abs(car2.object.rotation.y), Math.PI, 0.05, "farlar −Z'deyse model 180° çevrildi");
ok(car2.wheels.filter(function (w) { return w.front; }).every(function (w) { return w.center.z > 0.5; }),
  "yön düzeltmesinden sonra ön jantlar yine +Z'de");

/* ================= 2b) jant dönüşü ve pivot düzeltmesi =================
   Sketchfab/FBX ihracında tekerlek düğümünün orijini arabanın
   merkezinde kalır, geometri düğüme göre kaymıştır. Düğüm kendi
   orijini etrafında dönerse jant arabanın altında daire çizer
   (Porsche 992 GT3 R ve Golf R modellerinde görülen hata).
   Dönüş, geometri merkezine yerleştirilen pivotla yapılmalıdır. */
function offsetWheelModel() {
  const root = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(190, 100, 440),
    new THREE.MeshStandardMaterial({ name: "w206_paint" })
  );
  body.position.y = 100;
  root.add(body);

  const geo = new THREE.CylinderGeometry(40, 40, 30, 16);
  geo.rotateZ(Math.PI / 2);
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c, i) {
    const g = new THREE.Group();
    g.name = "WHEEL_" + (c[0] > 0 ? "F" : "B") + (c[1] > 0 ? "L" : "R") + "_" + i;
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ name: "Tyre" }));
    /* düğüm orijini arabanın ortasında, geometri tekerleğin yerinde */
    mesh.position.set(c[1] * 95, 40, c[0] * 150);
    g.add(mesh);
    root.add(g);
  });

  const outer = new THREE.Group();
  outer.add(root);
  return outer;
}

section("2b) Jant dönüşü (kaymış düğüm orijini)");
const offCar = prepareCar(offsetWheelModel());
const offWheels = createWheels(offCar);
ok(offCar.wheels.length === 4, "kaymış modellerde de 4 jant bulundu", offCar.wheels.length);

function boxOfNode(node) {
  node.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(node);
}
const cBefore = offCar.wheels.map(function (w) { return boxOfNode(w.node).getCenter(new THREE.Vector3()); });
const pBefore = offCar.wheels.map(function (w) { return boxOfNode(w.node).max.clone(); });
for (let i = 0; i < 20; i++) offWheels.update(0.05);   /* 1 sn dönüş */
const cAfter = offCar.wheels.map(function (w) { return boxOfNode(w.node).getCenter(new THREE.Vector3()); });
const pAfter = offCar.wheels.map(function (w) { return boxOfNode(w.node).max.clone(); });

const drift = cBefore.map(function (c, i) { return c.distanceTo(cAfter[i]); });
const moved = pBefore.map(function (p, i) { return p.distanceTo(pAfter[i]); });
ok(Math.max.apply(null, drift) < 0.005,
  "jantlar yerinde dönüyor (en büyük merkez kayması " + Math.max.apply(null, drift).toFixed(4) + " m)");
ok(Math.min.apply(null, moved) > 0.01,
  "jantlar gerçekten dönüyor (en küçük nokta hareketi " + Math.min.apply(null, moved).toFixed(3) + " m)");

/* ================= 2c) tek materyalli lamba gövdesi =================
   Audi TT RS gibi modeller bütün lamba donanımını TEK bir materyalde
   toplar ve o materyal gövde boyunca uzanır. Bu parça "iki uca
   yayılmış" sayılıp dışarıda kalırsa "Far" düğmesi hiçbir şey yakmaz.
   Ön yarısı ayrılıp far grubuna yazılmalı, arka yarısı sönük kalmalı. */
function singleLensModel() {
  const root = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(190, 100, 440),
    new THREE.MeshStandardMaterial({ name: "TEX.001" })
  );
  body.position.y = 100;
  root.add(body);

  /* gövde boyunca uzanan tek lamba gövdesi */
  const lens = new THREE.Mesh(
    new THREE.BoxGeometry(180, 20, 430, 1, 1, 8),
    new THREE.MeshStandardMaterial({ name: "Audi_TTRS_LightA_Material1", transparent: true, opacity: 0.6 })
  );
  lens.position.y = 70;
  root.add(lens);

  /* arka kırmızı cam (sönük bırakılmış) */
  const red = new THREE.Mesh(
    new THREE.BoxGeometry(150, 16, 10),
    new THREE.MeshStandardMaterial({ name: "red_glass", transparent: true, opacity: 0.5 })
  );
  red.position.set(0, 80, -218);
  root.add(red);

  /* ön cam: adı "light" içerse bile BÖLÜNMEMELİ */
  const win = new THREE.Mesh(
    new THREE.BoxGeometry(170, 60, 210),
    new THREE.MeshStandardMaterial({ name: "light_glasss", transparent: true, opacity: 0.42 })
  );
  win.position.y = 165;
  root.add(win);

  const outer = new THREE.Group();
  outer.add(root);
  return outer;
}

section("2c) Tek materyalli lamba gövdesi (Audi tipi)");
const lensCar = prepareCar(singleLensModel());
ok(lensCar.parts.lights.low.length === 1 && /::front$/.test(lensCar.parts.lights.low[0].name || ""),
  "gövde boyunca uzanan lamba materyalinin ÖN parçası far grubuna yazıldı",
  lensCar.parts.lights.low.map(function (m) { return m.name; }).join(","));
ok(lensCar.parts.lights.brake.some(function (m) { return m.name === "red_glass"; }),
  "sönük kırmızı arka cam stop grubuna yazıldı (Stop düğmesi boş kalmadı)");
ok(!lensCar.parts.lights.low.concat(lensCar.parts.lights.drl).some(function (m) { return m.name === "light_glasss"; }),
  "adında glass geçen cam far grubuna yazılmadı");
let splitGroups = null;
(lensCar.inner || lensCar.object).traverse(function (o) {
  if (o.isMesh && o.material && Array.isArray(o.material)) splitGroups = o.geometry.groups.length;
});
ok(splitGroups === 2, "bölünen mesh iki gruba ayrıldı (ön / geri kalan)", splitGroups);

/* Lamba CAMI tam güçte yanmaz: Audi'de bütün lamba donanımı tek materyalde
   olduğu için tam güçte tamponun yarısı bembeyaz bir leke oluyordu. */
const lensLight = createLighting(lensCar);
const cover = lensCar.parts.lights.low[0];
lensLight.toggleLow();
ok(cover.userData && cover.userData.lensCover === true, "lamba camı işaretlendi (lensCover)");
ok(cover.toneMapped === true, "lamba camında ton eşlemesi açık (parlaklık kırpılmaz)");
ok(cover.emissiveIntensity > 0.4 && cover.emissiveIntensity < 4.6,
  "lamba camı kısılmış güçle yanıyor", cover.emissiveIntensity);

/* ================= 2d) isim çözümleme ve jant eşleşmesi =================
   Gerçek ihraçlarda adlar tahmin edilemez: "…_Paint_Material1",
   "RRim_FL_C7M19", "windows", "light_glasss". Bu testler bildirilen
   üç hatayı kilitler: Audi'nin kalibresiz boyası, VW'nin beyaz camları
   ve Golf'te dönmeyen jant. */
section("2d) İsim çözümleme (gerçek ihraç adları)");
ok(classifyKind("TTAudi_TTRSCoupeIERewardRecycled_2023Paint_Material1") === "paint",
  "Audi'nin \"…_Paint_Material1\" materyali boya sayıldı",
  classifyKind("TTAudi_TTRSCoupeIERewardRecycled_2023Paint_Material1"));
ok(classifyKind("Coloured_Material1") === "paint", "ikincil boya (\"Coloured\") boya grubunda");
ok(classifyKind("EXT_Carpaint_Inst") === "paint", "camelCase boya adı bulundu", classifyKind("EXT_Carpaint_Inst"));
ok(classifyKind("windows") === "glass" && classifyKind("WindowA_Material1") === "glass",
  "VW/Audi camları cam sayıldı (bembeyaz camlar bitti)");
ok(classifyKind("light_glasss") === "lens" && classifyKind("glass_light") === "lens",
  "lamba camları lens olarak ayrıldı (pencere değil)");
ok(classifyKind("GrilleNoAlpha2A_Material1") === "rim" && classifyKind("trim") === "rim",
  "ızgara/krom parçaları metal grubunda",
  classifyKind("GrilleNoAlpha2A_Material1") + "/" + classifyKind("trim"));
ok(classifyKind("Tile_Floor") === "body", "bilinmeyen ad gövdeye düşüyor");

/* Golf'te lastik ve jant AYRI kardeş düğümlerdir (RTire_…, RRim_…):
   eskiden yalnızca lastik bulunuyor, jant yerinde kalıyordu. */
function separateWheelModel() {
  const root = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(190, 100, 440),
    new THREE.MeshStandardMaterial({ name: "CarPaint" })
  );
  body.position.y = 100;
  root.add(body);

  const tyreGeo = new THREE.CylinderGeometry(40, 40, 30, 16);
  tyreGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(22, 22, 32, 10);
  rimGeo.rotateZ(Math.PI / 2);

  [["FL", 1, 1], ["FR", 1, -1], ["RL", -1, 1], ["RR", -1, -1]].forEach(function (c) {
    const tyre = new THREE.Mesh(tyreGeo, new THREE.MeshStandardMaterial({ name: "tire" }));
    tyre.name = "RTire_" + c[0] + "_C7M_Tires_Mesh_1";
    tyre.position.set(c[2] * 95, 40, c[1] * 150);
    root.add(tyre);

    /* jantın materyali paylaşılan atlas: ad yüzünden tanınmalı */
    const rim = new THREE.Mesh(rimGeo, new THREE.MeshStandardMaterial({ name: "atlas" }));
    rim.name = "RRim_" + c[0] + "_C7M19_Material_Atlas_Mesh_2";
    rim.position.set(c[2] * 95, 40, c[1] * 150);
    root.add(rim);
  });

  /* "Wheel arch" kaplaması: adı tekerlek gibi ama YUVARLAK DEĞİL */
  const arch = new THREE.Mesh(
    new THREE.BoxGeometry(120, 12, 60),
    new THREE.MeshStandardMaterial({ name: "TEX.7" })
  );
  arch.name = "WheelArch_Trim_L";
  arch.position.set(95, 60, 150);
  root.add(arch);

  const outer = new THREE.Group();
  outer.add(root);
  return outer;
}

function cornerPoints(node) {
  node.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(node.matrixWorld).invert();
  const m = new THREE.Matrix4();
  const local = new THREE.Box3();
  node.traverse(function (o) {
    if (!o.isMesh || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
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

section("2e) Golf tipi jant + lastik ayrımı");
const sepCar = prepareCar(separateWheelModel());
ok(sepCar.wheels.length === 8, "lastik ve jant ayrı düğümken ikisi de bulundu (4+4)",
  sepCar.wheels.length + " → " + sepCar.wheels.map(function (w) { return w.node.name.slice(0, 12); }).join(", "));
ok(!sepCar.wheels.some(function (w) { return /arch/i.test(w.node.name || ""); }),
  "çamurluk kaplaması jant sayılmadı");
const sepInst = createWheels(sepCar);
const sepCorners = sepCar.wheels.map(function (w) { return cornerPoints(w.node); });
const sepCenters = sepCorners.map(function (p) { return new THREE.Box3().setFromPoints(p).getCenter(new THREE.Vector3()); });
for (let i = 0; i < 20; i++) sepInst.update(0.05);
let sepDrift = 0, sepSpinning = 0;
sepCar.wheels.forEach(function (w, i) {
  const now = cornerPoints(w.node);
  const c1 = new THREE.Box3().setFromPoints(now).getCenter(new THREE.Vector3());
  sepDrift = Math.max(sepDrift, sepCenters[i].distanceTo(c1));
  let moved = 0;
  for (let k = 0; k < 8; k++) moved = Math.max(moved, sepCorners[i][k].distanceTo(now[k]));
  if (moved > 0.01) sepSpinning++;
});
ok(sepDrift < 0.005, "sekiz parça da yerinde dönüyor (kayma " + sepDrift.toFixed(4) + " m)");
ok(sepSpinning === 8, "hem lastik hem jant dönüyor", sepSpinning);

/* ================= 2f) iki uçta paylaşılan lamba materyali =================
   VW'nin "Glow"u gibi tek materyal hem önde hem arkada kullanılırsa,
   "Far"a basınca arka lamba da beyaz yanardı. Materyal iki uç için
   kopyalanmalı. */
function sharedLensModel() {
  const root = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(190, 100, 440),
    new THREE.MeshStandardMaterial({ name: "CarPaint" })
  );
  body.position.y = 100;
  root.add(body);

  const shared = new THREE.MeshStandardMaterial({ name: "Glow", emissive: 0x555555 });
  const front = new THREE.Mesh(new THREE.BoxGeometry(60, 20, 12), shared);
  front.position.set(0, 80, 220);
  root.add(front);
  const rear = new THREE.Mesh(new THREE.BoxGeometry(60, 20, 12), shared);
  rear.position.set(0, 80, -220);
  root.add(rear);

  const outer = new THREE.Group();
  outer.add(root);
  return outer;
}

section("2f) İki uçta paylaşılan lamba materyali");
const sharedCar = prepareCar(sharedLensModel());
ok(sharedCar.parts.lights.low.length === 1 && sharedCar.parts.lights.reverse.length === 1,
  "paylaşılan materyal ön (far) ve arka (geri vites) grubuna yazıldı",
  "low=" + sharedCar.parts.lights.low.length + " reverse=" + sharedCar.parts.lights.reverse.length);
ok(sharedCar.parts.lights.low[0] !== sharedCar.parts.lights.reverse[0],
  "iki uçtaki parça aynı materyali paylaşmıyor (kopyalandı)");

/* ================= 3) konsept maket ================= */
section("3) Konsept maket (model dosyası yokken)");
const concept = buildConceptCar({ accentHex: 0xd4af37, mono: "MB" });
const cbox = new THREE.Box3().setFromObject(concept.object);
near(cbox.min.y, 0, 0.06, "konsept maket zemine oturuyor");
ok(concept.size.z > 4.0 && concept.size.z < 5.2, "konsept uzunluk makul (" + concept.size.z.toFixed(2) + " m)");
ok(concept.wheels.length === 4, "konsept 4 jant", concept.wheels.length);
ok(concept.parts.lights.low.length === 2 && concept.parts.lights.brake.length === 2, "konsept far/stop grupları hazır");
ok(concept.parts.lights.signalL.length === 1 && concept.parts.lights.signalR.length === 1, "konsept sinyal grupları hazır");
ok(concept.wheels.every(function (w) { return Math.abs(w.axis.x) > 0.99; }), "konsept jant ekseni X");
/* konsept maketin jantları orijinde ortalanmış: pivot eklenmemeli */
const conceptWheels = createWheels(concept);
const conceptBefore = concept.wheels.map(function (w) { return boxOfNode(w.node).getCenter(new THREE.Vector3()); });
for (let i = 0; i < 20; i++) conceptWheels.update(0.05);
const conceptDrift = conceptBefore.map(function (c, i) { return c.distanceTo(boxOfNode(concept.wheels[i].node).getCenter(new THREE.Vector3())); });
ok(Math.max.apply(null, conceptDrift) < 0.005,
  "konsept jantlar yerinde dönüyor (" + Math.max.apply(null, conceptDrift).toFixed(4) + " m)");

/* ================= 4) kamera odakları ================= */
section("4) Kamera odakları (kutup/azimut sınırları)");
const wideCam = new THREE.PerspectiveCamera(38, 1.78, 0.1, 90);
const narrowCam = new THREE.PerspectiveCamera(38, 0.5, 0.1, 90);
[["gerçek model", car], ["konsept maket", concept]].forEach(function (pair) {
  const anchors = computeAnchors(pair[1], wideCam).views;
  Object.keys(anchors).forEach(function (key) {
    const a = anchors[key];
    const off = new THREE.Vector3().subVectors(a.position, a.target);
    const dist = off.length();
    const polar = Math.acos(Math.max(-1, Math.min(1, off.y / dist)));
    const azim = Math.atan2(off.x, off.z);
    const inPolar = polar >= CFG.camera.minPolar - 0.02 && polar <= CFG.camera.maxPolar + 0.02;
    const inAzim = azim >= CFG.camera.minAzimuth - 0.02 && azim <= CFG.camera.maxAzimuth + 0.02;
    ok(inPolar && inAzim && dist > 2.5 && dist < 13,
      pair[0] + " · " + key + " odak sınırlar içinde",
      "polar " + polar.toFixed(2) + " azimut " + azim.toFixed(2) + " uzaklık " + dist.toFixed(2));
  });
});

/* ================= 4b) kılavuz çizgisi işaret noktaları ================= */
section("4b) Bilgi kartı işaret noktaları");
[['gerçek model', car], ['konsept maket', concept]].forEach(function (pair) {
  const res = computeAnchors(pair[1], wideCam);
  const missingView = CATEGORIES.filter(function (c) { return !res.views[c.focus]; });
  const missingPoint = CATEGORIES.filter(function (c) { return !res.points[c.id]; });
  ok(missingView.length === 0, pair[0] + ": her kategori için kamera odakı var",
    missingView.map(function (c) { return c.focus; }).join(","));
  ok(missingPoint.length === 0, pair[0] + ": her kategori için işaret noktası var",
    missingPoint.map(function (c) { return c.id; }).join(","));
  const bad = CATEGORIES.filter(function (c) {
    const v = res.points[c.id].v;
    return !isFinite(v.x) || !isFinite(v.y) || !isFinite(v.z) || v.length() > 6;
  });
  ok(bad.length === 0, pair[0] + ": işaret noktaları arabanın sınırları içinde",
    bad.map(function (c) { return c.id + "(" + res.points[c.id].v.length().toFixed(2) + ")"; }).join(" "));
});

/* dar/dikey ekranda kamera uzaklaşmalı, yoksa araba kırpılır */
const wideHero = computeAnchors(car, wideCam).views.hero;
const narrowHero = computeAnchors(car, narrowCam).views.hero;
const wideDist = wideHero.position.distanceTo(wideHero.target);
const narrowDist = narrowHero.position.distanceTo(narrowHero.target);
ok(narrowDist > wideDist * 1.5,
  "dar ekranda kamera uzaklaşıyor (geniş " + wideDist.toFixed(1) + " m → dar " + narrowDist.toFixed(1) + " m)");
ok(isFinite(wideDist) && wideDist > 3 && wideDist < 14, "geniş ekran kadrajı makul", wideDist.toFixed(2));

/* ================= 5) performans kademeleri ================= */
section("5) Performans kademeleri");
let now = 0;
const realPerf = globalThis.performance;
globalThis.performance = { now: function () { return now; } };

const events = [];
const monitor = createMonitor({ startLevel: 0, onLevel: function (lv) { events.push(lv); } });

function run(seconds, fps) {
  const step = 1000 / fps;
  const steps = Math.round((seconds * 1000) / step);
  for (let i = 0; i < steps; i++) {
    now += step;
    monitor.update();
  }
}

run(4, 12);            /* 12 FPS: 3 örnek sonrası kademe düşmeli */
ok(monitor.level === 1, "düşük FPS'te kalite kademesi düştü", monitor.level);
run(4, 12);
ok(monitor.level === 2, "ısrar eden düşük FPS'te Hafif kademeye inildi", monitor.level);
/* En kötü durum: Faz 1 tahtası hâlâ 26 FPS tutturamıyorsa son
   kademeye (Tahta) kadar inilmeli — takılma yerine düşük çözünürlük. */
run(8, 12);
ok(monitor.level === CFG.perf.levels.length - 1, "direnen zayıf cihazda en hafif kademeye kadar inildi", monitor.level);
ok(CFG.perf.levels[3].label === "Tahta" && CFG.perf.levels[3].dpr < CFG.perf.levels[2].dpr,
  "son kademe çözünürlüğü bir tık daha kısıyor", CFG.perf.levels[3].dpr);
run(20, 60);
ok(monitor.level < CFG.perf.levels.length - 1, "cihaz toparlanınca kademe geri alındı", monitor.level);
ok(events.length >= 3, "kademe değişimleri bildirildi (" + events.join("→") + ")");

const forced = createMonitor({ startLevel: 0, forced: 2, onLevel: function () { events.push("forced"); } });
run(4, 10);
ok(forced.level === 2, "zorlanan kademe otomatik ayar tarafından değiştirilmiyor", forced.level);
/* ?perf=3 gibi zorlamalar son kademeyi aşmamalı */
ok(parseLevel("3") === CFG.perf.levels.length - 1 && parseLevel("99") === CFG.perf.levels.length - 1,
  "?perf değeri son kademeyle sınırlandı", parseLevel("99"));

globalThis.performance = realPerf;

/* ================= 6) seviye yardımcıları ve içerik ================= */
section("6) Yapılandırma ve içerik");
/* zayıf cihaz sezgisi: tahtada sahne Dengeli kademede başlar */
ok(guessStartLevel({ hardwareConcurrency: 2, deviceMemory: 4, maxTouchPoints: 10 }, 1366, 768, 1) === 1,
  "zayıf cihaz Dengeli kademede başlıyor");
ok(guessStartLevel({ hardwareConcurrency: 16, deviceMemory: 16, maxTouchPoints: 0 }, 2560, 1440, 2) === CFG.perf.startLevel,
  "güçlü cihaz Tam kademede başlıyor");

/* --- Akıllı tahta nesilleri (MEB Faz 1-4) ---
   Faz 1/2: WebGL 1 donanımı ve 2-4 çekirdek. Bu cihazlar hem Dengeli
   kademede başlamalı hem de DOĞRUDAN hafif model sürümünü yüklemeli;
   yoksa açılışta 1M üçgenlik modeli çizmeye çalışıp takılır, ancak
   FPS ölçeri düştükten sonra toparlanırdı. --- */
const faz1 = deviceClass({ hardwareConcurrency: 2, deviceMemory: 4, maxTouchPoints: 10 }, 1920, 1080, 1,
  { capabilities: { isWebGL2: false } });
ok(faz1.webgl1 === true && faz1.light === true,
  "Faz 1 tahtası (WebGL 1) hafif model sürümüyle başlıyor");
ok(faz1.level === 1 && faz1.videoLight === true,
  "Faz 1 tahtası Dengeli kademede ve 720p intro'da başlıyor", faz1.level);
ok(deviceClass({ hardwareConcurrency: 4, deviceMemory: 8, maxTouchPoints: 0 }, 1920, 1080, 1,
  { capabilities: { isWebGL2: false } }).light === true,
  "WebGL 1 tek başına hafif sürümü tetikliyor (Faz 2)");
/* Faz 3/4 tahtaları cezalandırılmamalı: 8 çekirdek + WebGL 2 + 4K */
const faz4 = deviceClass({ hardwareConcurrency: 8, deviceMemory: 8, maxTouchPoints: 10 }, 3840, 2160, 1,
  { capabilities: { isWebGL2: true } });
ok(faz4.level === 0 && faz4.light === false && faz4.videoLight === false,
  "Faz 3/4 tahtasında tam kalite ve tam model korunuyor", faz4.level);
ok(CFG.perf.levels[1].dpr <= 0.9,
  "Dengeli kademede DPR kısılıyor (tahta çözünürlüğü boşa yakmıyor)", CFG.perf.levels[1].dpr);

/* --- vektör kitaplığı sürüm kilidi ---
   three r163 WebGL 1 desteğini kaldırdı. Faz 1/2 tahtaları yalnızca
   WebGL 1 verir; sürüm ilerlerse bu tahtalarda sahne hiç açılmaz.
   Bu test, sessizce r163+ sürüme geçilmesini engeller. --- */
const threeSrc = fs.readFileSync("vendor/three/three.module.js", "utf8");
const revMatch = threeSrc.match(/const REVISION = '(\d+)'/);
const rev = revMatch ? parseInt(revMatch[1], 10) : 999;
ok(rev > 0 && rev <= 162,
  "three sürümü WebGL 1 destekleyen bir sürüm (" + rev + " ≤ 162)", rev);
ok(threeSrc.indexOf("'webgl2', 'webgl', 'experimental-webgl'") >= 0,
  "WebGL 2 yoksa WebGL 1 bağlamına düşülüyor (Faz 1/2 tahtası)");
ok(CFG.perf.levels[1].reflectEvery >= 2 || CFG.perf.levels[1].reflection === 0,
  "Dengeli kademede ayna kare atlıyor", CFG.perf.levels[1].reflectEvery);
ok(levelOf(-5).index === 0 && levelOf(99).index === CFG.perf.levels.length - 1, "kademe indeksi sınırlandı");
ok(CFG.perf.levels[0].reflection > CFG.perf.levels[1].reflection, "yansıma çözünürlüğü kademeyle düşüyor");
ok(CFG.perf.levels[2].reflection === 0, "Hafif kademede yansıma kapalı");
ok(CFG.perf.levels[2].decorations === false && CFG.perf.levels[2].wheelSpin === false, "en hafif kademede süsler ve jant animasyonu kapalı");

/* Intro kaynak zinciri: hafif sürüm tanımlı olmalı ve dosya yerinde
   olmalı; yoksa Faz 1 tahtasında 1080p60 film kare kare atlar. */
ok(!!CFG.intro.videoLight && fs.existsSync(CFG.intro.videoLight),
  "intro'nun hafif (720p) sürümü tanımlı ve yerinde", CFG.intro.videoLight);
ok(fs.existsSync(CFG.intro.video), "intro tam sürümü yerinde", CFG.intro.video);

BRANDS.forEach(function (b) {
  ok(!!b.accent && /^#[0-9a-f]{6}$/i.test(b.accent), b.short + " vurgu rengi geçerli");
  ok((b.files || []).length > 0 && /\.glb$/.test(b.files[0]), b.short + " model yolu tanımlı");
  ok(fs.existsSync(b.files[0]), b.short + " ana model dosyası yerinde", b.files[0]);
  /* Sahneye çıkan araç her zaman markanın OPTİMİZE dosyası olmalı.
     Adaylar sırayla denenir ve ilk başarılı dosya gösterilir; eskiden
     kök dizindeki `audi.glb` (eski RS8 konsepti) listede öne geçtiği
     için panel TT RS derken sahneye başka bir araç çıkıyordu. */
  ok(b.files[0] === "models/" + b.id + ".glb",
    b.short + " ilk aday kendi optimize modeli", b.files[0]);
  ok((b.lightFiles || [])[0] === "models/" + b.id + "-light.glb",
    b.short + " hafif sürüm aynı aracın hafif kopyası", (b.lightFiles || [])[0]);
  ok(fs.existsSync((b.lightFiles || [])[0] || ""),
    b.short + " hafif model dosyası yerinde", (b.lightFiles || [])[0]);
  /* künye 2×2: dört teknik satır (değer + etiket) */
  ok((b.stats || []).length === 4, b.short + " 4 teknik satır", (b.stats || []).length);
  ok((b.stats || []).every(function (s) { return !!s.v && !!s.l; }), b.short + " teknik satırlar eksiksiz");
  /* bilgi paneli alanları: nesil, gövde, merkez, kuruluş, ülke */
  const metaMissing = ["model", "generation", "segment", "hq", "founded", "country", "iso"]
    .filter(function (k) { return !b[k]; });
  ok(metaMissing.length === 0, b.short + " künye alanları tam", metaMissing.join(","));
  const missing = CATEGORIES.filter(function (c) { return !b.cards || !b.cards[c.id] || !b.cards[c.id].length; });
  ok(missing.length === 0, b.short + " tüm kategorilerde kart içeriyor",
    missing.map(function (c) { return c.id; }).join(","));
  /* her kategoride en az 3 bölüm: okuyucu şeridi 3 adım gösterir */
  const thin = CATEGORIES.filter(function (c) { return !b.cards || !b.cards[c.id] || b.cards[c.id].length < 3; });
  ok(thin.length === 0, b.short + " kategorilerde en az 3 bölüm",
    thin.map(function (c) { return c.id + "(" + ((b.cards && b.cards[c.id]) || []).length + ")"; }).join(" "));

  /* Okuyucu TEK kart gösterir: metin tek ekrana sığmalı (kaydırma
     olmadan okunur) ve başlık alt şeritteki kutuya kırpılmadan girmeli. */
  const long = [];
  const fat = [];
  CATEGORIES.forEach(function (c) {
    (b.cards[c.id] || []).forEach(function (card) {
      const plain = String(card.d || "").replace(/<[^>]+>/g, "");
      if (plain.length > 240) long.push(c.id + ":" + plain.length);
      if (String(card.t || "").length > 34) fat.push(c.id + ":" + String(card.t).length);
    });
  });
  ok(long.length === 0, b.short + " kart metinleri okuyucuya sığıyor", long.join(" "));
  ok(fat.length === 0, b.short + " kart başlıkları bölüm şeridine sığıyor", fat.join(" "));
});

/* ================= 7) ışık donanımı (huzme/hale yönü) ================= */
section("7) Işık donanımı: ön yön, görüş açısı ve temizlik");

const rigCar = prepareCar(fakeModel());
const slot = new THREE.Group();          /* testte carSlot rolünde */
slot.add(rigCar.object);
const rig = createLighting(rigCar);

ok(!!rig.beams, "ışık donanımı kuruldu");
ok(rig.beams && rig.beams.root.parent === slot, "donanım arabanın yuvasına bağlandı");
const cone = rig.beams ? rig.beams.cones.children[0] : null;
ok(!!cone && cone.position.z > rigCar.size.z * 0.4,
  "huzme arabanın ÖNÜNDE (+Z) başlıyor", cone ? cone.position.z.toFixed(2) : "-");
ok(!!rig.beams && Math.abs(rig.beams.pool.position.z) > 3 && rig.beams.pool.position.y < 0,
  "zemin lekesi önde ve podyum seviyesinin altında (zeminde)");
ok(!!rig.beams && rig.beams.pool.rotation.x < -1.5,
  "zemin lekesi yere paralel duruyor");

/* Kamera öndeyken yanar, arkadayken söner. */
const camFront = new THREE.PerspectiveCamera(38, 1.7, 0.1, 100);
camFront.position.set(0, 1.2, 12);
const camBack = new THREE.PerspectiveCamera(38, 1.7, 0.1, 100);
camBack.position.set(0, 1.2, -12);

rig.toggleLow();
for (let i = 0; i < 40; i++) rig.update(1 / 30, camFront);
const frontOpacity = rig.beams.halo.children[0].material.opacity;
ok(frontOpacity > 0.4, "kamera öndeyken hale görünür", frontOpacity.toFixed(2));
ok(rig.beams.cones.visible && rig.beams.pool.visible, "kamera öndeyken huzme ve leke açık");

for (let i = 0; i < 40; i++) rig.update(1 / 30, camBack);
ok(rig.beams.halo.children[0].material.opacity < 0.02, "kamera arkadayken hale söndü",
  rig.beams.halo.children[0].material.opacity.toFixed(3));
ok(!rig.beams.cones.visible && !rig.beams.pool.visible, "arkadan bakışta huzme/leke tamamen kapalı");
ok(rig.faceDot < -0.5, "arka görüş açısı doğru ölçüldü", rig.faceDot.toFixed(2));

/* Yakma/söndürme materyalin emissive değerini gerçekten değiştiriyor. */
const lowMat = rigCar.parts.lights.low[0];
const litEmissive = lowMat.emissive.getHex();
rig.toggleLow();
ok(lowMat.emissive.getHex() !== litEmissive, "far kapatılınca emissive eski hâline döndü");

rig.dispose();
ok(!rig.beams.root.parent, "donanım yuvadan söküldü (marka geçişinde birikmez)");

/* ================= 8) ön yön + isimsiz model lambaları =================
section("8) Ön yön sağlamlığı ve isimsiz (TEX.xx) modeller");

/* Regresyon: modelde bütün gövdeyi kaplayan bir ışık parçası varsa
   (w206_lights_global gibi) bu parça yön işareti SAYILMAZ. Eskiden kutu
   merkezini ortaya çekiyor, ön yön ters çıkıyor ve "Far"a basınca huzme
   arabanın arkasından gidiyordu. */
const fx = fakeModel("flipglow");
const fxRoot = fx.children[0];
const glowMesh = new THREE.Mesh(
  new THREE.BoxGeometry(150, 30, 430),
  new THREE.MeshStandardMaterial({ name: "w206_lights_global" })
);
glowMesh.position.y = 90;
fxRoot.add(glowMesh);
fxRoot.traverse(function (o) {
  if (o.isMesh && o.material && /lowbeam|drl/.test(o.material.name)) o.position.z = -Math.abs(o.position.z);
});
const car3 = prepareCar(fx);
near(Math.abs(car3.object.rotation.y), Math.PI, 0.05,
  "gövdeyi kaplayan ışık parçası ön yönü ters çevirmedi");
ok(car3.lightAnchor.z > car3.size.z * 0.30,
  "huzme odağı ön uçta (arabanın ortasında değil)", car3.lightAnchor.z.toFixed(2));
ok(car3.lightAnchor.z <= car3.size.z * 0.55,
  "huzme odağı arabanın dışına taşmıyor", car3.lightAnchor.z.toFixed(2));
ok(car.lightAnchor.z > car.size.z * 0.30, "normal modelde de odak ön uçta", car.lightAnchor.z.toFixed(2));

/* İsimsiz model: materyaller TEX.xx, hiçbir ad kuralı tutmuyor.
   Önde emissive beyaz/turuncu lens, arkada kırmızı lens. */
function unnamedModel(flip) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(190, 100, 440),
    new THREE.MeshStandardMaterial({ name: "TEX.001" })
  );
  body.position.y = 100;
  root.add(body);
  const s = flip ? -1 : 1;
  const frontLens = new THREE.Mesh(
    new THREE.BoxGeometry(60, 22, 12),
    new THREE.MeshStandardMaterial({ name: "TEX.013", emissive: new THREE.Color(0xff2a05) })
  );
  frontLens.position.set(0, 92, s * 220);
  root.add(frontLens);
  const rearLens = new THREE.Mesh(
    new THREE.BoxGeometry(70, 18, 12),
    new THREE.MeshStandardMaterial({ name: "TEX.010", emissive: new THREE.Color(0xff0000) })
  );
  rearLens.position.set(0, 96, -s * 220);
  root.add(rearLens);
  const tyreGeo = new THREE.CylinderGeometry(40, 40, 30, 12);
  tyreGeo.rotateZ(Math.PI / 2);
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c) {
    const g = new THREE.Group();
    g.name = "Tire_" + (c[0] > 0 ? "F" : "B") + (c[1] > 0 ? "L" : "R");
    g.add(new THREE.Mesh(tyreGeo, new THREE.MeshStandardMaterial({ name: "TEX.020" })));
    g.position.set(c[1] * 95, 40, c[0] * 150);
    root.add(g);
  });
  const outer = new THREE.Group();
  outer.add(root);
  return outer;
}

const un = prepareCar(unnamedModel(false));
ok(un.parts.lights.brake.every(function (m) { return m.name !== "TEX.001"; }),
  "isimsiz: kırmızı olmayan gövde stop sanılmadı");
ok(un.parts.lights.brake.some(function (m) { return m.name === "TEX.010"; }),
  "isimsiz: arkadaki kırmızı lens stop lambası oldu");
ok(un.parts.lights.low.some(function (m) { return m.name === "TEX.013"; }),
  "isimsiz: öndeki lens far oldu", un.parts.lights.low.map(function (m) { return m.name; }).join(","));
ok(un.parts.lights.low.every(function (m) { return m.name !== "TEX.010"; }),
  "isimsiz: kırmızı stop lambası far grubuna girmedi");

/* Model ters geldiyse aynı çıkarım 180° dönüşle birlikte çalışmalı */
const un2 = prepareCar(unnamedModel(true));
near(Math.abs(un2.object.rotation.y), Math.PI, 0.05, "isimsiz model ters geldiğinde çevrildi");
ok(un2.parts.lights.brake.some(function (m) { return m.name === "TEX.010"; }),
  "isimsiz ters modelde de stop doğru bulundu");
ok(un2.lightAnchor.z > un2.size.z * 0.30, "isimsiz ters modelde odak ön uçta", un2.lightAnchor.z.toFixed(2));

/* ================= 9) arma ve kategori tutarlılığı ================= */
section("8) Armalar, kategoriler ve model dosyaları");

BRANDS.forEach(function (b) {
  ok(hasEmblem(b.emblem), b.short + " arması tanımlı", b.emblem);
  ok(emblemSVG(b.emblem).indexOf("<svg") === 0 && emblemDataURI(b.emblem, "#fff").indexOf("data:image/svg+xml") === 0,
    b.short + " arması SVG ve veri adresi üretiyor");
});

const labels = CATEGORIES.map(function (c) { return c.label; });
ok(new Set(labels).size === labels.length, "kategori etiketleri benzersiz (aynı adlı iki düğme yok)");
ok(CATEGORIES.filter(function (c) { return c.id === "far"; }).length === 1, "aydınlatma kategorisi tek");

BRANDS.forEach(function (b) {
  if (!b.lightFiles) return;
  b.lightFiles.forEach(function (f) {
    ok(fs.existsSync(f), b.short + " hafif sürüm dosyası var", f);
  });
});
ok(fs.existsSync("models/bmw.glb") && fs.existsSync("models/mercedes.glb"), "ana model dosyaları çalışma ağacında");

/* Arka plan künyesi: duvarın önünde, arabaya yakın ve duvardan küçük. */
ok(CFG.stage.backdropZ > CFG.stage.wallZ && CFG.stage.backdropW < CFG.stage.wallW,
  "duvar künyesi duvarın önünde ve duvardan küçük");
ok(CFG.stage.backdropY > 1.5 && CFG.stage.backdropY < 3.2,
  "künye arabanın hemen üstünde (kadraja giren yükseklik)", CFG.stage.backdropY);

console.log("\n" + (fail === 0 ? "✔" : "✗") + " " + pass + " test geçti, " + fail + " başarısız.");
process.exit(fail === 0 ? 0 : 1);
