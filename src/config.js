/* ============================================================
   Sabitler. Sahne/arayüz ayarı buradan yapılır; hiçbir modül
   kendi içinde sihirli sayı taşımaz.
   ============================================================ */

export const CFG = {
  /* Model/asset sürümü: GLB isteklerine "?v=" olarak eklenir.
     Model dosyası yenilendiğinde bunu artır — yoksa tarayıcı önbelleği
     eski GLB'yi göstermeye devam eder. */
  version: "2.4",

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
      /* En kötü durum (Faz 1 tahtası, i3-2310M + HD 3000): Hafif kademe
         bile 26 FPS'i tutturamazsa çözünürlük bir kademe daha kısılır.
         1920×1080 tahtada 1056×594'e iner — dolgu hızı %60 azalır,
         yani takılma yerine hafif bulanık ama akıcı bir sunum kalır. */
      { label: "Tahta",   dpr: 0.55, reflection: 0,   reflectEvery: 1, decorations: false, wheelSpin: false, maxLights: false },
    ],
  },

  loader: {
    /* Sabit zaman aşımı yok: ilerleme geldiği sürece süre uzar */
    stallMs: 18000,
    minShowMs: 550,
  },

  /* Giriş kapısı (intro). Video yolu değişirse yalnızca burası düzeltilir;
     dosya yoksa/bozuksa sahne kendi sinematik turunu oynatır (intro.js).
     videoLight: zayıf tahtalar (Faz 1/2) için 720p30 sürüm — 1080p60'ı
     Intel HD 3000/4000 akıcı çözemez, filmi kare kare atlamasın. */
  intro: {
    video: "media/intro.mp4",
    videoLight: "media/intro-720.mp4",
    seconds: 30,
    /* Sinematik tur adımları: marka dizini + kategori + süre (ms).
       Kategori odağı kamerayı da taşır (aimAt), yani tur bir kurgu gibi
       akar; kullanıcı dokununca hemen durur. */
    tour: [
      { brand: 0, cat: "konu", ms: 3200 },
      { brand: 0, cat: "tasarim", ms: 3000 },
      { brand: 3, cat: "konu", ms: 3000 },
      { brand: 3, cat: "far", ms: 3000 },
      { brand: 2, cat: "tasarim", ms: 3000 },
      { brand: 2, cat: "jant", ms: 3000 },
      { brand: 4, cat: "motor", ms: 3000 },
      { brand: 5, cat: "ic", ms: 3200 },
      { brand: 1, cat: "tasarim", ms: 3000 },
      { brand: 0, cat: "konu", ms: 2600 },
    ],
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

/* Cihaz sınıfı: MEB akıllı tahtası nesillerine göre başlangıç ayarı.

   Faz 1 (Vestel 2012-15: i3-2310M/3110M, HD 3000/4000, 4 GB)
   Faz 2 (Vestel 2015-20: i5-4200M/4210M, HD 4600, 4-8 GB)
     → WebGL 1 donanımı, 2-4 mantıksal çekirdek
   Faz 3/4 (2021+: i5-8250U…1235U, UHD 620 / Iris Xe, 8-16 GB)
     → WebGL 2, 8+ çekirdek

   Zayıf sınıfta iki şey birden yapılır: kademe "Dengeli" başlar VE
   doğrudan optimize edilmiş hafif model yüklenir. Yoksa tahta önce
   1M üçgenlik tam modeli çizmeye çalışıp ilk saniyelerde takılır,
   ancak FPS ölçeri devreye girince kendini toparlardı — açılışta
   takılmadan başlaması için bu karar burada, baştan verilir.

   Kullanıcı ?perf=… ve ?light=0/1 ile ezebilir. */
export function deviceClass(nav, screenW, screenH, dpr, gl) {
  const n = nav || {};
  const cores = n.hardwareConcurrency ? n.hardwareConcurrency : 8;
  const memory = n.deviceMemory ? n.deviceMemory : 8;
  const touch = !!n.maxTouchPoints;
  const ratio = dpr || 1;
  const weak = cores <= 4 || memory <= 4;
  /* 1366×768 ve benzeri düşük yoğunluklu paneller: tahta olasılığı yüksek */
  const board = touch && ratio <= 1.1 && screenW >= 1000 && screenW <= 1600 && screenH <= 900;
  /* WebGL 1 = 2011-2013 nesli ekran kartı: ayna + tam detay model lüks */
  const webgl1 = !!(gl && gl.capabilities && gl.capabilities.isWebGL2 === false);
  const low = weak || webgl1;
  return {
    cores: cores,
    memory: memory,
    webgl1: webgl1,
    weak: weak,
    board: board,
    level: low || board ? 1 : CFG.perf.startLevel,
    light: low,
    videoLight: low || board,
  };
}

/* Kısa yol: yalnızca başlangıç kademesi soruluyorsa (testler ve eski
   çağrılar) deviceClass'ın kademesini döndürür. */
export function guessStartLevel(nav, screenW, screenH, dpr) {
  return deviceClass(nav, screenW, screenH, dpr, null).level;
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
