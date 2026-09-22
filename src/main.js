import * as THREE from "../vendor/three/three.module.js";
import { OrbitControls } from "../vendor/three/addons/controls/OrbitControls.js";

import { CFG, level as levelOf, parseLevel, guessStartLevel } from "./config.js";
import { BRANDS, CATEGORIES, brandAt } from "./data/brands.js";
import { applyRendererSettings, buildEnvironment } from "./scene/environment.js";
import { createStage } from "./scene/stage.js";
import { createReflection } from "./scene/reflection.js";
import { createLoader, loadFirst, prepareCar, disposeCar, localBox } from "./scene/car.js";
import { buildConceptCar } from "./scene/concept.js";
import { alignYaw, computeAnchors, createDirector, fitCameraFov, fitDistance } from "./scene/focus.js";
import { createWheels, createTurntable } from "./scene/wheels.js";
import { createLighting } from "./scene/effects.js";
import { createMonitor } from "./perf/monitor.js";
import { createLoaderUI } from "./ui/loader.js";
import { createBrandPanel } from "./ui/brandPanel.js";
import { createFeatureCards } from "./ui/featureCards.js";
import { createShell } from "./ui/shell.js";
import { bindDictionary } from "./ui/dict.js";
import { createLeaders } from "./ui/leaders.js";

/* ============================================================
   Akış:
     init()  → renderer + sahne + arayüz
     show(i) → marka künyesi, kategori kartları, araba yükleme
     loop()  → turntable, jantlar, ışıklar, kamera yönetmeni, çizim
   ============================================================ */

const params = new URLSearchParams(window.location.search);

const app = {
  renderer: null, scene: null, camera: null, controls: null,
  env: null, stage: null, reflect: null,
  loader: null, loaderUI: null, panel: null, cards: null, shell: null,
  monitor: null, director: null, anchors: null, leaders: null,
  reflectionCap: 512, preferLight: false, usingLight: false,
  car: null, wheels: null, lights: null, turntable: null,
  index: 0, token: 0, catId: CATEGORIES[0].id, reflectionAllowed: false,
  lastW: 0, lastH: 0, refit: null, spinBeforeLight: true, lowSince: 0,
  visible: true, last: 0, raf: 0, intro: null,
  basePixelRatio: 1, levelIndex: 0, current: null,
};

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch (e) { return false; }
}

/* ---------------- kalite kademeleri ---------------- */
function applyQuality(i, announce) {
  const lv = levelOf(i);
  app.levelIndex = lv.index;

  /* çözünürlük: cihaz DPR'ı 1'i geçmez + toplam piksel tavanı (4K tahta koruması) */
  const w = window.innerWidth || 1280;
  const h = window.innerHeight || 720;
  const dpr = Math.min(window.devicePixelRatio || 1, 1);
  const cap = Math.min(1, Math.sqrt(2200000 / Math.max(1, w * h)));
  const ratio = Math.max(0.5, Math.min(1, dpr * cap * lv.dpr));
  if (app.renderer) {
    app.renderer.setPixelRatio(ratio);
    app.renderer.setSize(w, h);
  }

  if (app.reflect) {
    const px = app.reflectionAllowed ? Math.min(app.reflectionCap, lv.reflection) : 0;
    app.reflect.api.setQuality(px);
    /* Ayna kare atlaması: zayıf tahtada kare başı yükü yarıya iner */
    if (app.reflect.api.setInterval) app.reflect.api.setInterval(lv.reflectEvery || 1);
  }
  if (app.stage) app.stage.setDecorations(lv.decorations);
  if (app.wheels) app.wheels.setEnabled(lv.wheelSpin);
  if (app.env && app.env.rim) app.env.rim.intensity = lv.maxLights ? 0.9 : 0;

  document.documentElement.setAttribute("data-perf", String(lv.index));
  if (announce) app.shell.toast("Kalite: " + lv.label + " modu");
}

/* Kadro "Hafif" kademeye düşerse (yani cihaz gerçekten zorlanıyorsa) aynı
   markanın optimize edilmiş sürümüne geçilir. İki güvence var: (1) kısa
   süreli düşüşler sayılmaz — model yüklenirken FPS düşer ve ilk yüklemede
   tam detay modelden vazgeçmek istemiyoruz; (2) bir kez olur, geri dönmez,
   yoksa FPS yükselince ağır modele dönüp kısır döngü kurulurdu. */
