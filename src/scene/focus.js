import * as THREE from "../../vendor/three/three.module.js";
import { CFG } from "../config.js";

/* not: parça grupları ya mesh ya materyal tutabilir; kutu hesabı
   yapan yerler önce mesh listesini (lightMeshes) dener. */

/* ============================================================
   Kamera yönetmeni.

   Kategori çipine basıldığında kamera ilgili parçaya yumuşakça
   kayar. Konumlar arabanın gerçek ölçüsünden ve parça
   kutularından türetilir; sabit sayı yoktur.

   Yön düzeltmesinden sonra araba daima +Z'ye bakar:
   +Z = ön, -Z = arka, +X = sağ.
   ============================================================ */

/* dir: bakış yönü (y bileşeni kamera yüksekliğini belirler, kutup
   açısı sınırlarının içinde kalacak şekilde seçilmiştir).
   scale: kadrajın ekran oranına göre ölçeklenmiş uzaklığa çarpan. */
/* Her odak, arabanın HANGİ YÜZÜNÜN kameraya dönük olmasını ister
   (`face`, arabanın kendi çerçevesinde yatay yön) ve kameranın hangi
   yükseklik/uzaklıkta duracağını söyler. Kamera azimutu KORUNUR:
   yön değiştirmesi gereken şey podyumdur (alignYaw), yoksa kamera
   duvarın arkasına geçebiliyor ve farlar ters tarafta kalıyordu. */
const VIEWS = {
  /* hero: mutlak dünya yönü — araba dönerken kamera sabit kalır */
  hero:     { dir: [0.62, 0.30, 0.74], pitch: 0.30, scale: 1.00, spin: true },
  side:     { face: [1.00, 0.05], pitch: 0.20, scale: 1.08 },
  front:    { face: [0.28, 0.96], pitch: 0.15, scale: 0.92 },
  wheel:    { face: [0.70, 0.71], pitch: 0.24, scale: 0.46 },
  interior: { face: [0.71, 0.71], pitch: 0.38, scale: 0.62 },
};

const UP = new THREE.Vector3(0, 1, 0);

/* Arabanın dünyada baktığı yön (radyan). */
export function carYaw(car) {
  if (!car || !car.object) return 0;
  car.object.updateMatrixWorld(true);
  const f = new THREE.Vector3(0, 0, 1).transformDirection(car.object.matrixWorld);
  return Math.atan2(f.x, f.z);
}

/* Kamera bu odakta duracaksa podyumun kaç radyanda olması gerekir?
   Arabanın ilgili yüzü kameranın mevcut azimutuna bakar. */
export function alignYaw(car, camera, view) {
  const v = VIEWS[view];
  if (!v || !car || !camera || v.spin) return null;
  const pos = car.object.getWorldPosition(new THREE.Vector3());
  const camAz = Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z);
  return camAz - Math.atan2(v.face[0], v.face[1]);
}

function boxOf(objects) {
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  for (let i = 0; i < objects.length; i++) {
    tmp.setFromObject(objects[i]);
    if (!tmp.isEmpty()) box.union(tmp);
  }
  return box;
}

/* Arabanın tamamının kadraja sığdığı en küçük uzaklık.
   Dikey/dar ekranlarda yatay görüş açısı küçüldüğü için hesap
   en-boy oranına göre yapılır; aksi hâlde araba kırpılır. */
export function fitDistance(car, camera) {
  const aspect = Math.max(0.4, (camera && camera.aspect) || 1.7);
  const vFov = ((camera && camera.fov ? camera.fov : 38) * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const s = car.size;
  const radius = 0.5 * Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z) * 0.9;
  const fit = Math.max(radius / Math.sin(vFov / 2), radius / Math.sin(hFov / 2));
  return Math.max(2.6, fit * CFG.camera.frameMargin);
}

