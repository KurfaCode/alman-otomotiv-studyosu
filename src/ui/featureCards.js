/* ============================================================
   Kategori rafı (sağ) + konu okuyucusu (sol).

   Sol sütunun tasarımı \"boğmayacak\" biçimde tek karta indirildi:
   üç kartın üçü birden yazılmıyor. Üstte kategori başlığı ve
   adım sayacı, ortada AKTİF konunun tam genişlikte kartı, altta
   numaralandırılmış bölüm şeridi durur. Böylece aynı metin çok
   daha rahat okunur ve dar ekranda üçüncü kart kırpılmaz.

   İçerik tamamen veriden gelir: kategori değişince okuyucu yeniden
   kurulur, seçilen konu kamerayı ilgili parçaya kaydırır.

   Gezinme:
     adım şeridine tıkla            → o konu
     kartın kendisine tıkla         → sonraki konu (başa döner)
     ↑ / ↓ ya da sıradaki tuş       → adım adım
   ============================================================ */

export const GLYPHS = {
  car: '<svg viewBox="0 0 24 24"><path d="M3.2 15.5h17.6"/><path d="M5.4 15.5l1.5-4.1A2 2 0 0 1 8.8 10h6.4a2 2 0 0 1 1.9 1.4l1.5 4.1"/><circle cx="7.2" cy="17.4" r="1.7"/><circle cx="16.8" cy="17.4" r="1.7"/></svg>',
  design: '<svg viewBox="0 0 24 24"><path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z"/><path d="M13.5 7.5l3 3"/></svg>',
  light: '<svg viewBox="0 0 24 24"><path d="M3 8.5h8.5a3.5 3.5 0 0 1 0 7H3v-7Z"/><path d="M15.5 10l4.5-2M16 12h5M15.5 14l4.5 2"/></svg>',
  wheel: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.4"/><path d="M12 4v5.6M12 14.4V20M4 12h5.6M14.4 12H20"/></svg>',
  engine: '<svg viewBox="0 0 24 24"><rect x="3" y="9.5" width="11" height="7" rx="1.6"/><path d="M14 12h3l3 2.6V17h-6"/><path d="M6.5 9.5V6.6h5.5v2.9"/><path d="M3 12.5H1.6"/></svg>',
  seat: '<svg viewBox="0 0 24 24"><path d="M8 4.5h5.5A2.5 2.5 0 0 1 16 7v6.5H8V4.5Z"/><path d="M6.5 13.5h11v4.5h-11z"/><path d="M7 18v2.5M17 18v2.5"/></svg>',
  rotate: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20.5 4.5v4.2h-4.2"/></svg>',
  brake: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/><path d="M12 4v4.8M12 15.2V20M4 12h4.8M15.2 12H20"/></svg>',
  signal: '<svg viewBox="0 0 24 24"><path d="M12 5.5v13"/><path d="M8.5 9.5L5 12l3.5 2.5"/><path d="M15.5 9.5L19 12l-3.5 2.5"/></svg>',
};

function glyph(name) {
  return GLYPHS[name] || GLYPHS.car;
}

function pad2(n) { return (n < 10 ? "0" : "") + n; }

