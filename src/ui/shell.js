import { GLYPHS } from "./featureCards.js";
import { CFG } from "../config.js";

/* ============================================================
   Kabuk: alt gezinme, araç rayı, kısayollar, tam ekran, toast.
   Tüm dokunma hedefleri en az 44px (tahtada rahat basılır).
   ============================================================ */

/* Araç kontrolleri. `key` klavye kısayoludur ve düğmenin köşesinde
   gösterilir: tahtada öğretmen kısayolu görebilsin. */
const TOOLS = [
  { id: "spin", label: "Dönüş", glyph: "rotate", hint: "Otomatik dönüş (R)", key: "R" },
  { id: "low", label: "Far", glyph: "light", hint: "Farlar (L)", key: "L" },
  { id: "brake", label: "Stop", glyph: "brake", hint: "Stop lambaları (S)", key: "S" },
  { id: "signal", label: "Sinyal", glyph: "signal", hint: "Sinyal (B)", key: "B" },
];

export function createShell(handlers) {
  const dotsEl = document.getElementById("dots");
  const counterEl = document.getElementById("counter");
  const toolsEl = document.getElementById("tools");
  const toastEl = document.getElementById("toast");
  const fpsEl = document.getElementById("fps");
  const stageEl = document.getElementById("stage");

  let toastTimer = null;
  const toolButtons = {};

  /* ---- araç rayı ---- */
  if (toolsEl) {
    toolsEl.innerHTML = "";
    TOOLS.forEach(function (t) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "rail-item";
      b.title = t.hint;
      b.dataset.id = t.id;
      b.innerHTML = (GLYPHS[t.glyph] || "") + "<span>" + t.label + "</span>" +
        (t.key ? "<kbd>" + t.key + "</kbd>" : "") + "<i class=\"led\"></i>";
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () { handlers.action(t.id); });
      toolsEl.appendChild(b);
      toolButtons[t.id] = b;
    });
  }

  /* Düğme durumu: yalnızca renk değil, ekran okuyucu için de bildirilir. */
  function setTool(id, on) {
    const el = toolButtons[id];
    if (!el) return;
    el.classList.toggle("on", !!on);
    el.setAttribute("aria-pressed", on ? "true" : "false");
  }

  /* ---- alt gezinme ---- */
  document.getElementById("btn-next").addEventListener("click", function () { handlers.next(); });
  document.getElementById("btn-prev").addEventListener("click", function () { handlers.prev(); });
  document.getElementById("btn-full").addEventListener("click", toggleFullscreen);

  function buildDots(brands) {
    if (!dotsEl) return;
    dotsEl.innerHTML = "";
    brands.forEach(function (b, i) {
      const d = document.createElement("button");
      d.type = "button";
      d.title = b.short;
      d.setAttribute("aria-label", b.short);
      d.addEventListener("click", function () { handlers.goto(i); });
      dotsEl.appendChild(d);
    });
  }

  function setActive(i, total) {
    if (dotsEl) {
      const items = dotsEl.children;
      for (let k = 0; k < items.length; k++) items[k].classList.toggle("on", k === i);
    }
    if (counterEl) counterEl.textContent = (i + 1) + " / " + total;
  }

  /* ---- toast ---- */
  function toast(msg, ms) {
    if (!toastEl || !msg) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, ms || CFG.ui.toastMs);
  }

  /* ---- tam ekran ---- */
  function toggleFullscreen() {
    try {
      const el = document.documentElement;
      const active = document.fullscreenElement || document.webkitFullscreenElement;
      if (!active) {
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
    } catch (e) { toast("Tam ekran açılamadı."); }
  }

  /* ---- klavye ---- */
  document.addEventListener("keydown", function (e) {
    /* Giriş kapısı / tanıtım filmi açıkken sahne kısayolları çalışmaz
       (ok tuşuyla marka değişmesin, R ile dönüş başlamasın). */
    if (document.body.classList.contains("intro-open")) return;
    if (document.getElementById("intro-film") && !document.getElementById("intro-film").hidden) return;
    const k = e.key;
    if (k === "ArrowRight") { e.preventDefault(); handlers.next(); }
    else if (k === "ArrowLeft") { e.preventDefault(); handlers.prev(); }
    else if (k === " " || k === "PageDown") { e.preventDefault(); handlers.next(); }
    else if (k === "PageUp") { e.preventDefault(); handlers.prev(); }
    /* konu okuyucusunda adım adım ilerle (↑ geri, ↓ ileri) */
    else if (k === "ArrowDown" || k === "ArrowUp") {
      if (handlers.step) { e.preventDefault(); handlers.step(k === "ArrowDown" ? 1 : -1); }
    }
    else if (k === "f" || k === "F") { toggleFullscreen(); }
    else if (k === "l" || k === "L") { handlers.action("low"); }
    else if (k === "s" || k === "S") { handlers.action("brake"); }
    else if (k === "b" || k === "B") { handlers.action("signal"); }
    else if (k === "r" || k === "R") { handlers.action("spin"); }
    else if (k === "d" || k === "D") { if (handlers.toggleDebug) handlers.toggleDebug(); }
    else if (/^[1-9]$/.test(k) && handlers.goto) { handlers.goto(parseInt(k, 10) - 1); }
  });

  /* ---- dokunmayla kaydırma ---- */
  let tx = 0, ty = 0, tt = 0;
  if (stageEl) {
    stageEl.addEventListener("touchstart", function (e) {
      if (e.touches.length === 1) {
        tx = e.touches[0].clientX;
        ty = e.touches[0].clientY;
        tt = Date.now();
      }
    }, { passive: true });

    stageEl.addEventListener("touchend", function (e) {
      if (e.changedTouches.length !== 1) return;
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      const dt = Date.now() - tt;
      if (dt < 700 && Math.abs(dx) > 90 && Math.abs(dy) < 70) {
        if (dx < 0) handlers.next(); else handlers.prev();
      }
    }, { passive: true });
  }

  /* ---- FPS göstergesi (yalnızca debug) ---- */
  let debug = false;
  function setDebug(on) {
    debug = !!on;
    if (fpsEl) fpsEl.hidden = !debug;
  }

  function setFps(fps, levelLabel) {
    if (fpsEl && debug) fpsEl.textContent = fps + " FPS · " + levelLabel;
  }

  return {
    buildDots: buildDots,
    setActive: setActive,
    setTool: setTool,
    toast: toast,
    setDebug: setDebug,
    setFps: setFps,
    toggleFullscreen: toggleFullscreen,
    get debug() { return debug; },
  };
}
