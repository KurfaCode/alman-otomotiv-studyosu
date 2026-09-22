/* ============================================================
   Marka künyesi (sol üst plaka).

   Panel tamamen VERİDEN beslenir: arma, ad, model, nesil, gövde
   sınıfı, merkez, kuruluş yılı, dört teknik satır, slogan,
   anlatan kişi ve model durumu. Markaya özel bir alan kodda
   tekrar etmez — yeni marka eklemek için brands.js yeterlidir.

   Yerleşim (yukarıdan aşağı):
     arma + ad + model          seri no (01/06)
     nesil · gövde · merkez · kuruluş çipleri
     Almanca slogan + Türkçe çeviri
     2×2 teknik satır ızgarası
     anlatan + model durumu
   ============================================================ */

import { emblemSVG } from "./emblems.js";
import { BRANDS, brandIndexById } from "../data/brands.js";

function pad2(n) { return (n < 10 ? "0" : "") + n; }

/* Çip: "label: value" ya da yalnızca değer. Boş alanlar atlanır. */
function chip(text, cls, title) {
  const el = document.createElement("span");
  el.className = "meta" + (cls ? " " + cls : "");
  el.textContent = text;
  if (title) el.title = title;
  return el;
}

export function createBrandPanel() {
  const els = {
    plate: document.getElementById("brand-plate"),
    mono: document.getElementById("brand-mono"),
    name: document.getElementById("brand-name"),
    model: document.getElementById("brand-model"),
    meta: document.getElementById("brand-meta"),
    sloganDE: document.getElementById("slogan-de"),
    sloganTR: document.getElementById("slogan-tr"),
    stats: document.getElementById("specs"),
    presenter: document.getElementById("brand-presenter"),
  };

  /* model durum çipi (gerçek model / konsept maket) */
  let status = document.createElement("span");
  status.className = "chip";
  status.textContent = "—";
  if (els.presenter && els.presenter.parentNode) els.presenter.parentNode.appendChild(status);

  function renderMeta(brand) {
    if (!els.meta) return;
    els.meta.innerHTML = "";

    /* ülke + kuruluş yılı: kimlik rozeti */
    const identity = [brand.iso || brand.country, brand.founded].filter(Boolean).join(" · ");
    if (identity) els.meta.appendChild(chip(identity, "iso", (brand.country || "") + " · kuruluş " + (brand.founded || "?")));

    /* nesil/kasa kodu — modelin kimliği, en belirgin çip */
    if (brand.generation) els.meta.appendChild(chip(brand.generation, "gen", "Nesil / kasa kodu"));

    /* gövde sınıfı */
    if (brand.segment) els.meta.appendChild(chip(brand.segment, "", "Gövde sınıfı"));

    /* merkez şehir */
    if (brand.hq) els.meta.appendChild(chip(brand.hq, "", "Markanın merkezi"));
  }

  function render(brand) {
    /* Arma metin yerine gerçek çizim: her marka kendi işaretiyle anılır. */
    if (els.mono) {
      els.mono.innerHTML = emblemSVG(brand.emblem || brand.id);
      els.mono.classList.add("badge");
      els.mono.title = brand.name;
    }
    if (els.name) els.name.textContent = brand.name;
    if (els.model) {
      els.model.textContent = brand.model || "";
      els.model.title = brand.model || "";
    }
    if (els.sloganDE) els.sloganDE.textContent = "\u201C" + brand.taglineDE + "\u201D";
    if (els.sloganTR) els.sloganTR.textContent = brand.taglineTR || "";
    if (els.presenter) els.presenter.textContent = brand.presenter ? "Anlatan: " + brand.presenter : "";
    if (els.presenter) els.presenter.hidden = !brand.presenter;

    renderMeta(brand);

    /* seri numarası: panelin "ölçüm plakası" kimliği */
    if (els.plate) {
      const i = brandIndexById(brand.id);
      els.plate.textContent = (i >= 0 ? pad2(i + 1) : "—") + " / " + pad2(BRANDS.length);
      els.plate.title = brand.name;
    }

    if (els.stats) {
      els.stats.innerHTML = "";
      (brand.stats || []).forEach(function (s) {
        const d = document.createElement("div");
        d.className = "spec";
        const v = document.createElement("div");
        v.className = "v";
        v.textContent = s.v;
        const l = document.createElement("div");
        l.className = "l";
        l.textContent = s.l;
        d.appendChild(v);
        d.appendChild(l);
        els.stats.appendChild(d);
      });
    }
  }

  function setStatus(state, detail) {
    /* state: "real" | "concept" | "loading" */
    status.textContent = detail || (state === "real" ? "● GERÇEK MODEL"
      : state === "concept" ? "○ KONSEPT MAKET" : "… YÜKLENİYOR");
    status.className = "chip" + (state === "real" ? " ok" : state === "concept" ? " warn" : "");
  }

  return { render: render, setStatus: setStatus };
}
