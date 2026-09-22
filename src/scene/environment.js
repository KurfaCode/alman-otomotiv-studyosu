import * as THREE from "../../vendor/three/three.module.js";

/* ============================================================
   Render ayarları ve stüdyo ortamı.

   Ortam haritası internetten indirilmez: küçük bir eşdikdörtgen
   (equirect) canvas prosedürel olarak çizilir, PMREM ile ön
   filtrelenir. Maliyet tek seferdir, kare başı maliyet sıfırdır.
   Metalik boya ve siyah gövde parlaklığını bu haritadan alır.
   ============================================================ */

export function applyRendererSettings(renderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;
  renderer.autoClear = true;
}

/* Stüdyo: koyu zemin + tepede parlak şerit + iki yan softbox + ön dolgu */
function studioEquirect() {
  const w = 256, h = 128;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d");

  x.fillStyle = "#05070c";
  x.fillRect(0, 0, w, h);

  /* tepe ışık şeridi — siyah boyanın yansıtacağı ana kaynak */
  const top = x.createLinearGradient(0, 0, 0, 46);
  top.addColorStop(0.0, "#ffffff");
  top.addColorStop(0.55, "#c9d4e6");
  top.addColorStop(1.0, "#05070c");
  x.fillStyle = top;
  x.fillRect(0, 0, w, 46);

  /* yan softbox'lar */
  const box = (cx, wd) => {
    const g = x.createLinearGradient(cx - wd / 2, 0, cx + wd / 2, 0);
    g.addColorStop(0, "rgba(228,236,250,0)");
    g.addColorStop(0.5, "rgba(228,236,250,0.92)");
    g.addColorStop(1, "rgba(228,236,250,0)");
    x.fillStyle = g;
    x.fillRect(cx - wd / 2, 34, wd, 52);
  };
  box(34, 46);
  box(222, 46);

  /* ön dolgu ve ufuk çizgisi */
  const fill = x.createLinearGradient(0, 74, 0, 96);
  fill.addColorStop(0, "rgba(150,165,190,0.30)");
  fill.addColorStop(1, "rgba(150,165,190,0)");
  x.fillStyle = fill;
  x.fillRect(0, 74, w, 22);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function buildEnvironment(renderer, scene) {
  scene.background = new THREE.Color(0x04060b);
  scene.fog = new THREE.Fog(0x04060b, 16, 36);

  const src = studioEquirect();
  let rt = null;
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    rt = pmrem.fromEquirectangular(src);
    scene.environment = rt.texture;
    pmrem.dispose();
  } catch (e) {
    scene.environment = null;
  }
  src.dispose();

  /* Işıklar: ortam haritası zaten ana kaynak; bunlar yön ve kontrast verir */
  const hemi = new THREE.AmbientLight(0x8f9ab0, 0.55);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff2df, 1.5);
  key.position.set(-4.2, 7.0, 5.4);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xbcd0ff, 0.9);
  rim.position.set(5.0, 3.2, -6.4);
  scene.add(rim);

  return {
    key,
    rim,
    dispose() {
      if (rt) rt.dispose();
      hemi.dispose();
      key.dispose();
      rim.dispose();
    },
  };
}
