import * as THREE from "../../vendor/three/three.module.js";
import { Reflector } from "../../vendor/three/addons/objects/Reflector.js";

/* ============================================================
   Podyum üstü yansıma.

   Gerçek ayna (Reflector) kullanılır ama küçük bir render target
   ile: 512² veya 256². Kare başı maliyet, yalnızca podyum diski
   için sahnenin ikinci kez çizilmesidir; bu yüzden kalite
   kademesiyle kapatılabilir. Kapalıyken aynı yeri parlak siyah
   bir disk doldurur, görünüm bozulmaz.

   Yansıma geçişinde görünmemesi gereken nesneler (temas gölgesi,
   ışık konisi, arayüz katmanı) listeden gizlenir.
   ============================================================ */

export function createReflection(options) {
  const radius = options.radius;
  const y = options.y;
  const getExcludes = options.excludes || function () { return []; };

  /* Kare atlama: ayna, sahnenin İKİNCİ kez çizilmesi demektir. Zayıf
     tahtada bunu her karede yapmak yerine bir kare atlatmak maliyeti
     yarıya indirir; yansıma bir kare gecikir, gözle fark edilmez. */
  let every = 1;      /* 1 = her kare, 2 = iki karede bir, 0 = hiç */
  let tick = 0;

  const api = {
    mirror: null,
    disc: null,
    enabled: false,
    size: 0,
    setQuality(px) { applyQuality(px); },
    setEnabled(on) { this.setQuality(on ? this.size || 512 : 0); },
    setInterval(every) { setInterval_(every); },
    dispose() { },
  };

  function setInterval_(n) {
    every = (typeof n === "number" && isFinite(n) && n > 0) ? Math.round(n) : 1;
  }

  /* Yansıma kapalıyken görünen parlak siyah disk */
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 72),
    new THREE.MeshStandardMaterial({ color: 0x0a0e16, metalness: 0.55, roughness: 0.24 })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = y - 0.0006;
  disc.renderOrder = 1;
  api.disc = disc;

  /* Gerçek ayna */
  let mirror = null;
  try {
    mirror = new Reflector(new THREE.CircleGeometry(radius, 72), {
      textureWidth: 512,
      textureHeight: 512,
      color: 0x3b3b3b,     // yansımayı kısar: parlak ayna değil, koyu lake yüzey
      clipBias: 0.003,
      multisample: 0,      // MSAA'lı RT eski GPU'larda pahalı
    });
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.y = y;
    mirror.renderOrder = 0;

    /* Reflector'ın kendi geçişine ekleme yapıyoruz: gölge/konik gibi
       nesneler yansımada görünmesin (aksi hâlde kendi kendini karartır). */
    const original = mirror.onBeforeRender;
    mirror.onBeforeRender = function (renderer, scene, camera) {
      tick++;
      /* Atlanan karede önceki yansıma dokusu gösterilmeye devam eder. */
      if (every > 1 && (tick % every) !== 0) return;
      const hidden = getExcludes();
      const state = [];
      for (let i = 0; i < hidden.length; i++) {
        state.push([hidden[i], hidden[i].visible]);
        hidden[i].visible = false;
      }
      try {
        original.call(mirror, renderer, scene, camera);
      } finally {
        for (let i = 0; i < state.length; i++) state[i][0].visible = state[i][1];
      }
    };
    api.mirror = mirror;
  } catch (e) {
    mirror = null;
    api.mirror = null;
  }

  function applyQuality(px) {
    api.size = px;
    if (!mirror || !px) {
      if (mirror) mirror.visible = false;
      disc.visible = true;
      api.enabled = false;
      return;
    }
    try {
      mirror.getRenderTarget().setSize(px, px);
    } catch (e) { /* setSize yoksa varsayılan boyutta kalır */ }
    mirror.visible = true;
    disc.visible = false;
    api.enabled = true;
  }

  api.dispose = function () {
    disc.geometry.dispose();
    disc.material.dispose();
    if (mirror) {
      mirror.geometry.dispose();
      mirror.material.dispose();
      try { mirror.getRenderTarget().dispose(); } catch (e) { }
      mirror.dispose();
    }
  };

  applyQuality(0);

  const group = new THREE.Group();
  group.add(disc);
  if (mirror) group.add(mirror);

  return { group: group, api: api };
}
