/* ============================================================
   Sabitler. Sahne/arayüz ayarı buradan yapılır; hiçbir modül
   kendi içinde sihirli sayı taşımaz.
   ============================================================ */

export const CFG = {
  version: "2.3",

  /* Araba ölçüsü: model birimi ne olursa olsun bu uzunluğa ölçeklenir */
  car: {
    length: 4.62,
    podiumTop: 0.34,       // podyum üst yüzeyi (m)
  },

  camera: {
    fov: 38,
    start: [5.0, 2.25, 6.3],
    target: [0, 0.80, 0],
    /* Zoom kapalı (kiosk kilidi): bu iki değer yalnızca odak
       yerleşimlerini sınırlar. Dar/dikey ekranda kadraj 15 m'yi
       aşabildiği için geniş tutulur — yoksa kamera kırpılır. */
    minDistance: 2.2,
    maxDistance: 40.0,
    minPolar: 0.34,        // rad — tam tepeden bakışı engeller
    maxPolar: 1.52,
    /* ±1,6 rad (≈92°) — yan görüş odakları sınırda kalmasın, ama
       izleyici duvarın arkasına geçemesin. */
    minAzimuth: -1.6,
    maxAzimuth: 1.6,
    rotateSpeed: 0.75,
    damping: 0.06,
    /* Kadraj payı: araba ekranı doldurmasın, sahnede nefes alsın.
       1,22 → 1,36: araba bir tık küçüldü, podyum ve duvar kadraja girdi. */
    frameMargin: 1.36,
    fovBias: {             // kadraj sıkışmasın diye uzun modellerde fov açılır
      longCar: 1.06,
      threshold: 1.35,     // uzunluk / genişlik oranı
    },
  },

  stage: {
    podium: 3.40,
    step: 4.02,
    floor: 22,
    wallZ: -9.2,
    wallW: 26,
    wallH: 7.4,
    /* Arka plan künyesi: duvarın tepesinde değil, arabanın TAM
       arkasında durur — kamera ne olursa olsun kadraja girer. */
    backdropY: 2.44,
    backdropZ: -6.0,
    backdropW: 8.6,
    watermarkY: 2.05,
    barX: 8.6,
    fogNear: 16,
    fogFar: 36,
  },

  motion: {
    podiumSpin: 0.26,      // rad/s — tam tur ~24 sn
    wheelSpinIdle: 0.85,   // rad/s
    wheelSpinDrive: 3.1,   // "sürüş" vitrini
    intro: 0.9,            // sn — araba podyuma oturma animasyonu
    resumeIdleAfter: 2.4,  // sn — dokunmadan sonra otomatik dönüşe dönüş
  },

  perf: {
    sampleMs: 1000,
    downFps: 26,
    upFps: 52,
    downAfter: 3,
    upAfter: 8,
    startLevel: 0,
    lockLevel: null,       // ?perf=1 gibi zorlamalar için
    /* Ağır modellerde ayna çözünürlüğü kısılır (kare başı yükü yarıya indirir) */
    heavyTriangles: 450000,
    heavyReflection: 256,
    /* Hafif model sürümüne geçmeden önce kadro bu kademede bu kadar
       kalmalı: model yüklenirken oluşan kısa FPS düşüşleri model
       değiştirmeye yol açmasın. */
    swapDwellMs: 5000,
    /* Kademeler: kare başı maliyeti düşen sırayla.
       reflectEvery: ayna kaç karede bir yeniden çizilir (0/1 = her kare).
       Yansıma sahnenin ikinci kez çizilmesi olduğu için zayıf tahtada
       kare atlatmak en büyük tasarrufu sağlar. */
    levels: [
      { label: "Tam",     dpr: 1.00, reflection: 512, reflectEvery: 1, decorations: true,  wheelSpin: true,  maxLights: true },
      { label: "Dengeli", dpr: 0.85, reflection: 256, reflectEvery: 2, decorations: true,  wheelSpin: true,  maxLights: false },
      { label: "Hafif",   dpr: 0.70, reflection: 0,   reflectEvery: 1, decorations: false, wheelSpin: false, maxLights: false },
    ],
  },

  loader: {
    /* Sabit zaman aşımı yok: ilerleme geldiği sürece süre uzar */
    stallMs: 18000,
    minShowMs: 550,
  },

  ui: {
    toastMs: 2400,
    catFadeMs: 170,
    dict: [
      ["Pferdestärke (PS)", "Beygir gücü"],
      ["Allradantrieb", "4×4 çekiş"],
      ["Heckantrieb", "Arkadan itiş"],
      ["Höchstgeschwindigkeit", "Maksimum hız"],
      ["Beschleunigung", "İvme / 0-100"],
      ["Fahrwerk", "Şasi / yürüyen aksam"],
      ["Karosserie", "Gövde"],
      ["Scheinwerfer", "Far"],
      ["Bremse", "Fren"],
      ["Felge / Reifen", "Jant / lastik"],
      ["Innenraum", "İç mekân"],
      ["Kraftstoff", "Yakıt"],
    ],
  },
};

/* Zayıf cihaz sezgisi: çekirdek sayısı düşük ya da ekran yoğunluğu 1 olan
   (tipik okul tahtası) cihazlarda sahne "Dengeli" kademede başlar. Kullanıcı
   ?perf=… ile bunu ezebilir; FPS ölçer yine kendi ayarını yapar. */
export function guessStartLevel(nav, screenW, screenH, dpr) {
  const cores = nav && nav.hardwareConcurrency ? nav.hardwareConcurrency : 8;
  const memory = nav && nav.deviceMemory ? nav.deviceMemory : 8;
  const touch = !!(nav && nav.maxTouchPoints);
  const ratio = dpr || 1;
  const weak = cores <= 4 || memory <= 4;
  /* 1366×768 ve benzeri düşük yoğunluklu paneller: tahta olasılığı yüksek */
  const board = touch && ratio <= 1.1 && screenW >= 1000 && screenW <= 1600 && screenH <= 900;
  return weak || board ? 1 : CFG.perf.startLevel;
}

export function level(i) {
  const list = CFG.perf.levels;
  const raw = typeof i === "number" && isFinite(i) ? Math.round(i) : 0;
  const n = Math.max(0, Math.min(list.length - 1, raw));
  return Object.assign({ index: n }, list[n]);
}

/* ?perf=2 gibi adres parametrelerini güvenle sayıya çevirir */
export function parseLevel(text) {
  if (text === null || text === undefined || !/^-?\d+$/.test(String(text).trim())) return null;
  return Math.max(0, Math.min(CFG.perf.levels.length - 1, parseInt(text, 10)));
}