export function createFeatureCards(onPick, onRendered) {
  const catsEl = document.getElementById("cats");
  const cardsEl = document.getElementById("cards");
  const state = { active: null, categories: [], cards: [], catId: null, step: 0, glyph: "car" };

  /* okuyucunun canlı parçaları (kart listesi değişince yeniden kurulur) */
  let ui = null;

  function buildCats(categories) {
    state.categories = categories.slice();
    if (!catsEl) return;
    catsEl.innerHTML = "";
    categories.forEach(function (c) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "rail-item";
      b.title = c.label;
      b.dataset.id = c.id;
      b.innerHTML = glyph(c.glyph) + "<span>" + c.label + "</span><i class=\"led\"></i>";
      b.addEventListener("click", function () { onPick(c.id); });
      catsEl.appendChild(b);
    });
  }

  function setActive(id) {
    state.active = id;
    if (!catsEl) return;
    const items = catsEl.children;
    for (let i = 0; i < items.length; i++) {
      items[i].classList.toggle("on", items[i].dataset.id === id);
    }
  }

  /* Aktif konuyu çiz. Tek seferde TEK kart gösterilir: sütun boğulmaz,
     metin tam genişlikte ve kırpılmadan okunur. */
  function paint(reset) {
    if (!ui) return;
    const list = state.cards;
    if (!list.length) return;
    const i = Math.max(0, Math.min(list.length - 1, state.step));
    state.step = i;
    const card = list[i];

    ui.count.textContent = pad2(i + 1) + " / " + pad2(list.length);
    ui.fill.style.width = (((i + 1) / list.length) * 100).toFixed(1) + "%";

    for (let k = 0; k < ui.steps.length; k++) {
      const on = k === i;
      ui.steps[k].classList.toggle("on", on);
      if (on) ui.steps[k].setAttribute("aria-current", "true");
      else ui.steps[k].removeAttribute("aria-current");
    }

    ui.body.innerHTML = "";
    const el = document.createElement("article");
    el.className = "card";
    el.dataset.anchor = state.catId;              /* kılavuz çizgisi hedefi */
    el.title = "Sonraki konu";
    el.style.setProperty("--i", String(i));

    const g = document.createElement("span");
    g.className = "glyph";
    g.innerHTML = glyph(state.glyph);

    const body = document.createElement("div");
    body.className = "card-body";
    const h = document.createElement("h3");
    h.textContent = card.t;
    const p = document.createElement("p");
    p.innerHTML = card.d;
    body.appendChild(h);
    body.appendChild(p);

    const more = document.createElement("span");
    more.className = "more";
    more.setAttribute("aria-hidden", "true");
    more.textContent = "\u203A";

    el.appendChild(g);
    el.appendChild(body);
    el.appendChild(more);
    el.addEventListener("click", function () { step(1); });

    ui.body.appendChild(el);
    if (reset) ui.body.scrollTop = 0;
    if (typeof onRendered === "function") onRendered();
  }

  function step(delta) {
    const n = state.cards.length;
    if (n < 2) return;
    state.step = ((state.step + (delta || 1)) % n + n) % n;
    paint(true);
  }

  function goTo(i) {
    if (i === state.step) return;
    state.step = i;
    paint(true);
  }

  function renderCards(brand, catId) {
    if (!cardsEl) return;
    const cat = state.categories.filter(function (c) { return c.id === catId; })[0];
    state.catId = catId;
    state.glyph = cat ? cat.glyph : "car";
    state.cards = (brand.cards && brand.cards[catId]) || [];
    state.step = 0;
    ui = null;
    cardsEl.innerHTML = "";

    if (!state.cards.length) {
      if (typeof onRendered === "function") onRendered();
      return;
    }

    const reader = document.createElement("div");
    reader.className = "reader";

    /* --- başlık: kategori + adım sayacı + ince ilerleme çizgisi --- */
    const head = document.createElement("div");
    head.className = "reader-head";
    const title = document.createElement("span");
    title.className = "cat-title";
    title.textContent = cat ? cat.label : "";
    const count = document.createElement("span");
    count.className = "reader-count";
    head.appendChild(title);
    head.appendChild(count);

    const bar = document.createElement("i");
    bar.className = "reader-bar";
    const fill = document.createElement("b");
    bar.appendChild(fill);

    /* --- gövde: aktif konunun kartı --- */
    const body = document.createElement("div");
    body.className = "reader-body";
    body.setAttribute("aria-live", "polite");

    /* --- alt şerit: numaralı bölümler (tıklanınca o konuya atlar) --- */
    const steps = document.createElement("div");
    steps.className = "reader-steps";
    const stepEls = state.cards.map(function (card, i) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "step";
      b.title = card.t;
      const n = document.createElement("b");
      n.textContent = pad2(i + 1);
      const s = document.createElement("span");
      s.textContent = card.t;
      b.appendChild(n);
      b.appendChild(s);
      b.addEventListener("click", function () { goTo(i); });
      steps.appendChild(b);
      return b;
    });

    reader.appendChild(head);
    reader.appendChild(bar);
    reader.appendChild(body);
    reader.appendChild(steps);
    cardsEl.appendChild(reader);

    ui = { count: count, fill: fill, body: body, steps: stepEls };
    paint(true);
  }

  return {
    buildCats: buildCats,
    setActive: setActive,
    renderCards: renderCards,
    step: step,
    get active() { return state.active; },
    get steps() { return state.cards.length; },
    get stepIndex() { return state.step; },
  };
}
