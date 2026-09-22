import * as THREE from "../../vendor/three/three.module.js";
import { CFG } from "../config.js";
import { emblemDataURI } from "../ui/emblems.js";

/* ============================================================
   Showroom. Bütün dokular canvas'ta üretilir: indirme yok,
   offline çalışır, maliyet tek seferliktir.

   Dönen grup: podyum + halkalar + ayna + araba (podiumGroup).
   Sabit: zemin, duvar, arka plan pankartı, ışık barları.

   Z-ÇAKIŞMASI KURALLARI (titreme/bozulma olmasın diye):
     • düzlemsel kaplamalar zeminden en az 15 mm yukarıda durur
     • hepsinde polygonOffset açıktır
     • renderer highp precision kullanır (mediump = 7 m'de mm kayması)
     • podyum üstündeki ayna ile araba arasında ~8 mm pay var
   ============================================================ */

function canvasTex(w, h, draw, srgb) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 1;
  return t;
}

/* Temas gölgesi. Ara adımlar çok: 8 bit'te yumuşak gradyanlar
   halka halka bantlanır (eski tahtada "zemin bozuk" gibi görünür). */
function shadowTexture() {
  return canvasTex(256, 256, function (x) {
    const g = x.createRadialGradient(128, 128, 6, 128, 128, 128);
    const stops = [
      [0.00, 0.70], [0.22, 0.56], [0.40, 0.40], [0.55, 0.27],
      [0.68, 0.16], [0.80, 0.075], [0.90, 0.025], [1.00, 0.00],
    ];
    stops.forEach(function (s) {
      g.addColorStop(s[0], "rgba(0,0,0," + s[1] + ")");
    });
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  });
}

function coneTexture() {
  return canvasTex(16, 128, function (x) {
    const g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, "rgba(255,246,226,0.5)");
    g.addColorStop(1, "rgba(255,246,226,0)");
    x.fillStyle = g; x.fillRect(0, 0, 16, 128);
  });
}

function wallTexture() {
  return canvasTex(512, 256, function (x, w, h) {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.00, "#0a0e16");
    g.addColorStop(0.55, "#070a11");
    g.addColorStop(1.00, "#04060a");
    x.fillStyle = g; x.fillRect(0, 0, w, h);

    /* İnce ızgara: düz siyah duvar yerine "perfore panel" hissi.
       Çizgiler çok soluk — araba ve künye öne çıkmaya devam eder. */
    x.strokeStyle = "rgba(255,255,255,0.022)";
    x.lineWidth = 1;
    for (let gx = 16; gx < w; gx += 32) {
      x.beginPath(); x.moveTo(gx + 0.5, 0); x.lineTo(gx + 0.5, h); x.stroke();
    }
    for (let gy = 16; gy < h; gy += 32) {
      x.beginPath(); x.moveTo(0, gy + 0.5); x.lineTo(w, gy + 0.5); x.stroke();
    }

    [150, 300].forEach(function (px) {
      x.fillStyle = "rgba(255,255,255,0.035)"; x.fillRect(px, 0, 2, h);
      x.fillStyle = "rgba(0,0,0,0.5)"; x.fillRect(px + 2, 0, 1, h);
    });
    const s = x.createRadialGradient(w / 2, 0, 6, w / 2, 0, h * 1.05);
    s.addColorStop(0, "rgba(255,255,255,0.10)");
    s.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = s; x.fillRect(0, 0, w, h);
  });
}

/* Duvar yıkaması: marka renginde çok soluk bir ışık şeridi. Renk
   kat sayı olarak çarpılır (gri harita × marka rengi). */