function maybeSwapModel(lv) {
  if (app.usingLight || app.preferLight) return;
  const brand = app.current;
  if (!brand || !brand.lightFiles || !brand.lightFiles.length) return;
  if (lv < CFG.perf.levels.length - 1 || !app.car || app.car.concept) {
    app.lowSince = 0;
    return;
  }
  const now = performance.now();
  if (!app.lowSince) { app.lowSince = now; return; }
  if (now - app.lowSince < CFG.perf.swapDwellMs) return;
  app.usingLight = true;
  app.shell.toast(brand.short + ": cihaz zorlanıyor, hafif model sürümüne geçildi.", 3200);
  loadModel(brand);
}

/* ---------------- marka geçişi ---------------- */
function pad2(n) { return (n < 10 ? "0" : "") + n; }

function applyBrandTheme(brand) {
  document.documentElement.style.setProperty("--accent", brand.accent);
  document.documentElement.style.setProperty("--accent-soft", brand.accent + "24");
  document.documentElement.style.setProperty("--accent-line", brand.accent + "6b");
  const wash = document.getElementById("accent-wash");
  if (wash) wash.style.background = brand.accent;
  if (app.stage) {
    app.stage.setAccent(brand.accent, brand.accentHex);
    app.stage.setActive(app.index);
    app.stage.setWatermark(brand.name, brand.model);
    if (app.stage.setEmblem) app.stage.setEmblem(brand.emblem || brand.id);
    /* Duvardaki künye çipleri panel ile aynı veriyi gösterir. */
    if (app.stage.setMeta) {
      app.stage.setMeta({
        generation: brand.generation,
        segment: brand.segment,
        hq: brand.hq,
        plate: pad2(app.index + 1) + " / " + pad2(BRANDS.length),
      });
    }
  }
}

function show(instant) {
  const brand = brandAt(app.index);
  app.current = brand;

  app.panel.render(brand);
  app.panel.setStatus("loading");
  app.cards.setActive(app.catId);
  app.cards.renderCards(brand, app.catId);
  app.shell.setActive(app.index, BRANDS.length);
  applyBrandTheme(brand);

  /* Podyum asla boş kalmaz ama gereksiz yere de araba değiştirmez:
     önceki araba duruyorsa yeni model HAZIR olana kadar ekranda kalır.
     Böylece marka geçişinde "araba kayboldu, maket geldi, araba döndü"
     şeklinde çırpınma olmaz. Hiç araba yoksa hemen maket kurulur. */
  if (!app.car) useConcept(brand, true);

  loadModel(brand, instant);
}

function useConcept(brand, silent) {
  clearCar();
  const car = buildConceptCar(brand);
  mountCar(car, true);
  if (!silent) app.panel.setStatus("concept");
}

function clearCar() {
  /* Işık donanımı arabanın YUVASINA bağlıdır (arabanın kendisine değil),
     o yüzden arabadan önce sökülür — yoksa her marka geçişinde bir
     huzme/hale takımı yuvada birikir. */
  if (app.lights && app.lights.dispose) app.lights.dispose();
  app.lights = null;
  if (app.car) {
    disposeCar(app.car);
    app.car = null;
  }
  app.wheels = null;
  app.director = null;
  app.turntable = createTurntable(app.stage);
}

function mountCar(car, instant) {
  app.car = car;
  app.stage.carSlot.add(car.object);

  fitCameraFov(app.camera, car);
  app.stage.setShadowSize(car.size.x, car.size.z);

  app.wheels = createWheels(car);
  app.wheels.setEnabled(levelOf(app.levelIndex).wheelSpin);
  app.lights = createLighting(car);

  const cat = CATEGORIES.filter(function (c) { return c.id === app.catId; })[0] || CATEGORIES[0];
  aimAt(cat.focus || "hero", instant !== false);

  /* Shader'ları önceden derle: ilk döndürmede takılma olmasın (tek seferlik) */
  requestAnimationFrame(function () {
    if (!app.renderer) return;
    try { app.renderer.compile(app.scene, app.camera); } catch (e) { }
  });

  app.intro = { t: 0, dur: CFG.motion.intro };
  app.shell.setTool("spin", app.turntable.spinning);
  app.shell.setTool("low", false);
  app.shell.setTool("brake", false);
  app.shell.setTool("signal", false);
}

