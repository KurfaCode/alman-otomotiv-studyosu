import { CFG } from "../config.js";
import * as THREE from "../../vendor/three/three.module.js";
import { localBox } from "./car.js";

/* ============================================================
   Dönüş hareketleri.

   Jantlar ayrı düğümler olduğu için gerçekten dönebilirler.
   Aks ekseni modelden ölçülür (en ince eksen) ve düğümün KENDİ
   yerel uzayında uygulanır; podyum dönerken de eksen kaymaz.

   PİVOT DÜZELTMESİ: Sketchfab/FBX ihracılarında tekerlek düğümünün
   orijini arabanın merkezinde olabilir; geometri düğüme göre
   kaymıştır. Bu hâlde rotateOnAxis tekerleği bir kol gibi savurur:
   jant arabanın altında daire çizer, tekerlek "havada uçar".

   DİKKAT: düğümü ötelemek bu kaymayı DÜZELTMEZ. Geometrinin düğüm
   orijinine göre konumu düğümün KENDİ uzayındadır; node.position'ı
   değiştirmek geometriyi yalnızca taşır, dönme merkezini değiştirmez.
   Tek doğru yol DÖNDÜRÜLEN ŞEYİ değiştirmektir: geometri merkezine
   bir taşıyıcı (pivot) grubu konur ve düğüm değil PİVOT döndürülür.
   Pivot, düğümün üst grubunda ve tam geometri merkezinde durur;
   attach() düğümün dünya dönüşümünü koruduğu için gövde kıpırdamaz.
   Aks ekseni pivotun uzayına çevrilir (node.quaternion kadar döner).
   Düşük FPS kademesinde jant animasyonu kapanır (kare başı
   quaternion güncellemesi tasarrufu).
   ============================================================ */

/* Düğümün orijini, geometrisinin merkezinden aksa DİK yönde sapıyorsa
   geometri merkezine bir pivot grubu koyar ve { target, axis } döner.
   Kutu boşsa veya sapma tekerlek yarıçapının %2'sinden küçükse null. */
function recenterWheel(node, axis) {
  const box = localBox(node);
  if (box.isEmpty()) return null;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  /* aks eksenine dik iki yerel eksen seçilir; sapma bunlarda ölçülür */
  let u = new THREE.Vector3(1, 0, 0), v = new THREE.Vector3(0, 1, 0);
  if (Math.abs(axis.x) > 0.7) { u.set(0, 1, 0); v.set(0, 0, 1); }
  else if (Math.abs(axis.y) > 0.7) { u.set(1, 0, 0); v.set(0, 0, 1); }

  const du = center.dot(u), dv = center.dot(v);
  const ru = (u.x * size.x + u.y * size.y + u.z * size.z) / 2;
  const rv = (v.x * size.x + v.y * size.y + v.z * size.z) / 2;

  /* sapma, tekerlek yarıçapının %2'sinden küçükse orijin zaten merkezde */
  if (Math.hypot(du, dv) < Math.max(ru, rv) * 0.02) return null;

  const parent = node.parent;
  if (!parent) return null;

  /* geometri merkezi DÜNYA uzayında: pivot oraya konur */
  node.updateWorldMatrix(true, true);
  const worldCenter = center.clone().applyMatrix4(node.matrixWorld);

  const pivot = new THREE.Group();
  pivot.name = (node.name || "wheel") + "-pivot";
  parent.updateWorldMatrix(true, false);
  pivot.position.copy(parent.worldToLocal(worldCenter.clone()));
  parent.add(pivot);
  pivot.updateWorldMatrix(true, false);   /* attach için matris şart */
  pivot.attach(node);                     /* dünya dönüşümü korunur */

  /* axis node'un kendi uzayındaydı; pivotun uzayı = üst grubun uzayı.
     Aradaki dönüş yalnızca node'un kendi dönüşüdür (pivot kimlik). */
  const spinAxis = axis.clone().applyQuaternion(node.quaternion).normalize();
  return { target: pivot, axis: spinAxis };
}

export function createWheels(car) {
  /* Döndürülecek nesne, düğümün kendisi ya da pivotu olabilir;
     kılavuz çizgileri ve odaklar car.wheels[].node kullanmaya devam eder. */
  const wheels = (car.wheels || []).map(function (w) {
    const fix = recenterWheel(w.node, w.axis);
    if (!fix) return { target: w.node, axis: w.axis };
    return { target: fix.target, axis: fix.axis };
  });
  const state = { spin: 0, enabled: true, driving: false };

  function update(dt) {
    if (!state.enabled || !wheels.length) return;
    const base = state.driving ? CFG.motion.wheelSpinDrive : CFG.motion.wheelSpinIdle;
    state.spin += dt * base;
    for (let i = 0; i < wheels.length; i++) {
      const w = wheels[i];
      if (!w.target) continue;
      w.target.rotateOnAxis(w.axis, dt * base);
    }
  }

  return {
    update: update,
    setEnabled: function (on) { state.enabled = !!on; },
    setDriving: function (on) { state.driving = !!on; },
    get count() { return wheels.length; },
  };
}

export function createTurntable(stage) {
  const state = { spinning: true, target: null, speed: 0 };

  function update(dt) {
    if (state.target !== null) {
      /* İstenen yüze yumuşakça dön: kamera yerinde kalır, araba döner. */
      const now = stage.podiumGroup.rotation.y;
      let diff = state.target - now;
      diff = ((diff + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      const step = diff * Math.min(1, dt * 6.5);
      stage.podiumGroup.rotation.y = now + step;
      if (Math.abs(diff) < 0.004) state.target = null;
      return;
    }
    if (!state.spinning) return;
    stage.podiumGroup.rotation.y += CFG.motion.podiumSpin * dt;
  }

  return {
    update: update,
    setSpinning: function (on) {
      state.spinning = !!on;
      if (state.spinning) state.target = null;
    },
    /* Hedef açıya dönüş; saniye cinsinden süre bilgi amaçlıdır
       (yumuşatma kendi hızıyla ilerler). */
    rotateTo: function (yaw) {
      if (typeof yaw !== "number" || !isFinite(yaw)) return;
      state.target = yaw;
    },
    get spinning() { return state.spinning; },
    get yaw() { return stage.podiumGroup.rotation.y; },
    get busy() { return state.target !== null; },
  };
}
