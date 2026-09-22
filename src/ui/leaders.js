import * as THREE from "../../vendor/three/three.module.js";

/* ============================================================
   Kılavuz çizgileri (leader lines).

   Her bilgi kartının sağ kenarından, arabadaki gerçek parçaya
   (far, jant, kabin, kaput…) uzanan şeffaf bir çizgi çizilir.
   Hedef nokta 3B'de hesaplanıp her karede ekrana yansıtılır:
   araba dönerken çizgi de parçayı takip eder.

   Çizgi karta yakınken görünmez, hedefe yaklaştıkça marka rengine
   döner (SVG gradyanı) ve hedefte ok ucu + nabız atan halka ile
   biter.

   Maliyet: kare başı 2-3 vektör işlemi + birkaç SVG niteliği.
   Kart ölçüleri yalnızca kart listesi değişince okunur.
   ============================================================ */

const NS = "http://www.w3.org/2000/svg";
const MAT = new THREE.Matrix4();
const V = new THREE.Vector3();
const CAM_LOCAL = new THREE.Vector3();

export function createLeaders() {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("id", "leaders");
  svg.setAttribute("aria-hidden", "true");

  /* uçtan uca solan gradyan: renkleri CSS'ten gelir (marka rengi) */
  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML =
    '<linearGradient id="leaderGrad" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" class="lg-a"/><stop offset=".45" class="lg-b"/>' +
    '<stop offset="1" class="lg-c"/></linearGradient>';
  svg.appendChild(defs);

  const root = document.getElementById("ui") || document.body;
  root.appendChild(svg);

  const items = [];       /* { els, card, anchor, ox, oy } */
  const state = { car: null, points: null, visible: false };

  /* ok ucu: ucu hedefe dokunan küçük üçgen (yönü her karede döner) */
  const ARROW_D = "M0,0L-10,-4.6L-10,4.6Z";

  function makeItem() {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("class", "leader-line");
    const glow = document.createElementNS(NS, "path");
    glow.setAttribute("class", "leader-glow");
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("class", "leader-dot");
    dot.setAttribute("r", "2.4");
    const ring = document.createElementNS(NS, "circle");
    ring.setAttribute("class", "leader-ring");
    ring.setAttribute("r", "8");
    const arrow = document.createElementNS(NS, "path");
    arrow.setAttribute("class", "leader-arrow");
    arrow.setAttribute("d", ARROW_D);
    svg.appendChild(glow);
    svg.appendChild(path);
    svg.appendChild(arrow);
    svg.appendChild(ring);
    svg.appendChild(dot);
    return { path: path, glow: glow, arrow: arrow, ring: ring, dot: dot };
  }

  function setDisplay(els, on) {
    els.path.style.display = on ? "" : "none";
    els.glow.style.display = on ? "" : "none";
    els.arrow.style.display = on ? "" : "none";
    els.ring.style.display = on ? "" : "none";
    els.dot.style.display = on ? "" : "none";
  }

  function measure() {
    const cards = document.querySelectorAll("#cards .card");
    /* eksik olanları kur, fazlaları kaldır */
    while (items.length < cards.length) {
      items.push({ els: makeItem(), card: null, anchor: null, ox: 0, oy: 0 });
    }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const card = cards[i];
      const on = !!card;
      it.card = card || null;
      setDisplay(it.els, on);
      if (!on) continue;
      const r = card.getBoundingClientRect();
      it.anchor = card.dataset.anchor || "";
      it.ox = r.right;
      it.oy = r.top + r.height / 2;
    }
  }

  function hide() {
    svg.style.opacity = "0";
    state.visible = false;
  }

  function show() {
    svg.style.opacity = "1";
    state.visible = true;
  }

  function update(camera) {
    if (!state.car || !state.points || !state.visible) return;
    const car = state.car;
    car.object.updateMatrixWorld(true);
    MAT.copy(car.object.matrixWorld).invert();
    camera.getWorldPosition(V);
    CAM_LOCAL.copy(V).applyMatrix4(MAT);

    const w = window.innerWidth;
    const h = window.innerHeight;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.card || !it.anchor) continue;
      const p = state.points[it.anchor];
      if (!p) continue;

      V.copy(p.v);
      if (p.side) V.x = Math.abs(V.x) * (CAM_LOCAL.x >= 0 ? 1 : -1);
      V.applyMatrix4(car.object.matrixWorld).project(camera);

      const behind = V.z > 1;
      const px = (V.x * 0.5 + 0.5) * w;
      const py = (-V.y * 0.5 + 0.5) * h;
      const off = px < -w * 0.2 || px > w * 1.2 || py < -h * 0.2 || py > h * 1.2;
      const on = !behind && !off;

      setDisplay(it.els, on);
      if (!on) continue;

      /* çıkış: kartın tam ortasından değil, sağ kenarından hafif üstten */
      const sx = it.ox - 4;
      const sy = it.oy;
      const c1x = sx + Math.min(120, Math.max(40, (px - sx) * 0.32));
      const c2x = px - Math.min(150, Math.max(50, (px - sx) * 0.42));
      const d = "M" + sx + "," + sy + "C" + c1x + "," + sy + " " + c2x + "," + py + " " + px + "," + py;
      it.els.path.setAttribute("d", d);
      it.els.glow.setAttribute("d", d);

      /* ok ucu: eğri hedefe hangi açıdan geliyorsa o yönde döner */
      const ang = Math.atan2(py - sy, px - c2x) * 180 / Math.PI;
      it.els.arrow.setAttribute("transform",
        "translate(" + px.toFixed(1) + "," + py.toFixed(1) + ") rotate(" + ang.toFixed(1) + ")");

      it.els.ring.setAttribute("cx", px.toFixed(1));
      it.els.ring.setAttribute("cy", py.toFixed(1));
      it.els.dot.setAttribute("cx", px.toFixed(1));
      it.els.dot.setAttribute("cy", py.toFixed(1));
    }
  }

  return {
    measure: measure,
    update: update,
    show: show,
    hide: hide,
    setCar: function (car, points) {
      state.car = car || null;
      state.points = points || null;
    },
    get visible() { return state.visible; },
  };
}
