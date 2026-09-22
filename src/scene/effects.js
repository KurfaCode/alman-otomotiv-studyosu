import * as THREE from "../../vendor/three/three.module.js";
import { CFG } from "../config.js";

/* ============================================================
   Işık kontrolcüsü.

   Modelde far/stop/sinyal ayrı materyaller olduğu için ışık
   gerçekten yanar: emissive rengi ve gücü değişir, materyal
   sınıfı değişmez. Kare başı maliyet birkaç sayı yazmaktır.

   Konumlandırma kuralları:
     • Işık donanımı (huzme, zemin lekesi, far halesi) arabanın
       ÜSTÜNE değil, podyumdaki yuvasına (car.object.parent) eklenir.
       O uzayda +Z daima arabanın önüdür (car.js yön düzeltmesi),
       birim de metreye eşittir. Böylece model -Z'ye baksa da,
       cm ölçekli gelse de huzme doğru yöne gider.
     • Kamera arabanın arkasına geçtiğinde huzme/hale söner:
       o açıdan toplamalı koniler şerit şerit artefakt gibi görünür.
   ============================================================ */

const COLORS = {
  drl:     0xeaf2ff,
  glow:    0xfff4dd,
  low:     0xfff3d6,
  high:    0xffffff,
  brake:   0xff2617,
  reverse: 0xf4f8ff,
  signal:  0xff8a1e,
};

const POWER = {
  drl: 2.0,
  glow: 0.9,
  low: 4.6,
  high: 6.4,
  brake: 3.6,
  reverse: 2.3,
  signal: 3.8,
};

/* Zemin ışık lekesi + far halesi: tek bir radyal gradyan dokusu. */
function radialTexture(size, stops) {
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const x = c.getContext("2d");
  const h = size / 2;
  const g = x.createRadialGradient(h, h, size * 0.015, h, h, h * 0.98);
  stops.forEach(function (s) {
    g.addColorStop(s[0], "rgba(255,241,214," + s[1] + ")");
  });
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* Işık donanımı: huzme konileri + zemin lekesi + far halesi.
   Hepsi tek grupta; gruptan çıkarılıp atılabilir (dispose). */
function createBeamRig(anchor, spread, podiumTop) {
  const root = new THREE.Group();
  root.name = "ao-lights";

  /* ---- huzme konileri (arabanın önüne doğru, hafif aşağı eğik) ---- */
  const length = 9.2;
  const geo = new THREE.CylinderGeometry(0.085, 0.95, length, 14, 1, true);
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0, length / 2);

  const cones = new THREE.Group();
  [-1, 1].forEach(function (s) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfff0d2, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    const beam = new THREE.Mesh(geo, mat);
    beam.position.set(anchor.x + s * spread, anchor.y, anchor.z - 0.1);
    beam.rotation.x = 0.085;
    beam.renderOrder = 7;
    beam.frustumCulled = false;
    cones.add(beam);
  });
  root.add(cones);

  /* ---- zemin lekesi: arabanın önünde zemine vuran yumuşak ışık ---- */
  const poolTex = radialTexture(128, [[0, 0.88], [0.25, 0.58], [0.5, 0.28], [0.72, 0.085], [1, 0]]);
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(10.6, 6.4),
    new THREE.MeshBasicMaterial({
      map: poolTex, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(anchor.x, -podiumTop + 0.035, 6.4);
  pool.renderOrder = 9;
  pool.frustumCulled = false;
  root.add(pool);

  /* ---- far halesi: lambaların üstünde kameraya bakan iki leke ---- */
  const haloTex = radialTexture(64, [[0, 1], [0.28, 0.55], [0.55, 0.20], [0.8, 0.05], [1, 0]]);
  const halo = new THREE.Group();
  [-1, 1].forEach(function (s) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: haloTex, color: 0xfff4dc, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    sp.position.set(anchor.x + s * spread, anchor.y - 0.02, anchor.z + 0.12);
    sp.scale.set(0.95, 0.62, 1);
    sp.renderOrder = 10;
    halo.add(sp);
  });
  root.add(halo);

  cones.visible = false;
  pool.visible = false;
  halo.visible = false;

  return { root: root, cones: cones, pool: pool, halo: halo, geo: geo, textures: [poolTex, haloTex] };
}

