/* ============================================================
   Kategori rafı (sağ) + özellik kartları (sol).

   Kart içeriği tamamen veriden gelir: kategori değişince kartlar
   yeniden kurulur ve kamera ilgili parçaya kayar.
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

export function createFeatureCards(onPick, onRendered) {
  const catsEl = document.getElementById("cats");
  const cardsEl = document.getElementById("cards");
  const state = { active: null, categories: [], cards: [] };

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

  function renderCards(brand, catId) {
    if (!cardsEl) return;
    const cat = state.categories.filter(function (c) { return c.id === catId; })[0];
    const list = (brand.cards && brand.cards[catId]) || [];
    cardsEl.innerHTML = "";

    if (cat) {
      const t = document.createElement("p");
      t.className = "cat-title";
      t.textContent = cat.label;
      cardsEl.appendChild(t);
    }

    /* ekran yüksekliğine göre en fazla 3 kart göster */
    const limit = window.innerHeight < 720 ? 2 : 3;
    list.slice(0, limit).forEach(function (card, i) {
      const el = document.createElement("article");
      el.className = "card";
      el.dataset.anchor = catId;      /* kılavuz çizgisi hedefi */
      el.style.setProperty("--i", String(i));

      /* teknik künye numarası + kılavuz çizgisine bağlanan ok ucu */
      const idx = document.createElement("span");
      idx.className = "idx";
      idx.textContent = "0" + (i + 1);

      const g = document.createElement("span");
      g.className = "glyph";
      g.innerHTML = glyph(cat ? cat.glyph : "car");
      const body = document.createElement("div");
      const h = document.createElement("h3");
      h.textContent = card.t;
      const p = document.createElement("p");
      p.innerHTML = card.d;
      body.appendChild(h);
      body.appendChild(p);

      const tick = document.createElement("i");
      tick.className = "tick";

      el.appendChild(idx);
      el.appendChild(g);
      el.appendChild(body);
      el.appendChild(tick);
      cardsEl.appendChild(el);
    });
    state.cards = list;
    if (typeof onRendered === "function") onRendered();
  }

  return {
    buildCats: buildCats,
    setActive: setActive,
    renderCards: renderCards,
    get active() { return state.active; },
  };
}