function loadModel(brand, instant) {
  const token = ++app.token;
  app.loaderUI.setText(brand.short + " modeli aranıyor…");
  app.loaderUI.setPercent(0);

  /* Zayıf cihazda (?light=1) ya da kadro "Hafif"e düştüğünde hafif
     sürüm tercih edilir. Varsayılan TAM detaydır: model 1,03M üçgenin
     tamamını gösterir, kalite kademesi yalnızca çözünürlük/ayna kısar. */
  const wantLight = app.preferLight || app.usingLight;
  /* Sürüm etiketi şart: model dosyası değiştiğinde tarayıcı önbelleği
     eski GLB'yi göstermeye devam ediyordu ("Audi değişmemiş" görüntüsü).
     Yeni model koyduğunuzda CFG.version'ı artırın. */
  const files = (wantLight && brand.lightFiles ? brand.lightFiles.concat(brand.files) : brand.files)
    .map(function (f) { return f + (f.indexOf("?") >= 0 ? "&" : "?") + "v=" + CFG.version; });

  let lastPct = -1;
  loadFirst(app.loader, files, function (xhr) {
    if (token !== app.token) return;
    const pct = xhr.total ? Math.round((xhr.loaded / xhr.total) * 100) : -1;
    if (pct !== lastPct) {
      lastPct = pct;
      app.panel.setStatus("loading", pct >= 0 ? "… " + brand.short + " %" + pct : "… YÜKLENİYOR");
    }
    app.loaderUI.progress(xhr.loaded, xhr.total, brand.short + " modeli");
  }).then(function (gltf) {
    if (token !== app.token) return;
    if (!gltf) {
      useConcept(brand, true);
      app.panel.setStatus("concept");
      app.loaderUI.hide();
      app.shell.toast(brand.short + " için model dosyası yok — konsept maket gösteriliyor.", 2800);
      return;
    }
    try {
      const prepared = prepareCar(gltf.scene);
      const wasConcept = app.car && app.car.concept;
      let tris = 0;
      prepared.object.traverse(function (o) {
        if (!o.isMesh || !o.geometry) return;
        const ix = o.geometry.index;
        tris += Math.round((ix ? ix.count : (o.geometry.attributes.position ? o.geometry.attributes.position.count : 0)) / 3);
      });
      /* Ağır modelde ayna çözünürlüğü kısılır: kare başı yük yarıya iner */
      app.reflectionCap = tris > CFG.perf.heavyTriangles ? CFG.perf.heavyReflection : 512;
      clearCar();
      mountCar(prepared, true);
      applyQuality(app.levelIndex, false);
      app.panel.setStatus("real");
      app.loaderUI.hide();
      if (!wasConcept) app.shell.toast("Gerçek model yüklendi: " + brand.short + " · " + (tris / 1e6).toFixed(2) + "M üçgen", 2400);
    } catch (e) {
      useConcept(brand, true);
      app.panel.setStatus("concept", "○ KONSEPT MAKET (okuma hatası)");
      app.loaderUI.hide();
      try { console.error("[AO] model okunamadı:", brand.id, e && e.message); } catch (err) { }
    }
  });
}

/* ---------------- kullanıcı eylemleri ---------------- */
function goTo(i) {
  const n = BRANDS.length;
  const next = ((i % n) + n) % n;
  if (next === app.index && app.car) return;
  app.index = next;
  show();
}

/* Bir odağa geçiş: kameranın azimutu korunur, arabayı istenen yüzü
   kameraya gösterecek şekilde PODYUM döner, kadraj yeniden kurulur.
   (Eskiden kamera dünya +Z'sine göre konumlanıyordu: araba dönmüşse
   "ön" görüşü arkasından bakıyordu ve farlar ekranda görünmüyordu.) */