export function createLighting(car) {
  const groups = car && car.parts ? car.parts.lights : null;
  const podiumTop = CFG.car.podiumTop;

  /* Işık donanımının bağlanacağı uzay: arabanın podyumdaki yuvası.
     Orada +Z = arabanın önü, y = 0 = podyum yüzeyi. */
  const host = (car && car.object && car.object.parent) || (car && car.object) || null;

  /* Huzme odağı: farların gerçek konumu; far parçası yoksa gövdenin
     ön ucundan türetilir (her modelde çalışır). */
  const anchor = new THREE.Vector3(
    0,
    (car && car.size ? car.size.y : 1.4) * 0.5,
    (car && car.size ? car.size.z : 4.6) * 0.5 - 0.05
  );
  let spread = 0.62;
  /* Odak car.js'te DÖNÜŞTEN SONRAKİ çerçevede, yalnızca ön uçta toplanan
     lamba parçalarından hesaplanır. Bütün gövdeyi kaplayan ışık parçası
     (lights_global) odağı arabanın ortasına çekiyordu: huzme ortadan
     çıkıyordu. */
  const la = car && car.lightAnchor;
  if (la) {
    anchor.set(la.x, la.y, la.z);
    spread = la.spread;
  } else if (car && car.parts && groups) {
    /* Kutu hesabı mesh'lerle yapılır: gruplar artık materyal tutuyor. */
    const lm = car.parts.lightMeshes || {};
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    [].concat(lm.low || [], lm.high || [], lm.glow || [], lm.drl || [],
      lm.low ? [] : groups.low || [], lm.high ? [] : groups.high || []).forEach(function (o) {
      if (!o || !o.isObject3D) return;
      tmp.setFromObject(o);
      if (!tmp.isEmpty()) box.union(tmp);
    });
    if (!box.isEmpty()) {
      const c = box.getCenter(new THREE.Vector3());
      const s = box.getSize(new THREE.Vector3());
      /* dünya → yuva uzayı */
      if (host) host.updateMatrixWorld(true);
      const local = host ? host.worldToLocal(c) : c;
      anchor.set(local.x, Math.max(0.35, local.y), Math.abs(local.z));
      spread = Math.max(0.42, Math.min(1.05, s.x * 0.35));
    }
  }

  const rig = car ? createBeamRig(anchor, spread, podiumTop) : null;
  if (rig && host) host.add(rig.root);

  let beamLevel = 0;      /* 0 kapalı, 1 yumuşak hedef */
  let faceDot = 1;        /* kameranın arabanın önünde olma oranı */
  const on = { low: false, high: false, brake: false, reverse: false, glow: true, drl: true };
  const signal = { mode: "off", phase: 0 };
  const tmpV = new THREE.Vector3();
  const tmpF = new THREE.Vector3();

  /* Gruplar normalde MATERYAL tutar (çoklu materyalli mesh'lerde
     yalnızca lamba materyali yanar). Konsept maket gibi mesh tutan
     eski yapılar da desteklenir. */
  function materialsFor(key) {
    if (!groups || !groups[key]) return [];
    const out = [];
    for (let i = 0; i < groups[key].length; i++) {
      const o = groups[key][i];
      if (!o) continue;
      if (o.isMesh || o.isObject3D) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (let j = 0; j < mats.length; j++) if (mats[j]) out.push(mats[j]);
      } else {
        out.push(o);
      }
    }
    return out;
  }

  const cache = {
    drl: materialsFor("drl"),
    glow: materialsFor("glow"),
    low: materialsFor("low"),
    high: materialsFor("high"),
    brake: materialsFor("brake"),
    reverse: materialsFor("reverse"),
  };
  const signalL = materialsFor("signalL");
  const signalR = materialsFor("signalR");

  /* Modelin ön lamba camı bulunamadıysa (isimsiz ihracılar) huzme ve
     zemin lekesi tek başına kaldığı için hale biraz büyütülür:
     "farlar yandı" bilgisi yine de net okunsun. */
  if (rig && !cache.low.length && !cache.high.length && !cache.drl.length) {
    rig.halo.children.forEach(function (sp) { sp.scale.set(1.25, 0.82, 1); });
  }

  function dim(m) {
    const base = m.userData && m.userData.baseEmissive ? m.userData.baseEmissive : null;
    if (base) m.emissive.copy(base);
    else m.emissive.setHex(0x000000);
    m.emissiveIntensity = m.userData && typeof m.userData.basePower === "number"
      ? Math.min(m.userData.basePower, 0.35)
      : 0;
  }

  /* Aynı materyal iki grupta olabilir (ör. sinyal bulunamayan modellerde
     sinyal, stop lambasının camını kullanır). Bu yüzden önce "yanacaklar"
     planı kurulur, sonra yalnızca planda olmayanlar söndürülür — yoksa
     sinyalin kapalı fazı stop lambasını da söndürürdü. */
  const allGroups = [];
  function apply() {
    const plan = new Map();
    const lit = new Set();
    function mark(list, key) {
      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        if (!m || !m.emissive) continue;
        plan.set(m, key);
        lit.add(m);
      }
    }
    if (on.drl) mark(cache.drl, "drl");
    if (on.glow) mark(cache.glow, "glow");
    if (on.low) mark(cache.low, "low");
    if (on.high) mark(cache.high, "high");
    if (on.brake) mark(cache.brake, "brake");
    if (on.reverse) mark(cache.reverse, "reverse");
    const blink = signal.mode !== "off" && (signal.phase % 1) < 0.55;
    const left = signal.mode === "left" || signal.mode === "hazard";
    const right = signal.mode === "right" || signal.mode === "hazard";
    if (left && blink) mark(signalL, "signal");
    if (right && blink) mark(signalR, "signal");

    if (!allGroups.length) {
      allGroups.push(cache.drl, cache.glow, cache.low, cache.high, cache.brake, cache.reverse, signalL, signalR);
    }
    allGroups.forEach(function (list) {
      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        if (!m || !m.emissive || lit.has(m)) continue;
        dim(m);
      }
    });
    plan.forEach(function (key, m) {
      m.emissive.setHex(COLORS[key]);
      /* Lamba camları/gövdeleri (car.js: lensCover) kısılmış güçle yanar:
         yoksa tamponun yarısı bembeyaz bir leke oluyordu. */
      const scale = m.userData && m.userData.powerScale ? m.userData.powerScale : 1;
      m.emissiveIntensity = POWER[key] * scale;
    });
    beamLevel = on.high ? 1 : (on.low ? 0.72 : 0);
  }

  apply();

  return {
    /* Arayüz düğmeleri */
    toggleLow: function () {
      on.low = !on.low;
      if (on.low) on.high = false;
      apply();
      return on.low ? "Far açık" : "Far kapalı";
    },
    toggleHigh: function () {
      on.high = !on.high;
      if (on.high) on.low = true;
      apply();
      return on.high ? "Uzun far açık" : "Uzun far kapalı";
    },
    toggleBrake: function () {
      on.brake = !on.brake;
      apply();
      return on.brake ? "Stop lambaları açık" : "Stop lambaları kapalı";
    },
    cycleSignal: function () {
      const order = ["off", "left", "right", "hazard"];
      signal.mode = order[(order.indexOf(signal.mode) + 1) % order.length];
      signal.phase = 0;
      apply();
      return signal.mode === "off" ? "Sinyal kapalı"
        : signal.mode === "left" ? "Sol sinyal"
        : signal.mode === "right" ? "Sağ sinyal" : "Dörtlüler";
    },
    setDrl: function (v) { on.drl = !!v; apply(); },
    setGlow: function (v) { on.glow = !!v; apply(); },

    /* Kameranın arabanın önünde olup olmadığını ölçer: huzme ve
       hale yalnızca önden bakarken görünür. */
    update: function (dt, camera) {
      if (rig) {
        if (camera && host) {
          host.getWorldPosition(tmpV);
          tmpF.set(0, 0, 1).transformDirection(host.matrixWorld);
          const dx = camera.position.x - tmpV.x;
          const dy = camera.position.y - tmpV.y;
          const dz = camera.position.z - tmpV.z;
          const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
          /* 0 = tam yan, 1 = tam ön; -1 = tam arka */
          faceDot = (dx * tmpF.x + dy * tmpF.y + dz * tmpF.z) / len;
        }
        /* ön yarımkürede görünür, yanlara doğru yumuşakça söner */
        const vis = Math.max(0, Math.min(1, (faceDot + 0.12) / 0.42));

        const k = Math.min(1, dt * 9);
        const coneTarget = beamLevel * 0.34 * vis;
        const poolTarget = beamLevel * 0.72 * vis * vis;
        const haloTarget = beamLevel * 0.9 * vis;

        let any = false;
        for (let i = 0; i < rig.cones.children.length; i++) {
          const m = rig.cones.children[i].material;
          m.opacity += (coneTarget - m.opacity) * k;
          if (m.opacity > 0.001) any = true;
        }
        const pm = rig.pool.material;
        pm.opacity += (poolTarget - pm.opacity) * k;
        if (pm.opacity > 0.001) any = true;
        let haloAny = false;
        for (let j = 0; j < rig.halo.children.length; j++) {
          const hm = rig.halo.children[j].material;
          hm.opacity += (haloTarget - hm.opacity) * k;
          if (hm.opacity > 0.001) haloAny = true;
        }
        /* doğrudan opaklık yazmak yerine hedefe yaklaşıyoruz; eşik
           altında tamamen kapatmak GPU'da bedava kazanç sağlar */
        rig.cones.visible = any;
        rig.pool.visible = any;
        rig.halo.visible = haloAny;
      }

      if (signal.mode === "off") return;
      signal.phase += dt * 1.4;
      if (signal.phase > 2) signal.phase -= 2;
      const left = signal.mode === "left" || signal.mode === "hazard";
      const right = signal.mode === "right" || signal.mode === "hazard";
      /* Bütün gruplar yeniden değerlendirilir: böylece camı paylaşan
         stop lambası, sinyalin kapalı fazında yanlışlıkla sönmez. */
      apply();
    },

    dispose: function () {
      if (!rig) return;
      if (rig.root.parent) rig.root.parent.remove(rig.root);
      try { rig.geo.dispose(); } catch (e) { }
      rig.cones.children.forEach(function (b) { try { b.material.dispose(); } catch (e) { } });
      try { rig.pool.geometry.dispose(); rig.pool.material.dispose(); } catch (e) { }
      rig.halo.children.forEach(function (s) { try { s.material.dispose(); } catch (e) { } });
      rig.textures.forEach(function (t) { try { t.dispose(); } catch (e) { } });
    },

    get state() { return on; },
    get signal() { return signal.mode; },
    materials: { L: signalL, R: signalR },
    get beams() { return rig; },
    get faceDot() { return faceDot; },
  };
}