export function computeAnchors(car, camera, deltaYaw) {
  const size = car.size;
  const height = Math.max(0.8, size.y);
  const center = car.center.clone();
  center.y = height * 0.5;
  const base = fitDistance(car, camera);

  /* Podyum dönmek üzereyse (deltaYaw) hedefleri şimdiden döndür:
     kamera ile podyum aynı anda hareket eder, ışınlanma olmaz. */
  const pivot = car.object.getWorldPosition(new THREE.Vector3());
  const dy = isFinite(deltaYaw) ? deltaYaw : 0;
  function rot(p) {
    if (!dy) return p;
    const dx = p.x - pivot.x;
    const dz = p.z - pivot.z;
    const c = Math.cos(dy);
    const s = Math.sin(dy);
    return new THREE.Vector3(pivot.x + dx * c + dz * s, p.y, pivot.z - dx * s + dz * c);
  }

  /* Kameranın mevcut azimutu korunur: odaklar kamera ile arabanın
     yatay açısını değiştirmez, yalnızca uzaklık/yükseklik/hedef değişir. */
  const camAz = Math.atan2(camera.position.x - pivot.x, camera.position.z - pivot.z);

  const anchors = {};

  function fromView(v, targetIn) {
    const target = rot(targetIn);
    const d = Math.max(2.4, base * v.scale);
    let pos;
    if (v.dir) {
      /* mutlak yön (hero) */
      const dir = new THREE.Vector3(v.dir[0], v.dir[1], v.dir[2]).normalize();
      if (dy) dir.applyAxisAngle(UP, dy);
      pos = target.clone().addScaledVector(dir, d);
    } else {
      /* kameranın mevcut azimutu korunur */
      const cp = Math.cos(v.pitch || 0);
      const sp = Math.sin(v.pitch || 0);
      pos = new THREE.Vector3(
        target.x + Math.sin(camAz) * cp * d,
        target.y + sp * d,
        target.z + Math.cos(camAz) * cp * d
      );
    }
    if (pos.y < 0.8) pos.y = 0.8;      // yere girmesin
    return { position: pos, target: target };
  }

  anchors.hero = fromView(VIEWS.hero, center.clone());
  anchors.side = fromView(VIEWS.side, center.clone());
  anchors.front = fromView(VIEWS.front, center.clone());

  /* jant görünümü: ön jantın merkezine bak */
  const fw = car.wheels.filter(function (w) { return w.front; });
  const wheelList = fw.length ? fw : car.wheels;
  const wheelBox = boxOf(wheelList.map(function (w) { return w.node; }));
  const wheelTarget = wheelBox.isEmpty() ? center.clone().setY(height * 0.24) : wheelBox.getCenter(new THREE.Vector3());
  anchors.wheel = fromView(VIEWS.wheel, wheelTarget);

  /* iç mekân: kabin (iç mekân parçaları + yüksek orta bölge) */
  const interiorBox = boxOf(car.parts.interior);
  let interiorTarget = center.clone();
  if (!interiorBox.isEmpty() && interiorBox.getSize(new THREE.Vector3()).length() > 0.4) {
    interiorTarget = interiorBox.getCenter(new THREE.Vector3());
    interiorTarget.y = Math.max(interiorTarget.y, height * 0.55);
  } else {
    interiorTarget.set(center.x, height * 0.62, center.z * 0.2);
  }
  anchors.interior = fromView(VIEWS.interior, interiorTarget);

  /* ---- işaret noktaları: bilgi kartlarından arabaya uzanan çizgiler ----
     Arabanın KENDİ çerçevesinde saklanır; her karede dünya matrisiyle
     çarpıldığı için podyum dönerken de parçayı takip eder. */
  const points = buildPoints(car);

  return { views: anchors, points: points };
}