function aimAt(focus, instant) {
  if (!app.car || !app.camera || !app.controls) return;
  const name = focus || "hero";
  let delta = 0;
  const target = alignYaw(app.car, app.camera, name);
  if (target !== null && app.turntable && app.turntable.rotateTo) {
    delta = target - app.stage.podiumGroup.rotation.y;
    app.turntable.rotateTo(target);
  }
  app.anchors = computeAnchors(app.car, app.camera, delta);
  app.director = createDirector(app.camera, app.controls, app.anchors.views);
  app.director.goto(name, instant === true);
  if (app.leaders) {
    app.leaders.setCar(app.car, app.anchors.points);
    app.leaders.measure();
  }
}

function pickCategory(id) {
  const cat = CATEGORIES.filter(function (c) { return c.id === id; })[0];
  if (!cat) return;
  app.catId = id;
  app.cards.setActive(id);
  if (app.current) app.cards.renderCards(app.current, id);
  if (cat.focus) aimAt(cat.focus);

  /* Bir konu seçildiğinde dönüş durur ve kılavuz çizgileri belirir:
     çizgi gerçek parçayı işaret ettiği için sabit durması gerekir.
     "Konu" seçilirse dönüş yeniden başlar, çizgiler kaybolur. */
  if (id === CATEGORIES[0].id) {
    app.turntable.setSpinning(true);
    app.shell.setTool("spin", true);
    if (app.leaders) app.leaders.hide();
  } else {
    app.turntable.setSpinning(false);
    app.shell.setTool("spin", false);
    if (app.leaders) {
      app.leaders.measure();
      app.leaders.show();
    }
  }
}

function action(id) {
  if (id === "spin") {
    const on = !app.turntable.spinning;
    app.turntable.setSpinning(on);
    app.shell.setTool("spin", on);
    if (app.leaders) {
      if (on) app.leaders.hide();
      else { app.leaders.measure(); app.leaders.show(); }
    }
    app.shell.toast(on ? "Otomatik dönüş açık" : "Dönüş durdu · kılavuz çizgileri açık");
    return;
  }
  if (!app.lights) return;
  if (id === "low") {
    app.shell.toast(app.lights.toggleLow());
    app.shell.setTool("low", app.lights.state.low);
    /* Farlar açıkken kamera öne kayar ve dönüş durur: ışık net görünsün,
       kapanınca eski dönüş hâline dönülür. */
    if (app.lights.state.low) {
      app.spinBeforeLight = app.turntable.spinning;
      app.turntable.setSpinning(false);
      app.shell.setTool("spin", false);
      /* Araba önünü kameraya döner: far/uzun far gerçekten görünür. */
      aimAt("front");
    } else if (app.spinBeforeLight) {
      app.turntable.setSpinning(true);
      app.shell.setTool("spin", true);
      aimAt("hero");
    } else {
      aimAt("hero");
    }
  } else if (id === "brake") {
    app.shell.toast(app.lights.toggleBrake());
    app.shell.setTool("brake", app.lights.state.brake);
  } else if (id === "signal") {
    app.shell.toast(app.lights.cycleSignal());
    app.shell.setTool("signal", app.lights.signal !== "off");
  }
  if (app.wheels) app.wheels.setDriving(app.lights.state.low && !app.lights.state.brake);
}

/* ---------------- teşhis (?debug=1) ----------------
   Kare, çizim çağrısı, üçgen, yansıma durumu ve arabanın kadraja
   sığıp sığmadığı (NDC sınırları) tek çağrıda okunur. */