function washTexture() {
  return canvasTex(256, 128, function (x, w, h) {
    const g = x.createRadialGradient(w / 2, h, 4, w / 2, h, w * 0.62);
    g.addColorStop(0.00, "rgba(255,255,255,0.55)");
    g.addColorStop(0.45, "rgba(255,255,255,0.16)");
    g.addColorStop(1.00, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
}

function barGlowTexture() {
  return canvasTex(64, 256, function (x) {
    const g = x.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, "rgba(255,241,214,0)");
    g.addColorStop(0.5, "rgba(255,241,214,0.6)");
    g.addColorStop(1, "rgba(255,241,214,0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 256);
  });
}

function streakTexture() {
  return canvasTex(64, 256, function (x) {
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "rgba(255,246,224,0.5)");
    g.addColorStop(1, "rgba(255,246,224,0)");
    x.fillStyle = g; x.fillRect(24, 0, 16, 256);
  });
}

/* Düzlemsel kaplamalar için ortak ayar: yazma kapalı + z ötelemesi */
function flatOverlay(mat, order, y) {
  mat.transparent = true;
  mat.depthWrite = false;
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -1;
  mat.polygonOffsetUnits = -2;
  if (y !== undefined) mat.userData.liftY = y;
  return order;
}

export function createStage(scene) {
  const S = CFG.stage;
  const TOP = CFG.car.podiumTop;

  const podiumGroup = new THREE.Group();
  scene.add(podiumGroup);

  const decor = [];
  const disposables = [];

  /* ---------------- zemin ---------------- */
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(S.floor, 64),
    new THREE.MeshStandardMaterial({ color: 0x05070c, metalness: 0.45, roughness: 0.48 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.012;      /* basamak tabanıyla eş düzlemde olmasın */
  scene.add(floor);
  disposables.push(floor.geometry, floor.material);

  /* zemindeki dış beyaz çember (fotoğraftaki geniş çerçeve) */
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0xdfe6f2, transparent: true, opacity: 0.20,
    side: THREE.DoubleSide, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  });
  flatOverlay(outerMat);
  const outerRing = new THREE.Mesh(new THREE.RingGeometry(6.95, 7.01, 128), outerMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.035;          /* zeminden 47 mm yukarıda */
  outerRing.renderOrder = 2;
  scene.add(outerRing);
  decor.push(outerRing);

  /* ---------------- podyum ---------------- */
  const step = new THREE.Mesh(
    new THREE.CylinderGeometry(S.step - 0.06, S.step, 0.12, 72),
    new THREE.MeshStandardMaterial({ color: 0x090c12, metalness: 0.35, roughness: 0.5 })
  );
  step.position.y = 0.06;
  podiumGroup.add(step);

  /* Podyum gövdesi. Üst kapak, aynanın 2 mm ALTINDA kalır: böylece
     ayna gerçekten görünür (eskiden kapağın altına gömülüyordu) ve
     altta ışık sızmayan opak bir taban oluşur. */
  const BODY_H = TOP - 0.010;
  const podium = new THREE.Mesh(
    new THREE.CylinderGeometry(S.podium, S.podium + 0.16, BODY_H, 72, 1, false),
    new THREE.MeshStandardMaterial({ color: 0x0a0e16, metalness: 0.45, roughness: 0.38, side: THREE.DoubleSide })
  );
  podium.position.y = BODY_H / 2;
  podiumGroup.add(podium);

  /* podyum üst dudağı: ayna kenarını örten ince bilezik.
     Aynanın alanıyla ÇAKIŞMAZ (ayna yarıçapı daha küçüktür), o yüzden
     aynı düzlemde olsalar bile z-çakışması olmaz. */
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(S.podium - 0.155, S.podium + 0.02, 96),
    new THREE.MeshStandardMaterial({ color: 0x11161f, metalness: 0.55, roughness: 0.28, side: THREE.DoubleSide })
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = TOP - 0.002;
  podiumGroup.add(rim);
  disposables.push(step.geometry, step.material, podium.geometry, podium.material, rim.geometry, rim.material);

  /* beyaz iç halka: ayna yüzeyinin hemen üstünde ince bir bilezik */
  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(S.podium - 0.30, 0.014, 8, 128),
    new THREE.MeshBasicMaterial({ color: 0xf2f5ff, depthWrite: false })
  );
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = TOP + 0.003;
  innerRing.renderOrder = 4;
  podiumGroup.add(innerRing);

  /* marka rengiyle değişen halka: koninin yüzeyine değmeyecek kadar dışarıda */
  const accentRing = new THREE.Mesh(
    new THREE.TorusGeometry(S.podium + 0.13, 0.019, 8, 128),
    new THREE.MeshBasicMaterial({ color: 0xd4af37, depthWrite: false })
  );
  accentRing.rotation.x = Math.PI / 2;
  accentRing.position.y = 0.14;
  accentRing.renderOrder = 5;
  podiumGroup.add(accentRing);
  disposables.push(innerRing.geometry, innerRing.material, accentRing.geometry, accentRing.material);

  /* temas gölgesi: ayna yüzeyinin 4 mm üstünde, arabanın temas
     düzleminin 3 mm altında → hem görünür hem tekeri kesmez. */
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = TOP - 0.003;
  shadow.renderOrder = 6;
  shadow.scale.set(6.6, 3.9, 1);
  podiumGroup.add(shadow);
  disposables.push(shadow.geometry, shadow.material, shadow.material.map);

  /* araba yuvası */
  const carSlot = new THREE.Group();
  carSlot.position.y = TOP;
  podiumGroup.add(carSlot);

  /* ---------------- sahte spot konisi ---------------- */
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, S.podium * 1.06, 7.6, 32, 1, true),
    new THREE.MeshBasicMaterial({
      map: coneTexture(), transparent: true, opacity: 0.05,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  cone.position.y = TOP + 3.8;
  cone.renderOrder = 8;
  scene.add(cone);
  decor.push(cone);
  disposables.push(cone.geometry, cone.material, cone.material.map);

  /* ---------------- arka duvar ---------------- */
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(S.wallW, S.wallH),
    new THREE.MeshBasicMaterial({ map: wallTexture() })
  );
  wall.position.set(0, S.wallH / 2 - 0.05, S.wallZ);
  scene.add(wall);
  disposables.push(wall.geometry, wall.material, wall.material.map);

  /* ---------------- arka plan pankartı ----------------
     Tek canvas: marka adı (kontur) + altında ince altın çizgi +
     konuşmacı adları. Aktif konuşmacı marka renginde yanar. */
  /* Canvas daha yüksek çözünürlükte çizilir (1536×480) ama bütün
     koordinatlar 1024×320'lik MANTIKSAL ızgarada kalır: çizim ölçeklenir,
     tahtadaki yazılar keskinleşir, kod okunur kalır. */
  const backCanvas = document.createElement("canvas");
  backCanvas.width = 1536;
  backCanvas.height = 480;
  const backTex = new THREE.CanvasTexture(backCanvas);
  backTex.colorSpace = THREE.SRGBColorSpace;
  const bw = S.backdropW;
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(bw, bw / 3.2),
    new THREE.MeshBasicMaterial({ map: backTex, transparent: true, depthWrite: false, fog: false })
  );
  backdrop.position.set(0, S.backdropY, S.backdropZ);
  scene.add(backdrop);
  disposables.push(backdrop.geometry, backdrop.material, backTex);

  /* Duvarda marka renginde alçak ışık yıkaması: arka duvar düz siyah
     kalmaz, markanın rengiyle nefes alır (ayrıca dikey yüzeye derinlik). */
  const wallWash = new THREE.Mesh(
    new THREE.PlaneGeometry(S.backdropW * 1.55, 3.0),
    new THREE.MeshBasicMaterial({
      map: washTexture(), transparent: true, opacity: 0.34, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false,
    })
  );
  wallWash.position.set(0, 0.9, S.wallZ + 0.07);
  scene.add(wallWash);
  decor.push(wallWash);
  disposables.push(wallWash.geometry, wallWash.material, wallWash.material.map);

  /* ---------------- ışık barları + yansıma çizgileri + sütunlar ---------------- */
  const glowTex = barGlowTexture();
  const streakTex = streakTexture();
  disposables.push(glowTex, streakTex);

  const streakMat = new THREE.MeshBasicMaterial({
    map: streakTex, transparent: true, opacity: 0.16, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });

  [S.barX, -S.barX].forEach(function (bx) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 5.4, 0.11),
      new THREE.MeshBasicMaterial({ color: 0xfff2da })
    );
    bar.position.set(bx, 3.0, S.wallZ + 1.5);
    scene.add(bar);
    disposables.push(bar.geometry, bar.material);

    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 5.4),
      new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.24, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
    );
    halo.position.set(bx, 3.0, S.wallZ + 1.4);
    scene.add(halo);
    decor.push(halo);

    const streak = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 6.4), streakMat);
    streak.rotation.x = -Math.PI / 2;
    streak.position.set(bx * 0.94, 0.045, -3.4);   /* zeminden 57 mm yukarıda */
    scene.add(streak);
    decor.push(streak);

    const col = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 6.6, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x0b0e15, metalness: 0.25, roughness: 0.78 })
    );
    col.position.set(bx * 1.14, 3.3, S.wallZ + 1.1);
    scene.add(col);
    decor.push(col);
  });

  /* ---------------- canvas çizimi ---------------- */
  /* Kare başına TEK çizim: bir marka geçişi künyeyi 4-5 kez günceller
     (arma, renk, ad, adlar, çipler). Her seferinde 1536×480 tuvali
     yeniden çizip GPU'ya yüklemek zayıf tahtada gözle görülür bir
     takılma yaratıyordu; istekler tek karede birleştirilir. */
  let backQueued = false;
  const onFrame = typeof requestAnimationFrame === "function"
    ? requestAnimationFrame
    : function (fn) { setTimeout(fn, 16); };
  function drawBackdropSoon() {
    if (backQueued) return;
    backQueued = true;
    onFrame(function () { backQueued = false; drawBackdrop(); });
  }

  const bctx = backCanvas.getContext("2d");
  const state = {
    brand: "", model: "", names: [], active: 0, accent: "#d4af37", emblem: "",
    meta: {}, plate: "",
  };

  /* Marka arması duvarda da görünür: SVG, veri adresi olarak yüklenip
     canvas'a çizilir (harici dosya yok, ağ isteği yok). */
  const emblemImg = new Image();
  let emblemReady = false;
  function loadEmblem(id) {
    if (!id) { emblemReady = false; drawBackdropSoon(); return; }
    emblemImg.onload = function () { emblemReady = true; drawBackdropSoon(); };
    emblemImg.onerror = function () { emblemReady = false; drawBackdropSoon(); };
    emblemImg.src = emblemDataURI(id, state.accent);
  }

  /* Harf aralıklı + ortalanmış metin. letterSpacing desteklenmezse
     (eski tarayıcı) yazı yalnızca daha sık olur, bozulmaz. */
  function spacedText(x, text, cx, y, font, spacing) {
    x.save();
    x.font = font;
    try { x.letterSpacing = spacing + "px"; } catch (e) { }
    x.textAlign = "left";
    const w = x.measureText(text).width - (parseFloat(spacing) || 0);
    x.fillText(text, cx - w / 2, y);
    x.restore();
    return w;
  }

  function roundRect(x, rx, ry, rw, rh, r) {
    x.beginPath();
    x.moveTo(rx + r, ry);
    x.arcTo(rx + rw, ry, rx + rw, ry + rh, r);
    x.arcTo(rx + rw, ry + rh, rx, ry + rh, r);
    x.arcTo(rx, ry + rh, rx, ry, r);
    x.arcTo(rx, ry, rx + rw, ry, r);
    x.closePath();
  }

  /* Dikey diziliş (mantıksal 1024×320):
       arma → ince etiket → marka adı → ölçüm çizgisi → araç adı →
       künye çipleri → konuşmacı şeridi
     Arma artık etiketin ÜSTÜNDE durur; eskiden ikisi aynı merkezde
     çizildiği için arma yazının ortasına biniyordu. */
  function drawBackdrop() {
    const x = bctx;
    const W = 1024;                       /* mantıksal genişlik */
    const H = 320;                        /* mantıksal yükseklik */
    const K = backCanvas.width / W;       /* çizim ölçeği (1536/1024) */
    const acc = state.accent || "#d4af37";
    x.setTransform(K, 0, 0, K, 0, 0);
    x.clearRect(0, 0, W, H);
    x.textBaseline = "middle";

    const hasEmblem = emblemReady;
    const labelY = hasEmblem ? 80 : 26;
    const brandCY = hasEmblem ? 132 : 96;
    const ruleY = hasEmblem ? 180 : 150;
    const modelY = ruleY + 26;
    const chipY = modelY + 30;
    const namesY = chipY + 40;

    /* 0) teknik çerçeve: künyeyi plaka gibi çevreleyen ince hatlar */
    const frameW = W - 190;
    const fl = W / 2 - frameW / 2;
    const fr = W / 2 + frameW / 2;
    x.strokeStyle = "rgba(255,255,255,0.09)";
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(fl, 12.5); x.lineTo(fr, 12.5); x.stroke();
    x.beginPath(); x.moveTo(fl, H - 10.5); x.lineTo(fr, H - 10.5); x.stroke();
    x.strokeStyle = "rgba(255,255,255,0.20)";
    x.beginPath(); x.moveTo(fl + 0.5, 12.5); x.lineTo(fl + 0.5, 22.5); x.stroke();
    x.beginPath(); x.moveTo(fr - 0.5, 12.5); x.lineTo(fr - 0.5, 22.5); x.stroke();
    x.beginPath(); x.moveTo(fl + 0.5, H - 10.5); x.lineTo(fl + 0.5, H - 20.5); x.stroke();
    x.beginPath(); x.moveTo(fr - 0.5, H - 10.5); x.lineTo(fr - 0.5, H - 20.5); x.stroke();

    /* 1) marka arması: plakanın tepesinde tek renk çizim */
    if (hasEmblem) {
      const es = 52;
      x.save();
      x.globalAlpha = 0.95;
      x.drawImage(emblemImg, W / 2 - es / 2, 14, es, es);
      x.restore();
    }

    /* 1b) plaka numarası: sol üst köşe (paneldeki 03 / 06 ile aynı) */
    if (state.plate) {
      x.fillStyle = "rgba(190,200,220,0.34)";
      spacedText(x, state.plate, W / 2, 24, "700 13px 'Segoe UI', Arial, sans-serif", 3);
    }

    /* 2) üst künye: sırıtmayan ince etiket */
    x.fillStyle = "rgba(176,188,210,0.30)";
    spacedText(x, "ALMAN OTOMOTİL STÜDYOSU", W / 2, labelY, "600 14px 'Segoe UI', Arial, sans-serif", 10);

    /* 2) marka adı: geniş harf aralıklı, dikey gradyanlı hayalet yazı.
       Yazı canvas'a SIĞANA kadar küçültülür (uzun marka adları eskiden
       taşıp iki kenardan kesiliyordu). Arkasında hafif marka ışıması var. */
    if (state.brand) {
      const text = state.brand;
      const maxW = W - 150;
      let fs = 86;
      let ls = 20;
      for (let guard = 0; guard < 20; guard++) {
        x.save();
        x.font = "200 " + fs + "px 'Segoe UI', Arial, sans-serif";
        try { x.letterSpacing = ls + "px"; } catch (e) { }
        const tw = x.measureText(text).width - ls;
        x.restore();
        if (tw <= maxW || fs <= 34) break;
        const k = Math.max(0.55, Math.min(0.95, maxW / tw));
        fs = Math.max(34, Math.round(fs * k));
        ls = Math.max(5, Math.round(ls * k));
      }
      const font = "200 " + fs + "px 'Segoe UI', Arial, sans-serif";
      const cy = brandCY + (86 - fs) * 0.22;

      x.save();
      x.globalAlpha = 0.13;
      x.filter = "blur(16px)";
      x.fillStyle = acc;
      spacedText(x, text, W / 2, cy, font, ls);
      x.restore();

      const g = x.createLinearGradient(0, cy - fs * 0.5, 0, cy + fs * 0.5);
      g.addColorStop(0.00, "rgba(255,255,255,0.34)");
      g.addColorStop(0.55, "rgba(232,238,250,0.17)");
      g.addColorStop(1.00, "rgba(255,255,255,0.05)");
      x.fillStyle = g;
      spacedText(x, text, W / 2, cy, font, ls);
    }

    /* 3) ölçüm çizgisi: ince marka rengi hat + eşit aralıklı tırnaklar */
    const ruleW = 470;
    const grad = x.createLinearGradient(W / 2 - ruleW / 2 - 40, 0, W / 2 + ruleW / 2 + 40, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, acc);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    x.globalAlpha = 0.6;
    x.fillStyle = grad;
    x.fillRect(W / 2 - ruleW / 2, ruleY, ruleW, 1.4);
    x.globalAlpha = 0.32;
    x.strokeStyle = acc;
    x.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      const tx = W / 2 + i * 52;
      const th = i === 0 ? 7 : (i % 2 === 0 ? 5 : 3);
      x.beginPath(); x.moveTo(tx + 0.5, ruleY - th); x.lineTo(tx + 0.5, ruleY); x.stroke();
    }
    x.globalAlpha = 1;

    /* 4) arabanın adı: marka adının hemen altında, aralıklı ve sönük */
    if (state.model) {
      x.fillStyle = "rgba(216,224,240,0.52)";
      spacedText(x, state.model.toLocaleUpperCase("tr-TR"), W / 2, modelY, "600 19px 'Segoe UI', Arial, sans-serif", 7);
    }

    /* 4b) künye çipleri: panelin çipleriyle aynı dil — nesil · gövde ·
       merkez. Markaya göre değişir, hepsi VERİDEN gelir. */
    const pills = [];
    if (state.meta.generation) pills.push({ t: state.meta.generation, accent: true });
    if (state.meta.segment) pills.push({ t: state.meta.segment });
    if (state.meta.hq) pills.push({ t: state.meta.hq });
    if (pills.length) {
      const fs = 15, padX = 13, ph = 26, gap = 10;
      x.save();
      x.font = "700 " + fs + "px 'Segoe UI', Arial, sans-serif";
      try { x.letterSpacing = "2px"; } catch (e) { }
      let total = 0;
      pills.forEach(function (p) {
        p.w = x.measureText(p.t.toLocaleUpperCase("tr-TR")).width + 4;
        total += p.w + padX * 2;
      });
      total += gap * (pills.length - 1);
      let cx = (W - total) / 2;
      x.textAlign = "center";
      pills.forEach(function (p) {
        const w = p.w + padX * 2;
        x.globalAlpha = p.accent ? 0.16 : 0.06;
        x.fillStyle = p.accent ? acc : "#ffffff";
        roundRect(x, cx, chipY - ph / 2, w, ph, 7); x.fill();
        x.globalAlpha = p.accent ? 0.55 : 0.16;
        x.strokeStyle = p.accent ? acc : "#ffffff";
        x.lineWidth = 1;
        roundRect(x, cx, chipY - ph / 2, w, ph, 7); x.stroke();
        x.globalAlpha = 1;
        x.fillStyle = p.accent ? "#ffffff" : "rgba(206,215,231,0.62)";
        x.fillText(p.t.toLocaleUpperCase("tr-TR"), cx + w / 2, chipY + 1);
        cx += w + gap;
      });
      x.restore();
    }

    /* 5) konuşmacı adları: tek sıra. Aktif olan marka renginde bir
       kapsülün içinde parlar — uzaktan bakınca kim konuşuyor belli olur.
       Sıra da canvas'a sığacak şekilde ölçeklenir. */
    if (state.names.length) {
      const y = namesY;
      const labels = state.names.map(function (n) { return String(n).toLocaleUpperCase("tr-TR"); });
      /* Marka adından dar: adlar marka adının altında derli toplu bir
         şerit gibi durur, duvarı boydan boya kaplamaz. */
      const maxW = W - 300;
      let FS = 27;
      let PX = 19;            /* kapsül içi yatay boşluk */
      let GAP = 12;
      let widths = [];
      let total = 0;

      function measureRow() {
        widths = [];
        total = 0;
        x.save();
        x.font = "500 " + FS + "px 'Segoe UI', Arial, sans-serif";
        try { x.letterSpacing = "3px"; } catch (e) { }
        labels.forEach(function (t) {
          const w = x.measureText(t).width + 4;
          widths.push(w);
          total += w + PX * 2;
        });
        x.restore();
        total += GAP * (labels.length - 1);
      }

      for (let guard = 0; guard < 16; guard++) {
        measureRow();
        if (total <= maxW || FS <= 15) break;
        const k = Math.max(0.7, Math.min(0.95, maxW / total));
        FS = Math.max(15, Math.round(FS * k));
        PX = Math.max(9, Math.round(PX * k));
        GAP = Math.max(6, Math.round(GAP * k));
      }
      measureRow();

      let cx = (W - total) / 2;
      const pillH = Math.round(FS * 1.48);
      labels.forEach(function (t, i) {
        const on = i === state.active;
        const w = widths[i];
        if (on) {
          x.save();
          x.globalAlpha = 0.15; x.fillStyle = acc;
          roundRect(x, cx, y - pillH / 2, w + PX * 2, pillH, pillH / 2); x.fill();
          x.globalAlpha = 0.5; x.lineWidth = 1; x.strokeStyle = acc;
          roundRect(x, cx, y - pillH / 2, w + PX * 2, pillH, pillH / 2); x.stroke();
          x.restore();
        }
        x.save();
        x.font = (on ? "700 " : "500 ") + FS + "px 'Segoe UI', Arial, sans-serif";
        try { x.letterSpacing = "3px"; } catch (e) { }
        x.textAlign = "center";
        x.fillStyle = on ? "#ffffff" : "rgba(198,208,226,0.34)";
        x.fillText(t, cx + PX + w / 2, y);
        x.restore();
        cx += w + PX * 2 + GAP;
      });
    }
    backTex.needsUpdate = true;
  }

  /* Dekor ortam yansımasını ölçülü alsın: araba parlak, sahne tok kalsın */
  scene.traverse(function (o) {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(function (m) {
      if (!("envMapIntensity" in m)) return;
      if (o === podium) m.envMapIntensity = 0.65;
      else if (o === floor) m.envMapIntensity = 0.45;
      else if (o === rim || o === step) m.envMapIntensity = 0.8;
      else if (o === wall || o === backdrop) m.envMapIntensity = 0;
      else m.envMapIntensity = 0.4;
    });
  });

  return {
    podiumGroup: podiumGroup,
    carSlot: carSlot,
    decor: decor,
    shadow: shadow,

    setAccent: function (css, hex) {
      state.accent = css;
      try { accentRing.material.color.setHex(hex); } catch (e) { }
      /* duvar yıkaması ve halka marka rengini alır */
      try { wallWash.material.color.set(css); } catch (e) { }
      if (state.emblem) loadEmblem(state.emblem);   /* arma marka rengini alır */
      drawBackdropSoon();
    },
    /* Künye çipleri + plaka numarası: panel ile aynı veriyi kullanır. */
    setMeta: function (meta) {
      state.meta = meta || {};
      if (meta && meta.plate !== undefined) state.plate = meta.plate;
      drawBackdropSoon();
    },
    setNames: function (names) {
      state.names = names.slice();
      drawBackdropSoon();
    },
    setActive: function (i) {
      state.active = i;
      drawBackdropSoon();
    },
    setWatermark: function (brandName, modelName) {
      state.brand = brandName || "";
      if (modelName !== undefined) state.model = modelName || "";
      drawBackdropSoon();
    },
    setEmblem: function (id) {
      if (state.emblem === id) return;
      state.emblem = id || "";
      loadEmblem(state.emblem);
    },

    setShadowSize: function (width, length) {
      const w = Math.max(3, Math.min(9, width * 1.55));
      const l = Math.max(2.4, Math.min(11, length * 1.28));
      shadow.scale.set(w, l, 1);
    },

    setDecorations: function (on) {
      for (let i = 0; i < decor.length; i++) decor[i].visible = on;
    },

    dispose: function () {
      for (let i = 0; i < disposables.length; i++) {
        const d = disposables[i];
        if (d && d.dispose) { try { d.dispose(); } catch (e) { } }
      }
      scene.remove(floor, outerRing, cone, wall, backdrop);
    },
  };
}