function buildPoints(car) {
  car.object.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(car.object.matrixWorld).invert();
  const size = car.size;
  const H = size.y;
  const W = size.x;
  const L = size.z;

  function toLocal(world) { return world.clone().applyMatrix4(inv); }
  function local(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(inv).sub(new THREE.Vector3(0, 0, 0)); }

  /* spotlight/kabin gibi parçaların gerçek dünya konumlarını kullan */
  /* Lambalar: mümkünse mesh listesi kullanılır (materyal listesi kutu
     hesabında işe yaramaz), yoksa eski mesh tabanlı yapıya düşülür. */
  const lm = car.parts.lightMeshes || {};
  const lightMeshes = [].concat(
    lm.low || [], lm.high || [], lm.drl || [], lm.glow || []
  );
  const lightBox = boxOf(lightMeshes.length ? lightMeshes : [].concat(
    car.parts.lights.low, car.parts.lights.high,
    car.parts.lights.drl, car.parts.lights.glow
  ));
  const interiorBox = boxOf(car.parts.interior);

  const centerWorld = car.center.clone();
  const baseY = car.object.matrixWorld.elements[13];   /* arabanın dünya yüksekliği */

  const points = {};

  /* gövde/kabin merkezi (dünya) */
  const bodyCenter = toLocal(new THREE.Vector3(centerWorld.x, baseY + H * 0.5, centerWorld.z));

  points.konu = { v: toLocal(new THREE.Vector3(centerWorld.x, baseY + H * 0.98, centerWorld.z - L * 0.05)), side: false };
  points.motor = { v: toLocal(new THREE.Vector3(centerWorld.x, baseY + H * 0.62, centerWorld.z + L * 0.30)), side: false };
  points.tasarim = { v: toLocal(new THREE.Vector3(centerWorld.x + W * 0.55, baseY + H * 0.42, centerWorld.z + L * 0.02)), side: true };

  if (!lightBox.isEmpty()) {
    points.far = { v: toLocal(lightBox.getCenter(new THREE.Vector3())), side: false };
  } else {
    points.far = { v: toLocal(new THREE.Vector3(centerWorld.x, baseY + H * 0.55, centerWorld.z + L * 0.48)), side: false };
  }

  /* ön jant: iki ön jantın ortası, kameraya bakan taraf */
  const frontWheels = car.wheels.filter(function (w) { return w.front; });
  if (frontWheels.length) {
    const sum = new THREE.Vector3();
    frontWheels.forEach(function (w) { sum.add(w.node.getWorldPosition(new THREE.Vector3())); });
    sum.multiplyScalar(1 / frontWheels.length);
    points.jant = { v: toLocal(sum), side: true };
  } else {
    points.jant = { v: toLocal(new THREE.Vector3(centerWorld.x + W * 0.5, baseY + H * 0.22, centerWorld.z + L * 0.28)), side: true };
  }

  if (!interiorBox.isEmpty() && interiorBox.getSize(new THREE.Vector3()).length() > 0.4) {
    const c = interiorBox.getCenter(new THREE.Vector3());
    c.y = Math.max(c.y, baseY + H * 0.5);
    points.ic = { v: toLocal(c), side: false };
  } else {
    points.ic = { v: bodyCenter.clone().setY(bodyCenter.y + H * 0.12), side: false };
  }

  return points;
}

export function createDirector(camera, controls, anchors) {
  const state = {
    active: "hero",
    tween: null,
    idle: 0,
  };
  const fromPos = new THREE.Vector3();
  const fromTarget = new THREE.Vector3();
  const tmpPos = new THREE.Vector3();
  const tmpTarget = new THREE.Vector3();

  function goto(name, instant) {
    const a = anchors[name] || anchors.hero;
    if (!a) return;
    state.active = name;
    if (instant) {
      camera.position.copy(a.position);
      controls.target.copy(a.target);
      state.tween = null;
      if (controls.update) controls.update();
      return;
    }
    fromPos.copy(camera.position);
    fromTarget.copy(controls.target);
    state.tween = { t: 0, dur: 0.85, a: a };
  }

  function update(dt) {
    if (!state.tween) return;
    const tw = state.tween;
    tw.t = Math.min(tw.dur, tw.t + dt);
    const k = tw.t / tw.dur;
    const e = 1 - Math.pow(1 - k, 3);
    tmpPos.copy(fromPos).lerp(tw.a.position, e);
    tmpTarget.copy(fromTarget).lerp(tw.a.target, e);
    camera.position.copy(tmpPos);
    controls.target.copy(tmpTarget);
    if (k >= 1) state.tween = null;
  }

  return {
    goto: goto,
    update: update,
    cancel: function () { state.tween = null; },
    get active() { return state.active; },
    set active(v) { state.active = v; },
  };
}

/* Kamera kadrajı: uzun modellerde fov hafif açılır */
export function fitCameraFov(camera, car) {
  const ratio = Math.max(car.size.x, car.size.z) / Math.max(0.5, car.size.y);
  const fov = ratio > CFG.camera.fovBias.threshold
    ? CFG.camera.fov * CFG.camera.fovBias.longCar
    : CFG.camera.fov;
  camera.fov = fov;
  camera.updateProjectionMatrix();
}