function diag() {
  const out = {
    level: app.levelIndex,
    levelLabel: levelOf(app.levelIndex).label,
    fps: app.monitor ? app.monitor.fps : -1,
    dpr: app.renderer ? app.renderer.getPixelRatio() : -1,
    canvas: app.renderer ? [app.renderer.domElement.width, app.renderer.domElement.height] : null,
    viewport: [window.innerWidth, window.innerHeight],
    info: app.renderer ? {
      calls: app.renderer.info.render.calls,
      tris: app.renderer.info.render.triangles,
      programs: app.renderer.info.programs ? app.renderer.info.programs.length : -1,
      textures: app.renderer.info.memory.textures,
      geometries: app.renderer.info.memory.geometries,
    } : null,
    reflection: app.reflect ? app.reflect.api.enabled : false,
    reflectionAllowed: app.reflectionAllowed,
    brand: app.current ? app.current.id : null,
    focus: app.director ? app.director.active : null,
  };
  if (app.car) {
    /* Arabanın KENDİ çerçevesindeki kutu: podyum dönerken de doğru
       kalır (dünya eksenli kutu dönüşte şişer). Gizli asfalt düzlemi
       hesaba katılmaz. */
    const box = localBox(app.car.object);
    const world = new THREE.Box3();
    const c = new THREE.Vector3();
    const v = new THREE.Vector3();
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (let i = 0; i < 8; i++) {
      c.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
      world.expandByPoint(v.copy(c).applyMatrix4(app.car.object.matrixWorld));
      v.project(app.camera);
      minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
    }
    out.car = {
      concept: !!app.car.concept,
      size: [+app.car.size.x.toFixed(2), +app.car.size.y.toFixed(2), +app.car.size.z.toFixed(2)],
      wheels: app.car.wheels ? app.car.wheels.length : 0,
      materials: app.car.materials ? app.car.materials.length : 0,
      localY: [+box.min.y.toFixed(3), +box.max.y.toFixed(3)],
      boxMin: [+box.min.x.toFixed(2), +box.min.y.toFixed(2), +box.min.z.toFixed(2)],
      boxMax: [+box.max.x.toFixed(2), +box.max.y.toFixed(2), +box.max.z.toFixed(2)],
      centerNdc: (function () {
        const c = new THREE.Vector3((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, (box.min.z + box.max.z) / 2);
        c.applyMatrix4(app.car.object.matrixWorld).project(app.camera);
        return [+c.x.toFixed(2), +c.y.toFixed(2)];
      })(),
      aspect: +app.camera.aspect.toFixed(3),
      fov: +app.camera.fov.toFixed(1),
      renders: app.renderer.info.render.frame,
      baseDist: +fitDistance(app.car, app.camera).toFixed(2),
      worldY: [+world.min.y.toFixed(3), +world.max.y.toFixed(3)],
      podiumTop: CFG.car.podiumTop,
      cameraPos: app.camera.position.toArray().map(function (n) { return +n.toFixed(2); }),
      ndc: [+minX.toFixed(2), +maxX.toFixed(2), +minY.toFixed(2), +maxY.toFixed(2)],
      fits: minX > -1.02 && maxX < 1.02 && minY > -1.02 && maxY < 1.02,
    };
  }
  return out;
}

/* ---------------- ana döngü ---------------- */
function frame() {
  app.raf = requestAnimationFrame(frame);

  const now = performance.now();
  let dt = (now - app.last) / 1000;
  app.last = now;
  if (!isFinite(dt) || dt <= 0) dt = 1 / 60;
  if (dt > 0.05) dt = 0.05;

  app.loaderUI.tick();

  /* Boyut değişikliği kaçırılmış olsa bile kadraj kendini toparlar */
  if (window.innerWidth !== app.lastW || window.innerHeight !== app.lastH) {
    app.lastW = window.innerWidth;
    app.lastH = window.innerHeight;
    if (app.refit) app.refit();
  }

  if (app.visible) {
    if (app.turntable) app.turntable.update(dt);
    if (app.wheels) app.wheels.update(dt);
    if (app.lights) app.lights.update(dt, app.camera);
    if (app.director) app.director.update(dt);

    if (app.intro && app.car) {
      app.intro.t += dt;
      const k = Math.min(1, app.intro.t / app.intro.dur);
      const e = 1 - Math.pow(1 - k, 3);
      app.car.object.scale.setScalar(0.9 + 0.1 * e);
      app.car.object.position.y = (1 - e) * 0.45;
      if (k >= 1) {
        app.intro = null;
        app.car.object.scale.setScalar(1);
        app.car.object.position.y = 0;
      }
    }

    if (app.controls) app.controls.update();
    if (app.leaders && app.leaders.visible) app.leaders.update(app.camera);
    if (app.renderer && app.scene && app.camera) app.renderer.render(app.scene, app.camera);
  }

  app.monitor.update();
  maybeSwapModel(app.levelIndex);
  if (app.shell.debug) app.shell.setFps(app.monitor.fps, levelOf(app.levelIndex).label);
}

/* ---------------- kurulum ---------------- */
function init() {
  app.loaderUI = createLoaderUI(function (seconds) {
    app.loaderUI.hide();
    app.shell.toast("Model yüklenemedi (" + seconds + " sn ilerleme yok) — konsept maket gösteriliyor.", 3600);
  });

  if (!hasWebGL()) {
    app.loaderUI.fatal("WebGL başlatılamadı", "Bu tarayıcı 3B sahneyi çizemiyor. Chrome veya Edge ile açın.");
    return;
  }

  try {
    app.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
      /* highp şart: mediump'ta derinlik 7 m'de mm seviyesinde kayar ve
         zemindeki halkalar/çizgiler titreşir (z-fighting). */
      precision: "highp",
      stencil: false,
      alpha: false,
    });
  } catch (e) {
    app.loaderUI.fatal("Grafik başlatılamadı", "Tarayıcı 3B bağlamı vermedi: " + e.message);
    return;
  }

  app.renderer.setSize(window.innerWidth, window.innerHeight);
  applyRendererSettings(app.renderer);
  document.getElementById("stage").appendChild(app.renderer.domElement);

  app.scene = new THREE.Scene();
  app.camera = new THREE.PerspectiveCamera(CFG.camera.fov, window.innerWidth / window.innerHeight, 0.1, 90);
  app.camera.position.fromArray(CFG.camera.start);

  app.env = buildEnvironment(app.renderer, app.scene);
  app.env.rim.intensity = 0.9;

  app.stage = createStage(app.scene);
  app.stage.setNames(BRANDS.map(function (b) { return b.presenter || b.short; }));
  app.stage.setActive(0);
  app.stage.setWatermark(BRANDS[0].name);

  /* Yansıma, yarım-float bir render target ister. Eski bir tahtada bu
     uzantı yoksa ayna hiç açılmaz; parlak siyah disk aynı işi görür. */
  let halfFloatOk = false;
  try {
    halfFloatOk = app.renderer.capabilities.isWebGL2 === true
      || app.renderer.extensions.has("EXT_color_buffer_half_float");
  } catch (e) { halfFloatOk = false; }
  app.reflectionAllowed = halfFloatOk && params.get("norefl") !== "1";

  /* Ayna artık podyumun üst kapağının ÜSTÜNDE durur (eskiden 4 mm
     altında kalıyor ve gömülü olduğu için hiç görünmüyordu). Yarıçapı
     podyum dudağından küçüktür, böylece düzlükte çakışma olmaz. */
  const refl = createReflection({
    radius: CFG.stage.podium - 0.135,
    y: CFG.car.podiumTop - 0.0055,
    excludes: function () { return [app.stage.shadow].concat(app.stage.decor); },
  });
  app.reflect = refl;
  app.stage.podiumGroup.add(refl.group);

  app.controls = new OrbitControls(app.camera, app.renderer.domElement);
  app.controls.target.set(CFG.camera.target[0], CFG.camera.target[1], CFG.camera.target[2]);
  app.controls.enableDamping = false;
  app.controls.enablePan = false;
  app.controls.enableZoom = false;
  app.controls.minDistance = CFG.camera.minDistance;
  app.controls.maxDistance = CFG.camera.maxDistance;
  app.controls.minPolarAngle = CFG.camera.minPolar;
  app.controls.maxPolarAngle = CFG.camera.maxPolar;
  app.controls.minAzimuthAngle = CFG.camera.minAzimuth;
  app.controls.maxAzimuthAngle = CFG.camera.maxAzimuth;
  app.controls.rotateSpeed = CFG.camera.rotateSpeed;

  app.turntable = createTurntable(app.stage);

  app.panel = createBrandPanel();
  app.leaders = createLeaders();
  app.cards = createFeatureCards(pickCategory, function () {
    if (app.leaders) app.leaders.measure();
  });
  app.cards.buildCats(CATEGORIES);

  app.shell = createShell({
    next: function () { goTo(app.index + 1); },
    prev: function () { goTo(app.index - 1); },
    goto: goTo,
    action: action,
    step: function (d) { if (app.cards) app.cards.step(d); },
    toggleDebug: function () { app.shell.setDebug(!app.shell.debug); },
  });
  app.shell.buildDots(BRANDS);
  app.shell.setActive(0, BRANDS.length);
  app.shell.setTool("spin", true);

  bindDictionary();

  /* sürükleme sırasında kamera yönetmeni dursun, dönüş dinlensin sonra geri gelsin */
  let spinResume = null;
  let spinWasOn = true;
  app.controls.addEventListener("start", function () {
    if (app.director) app.director.cancel();
    spinWasOn = app.turntable.spinning;
    app.turntable.setSpinning(false);
    clearTimeout(spinResume);
  });
  app.controls.addEventListener("end", function () {
    clearTimeout(spinResume);
    spinResume = setTimeout(function () {
      if (spinWasOn) {
        app.turntable.setSpinning(true);
        app.shell.setTool("spin", true);
      }
    }, CFG.motion.resumeIdleAfter * 1000);
  });

  app.loader = createLoader();
  const forcedLevel = parseLevel(params.get("perf"));
  const guessed = guessStartLevel(
    navigator,
    window.screen ? window.screen.width : 0,
    window.screen ? window.screen.height : 0,
    window.devicePixelRatio
  );
  app.monitor = createMonitor({
    startLevel: forcedLevel === null ? guessed : forcedLevel,
    forced: forcedLevel,
    onLevel: function (lv, announce) {
      applyQuality(lv, announce);
      maybeSwapModel(lv);
    },
  });

  if (params.get("light") === "1") app.preferLight = true;
  if (params.get("debug") === "1") {
    app.shell.setDebug(true);
    app.diag = diag;
    window.__AO = app;          /* tarayıcı konsolundan teşhis için */
  }

  const startBrand = params.get("brand");
  if (startBrand) {
    const idx = BRANDS.map(function (b) { return b.id; }).indexOf(startBrand);
    if (idx >= 0) app.index = idx;
  }

  /* Pencere/tahta en-boy oranı değişince kadraj baştan hesaplanır:
     dar/dikey ekranda araba kırpılmasın. Hem resize olayı hem de kare
     döngüsündeki boyut kontrolü bu işi tetikler (kaçırılan olay olmasın). */
  let resizeTimer = null;
  function scheduleRefit() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (!app.renderer || !app.camera) return;
      app.camera.aspect = window.innerWidth / window.innerHeight;
      app.camera.updateProjectionMatrix();
      applyQuality(app.levelIndex, false);
      if (!app.car) return;
      fitCameraFov(app.camera, app.car);
      app.anchors = computeAnchors(app.car, app.camera);
      app.director = createDirector(app.camera, app.controls, app.anchors.views);
      const cat = CATEGORIES.filter(function (c) { return c.id === app.catId; })[0] || CATEGORIES[0];
      app.director.goto(cat.focus || "hero", true);
      if (app.leaders) {
        app.leaders.setCar(app.car, app.anchors.points);
        app.leaders.measure();
      }
    }, 150);
  }
  app.refit = scheduleRefit;
  window.addEventListener("resize", function () {
    app.lastW = window.innerWidth;
    app.lastH = window.innerHeight;
    scheduleRefit();
  });
  app.lastW = window.innerWidth;
  app.lastH = window.innerHeight;

  document.addEventListener("visibilitychange", function () {
    app.visible = !document.hidden;
    app.last = performance.now();
  });

  /* beklenmedik hata: sahne boş kalmasın (hata konsola da yazılır ki
     gerçek sorun görünmez olmasın) */
  window.addEventListener("error", function (e) {
    const msg = e && e.message ? e.message : "bilinmeyen hata";
    app.lastError = msg;
    try { console.error("[AO] sahne hatası:", msg, e && e.filename ? e.filename + ":" + e.lineno : ""); } catch (err) { }
    if (!app.car && app.stage && app.current) {
      try { useConcept(app.current); } catch (err) { }
    }
  });

  applyQuality(app.monitor.level, false);
  app.last = performance.now();
  show(true);
  frame();

  /* Yükleme ekranı en fazla ~1,4 sn kalır: podyumda zaten konsept maket var,
     gerçek model sonradan gelirse sorunsuz yerine oturur. */
  setTimeout(function () { app.loaderUI.hide(); }, 1400);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
