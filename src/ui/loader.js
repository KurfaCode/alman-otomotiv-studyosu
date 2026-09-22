import { CFG } from "../config.js";

/* ============================================================
   Yükleme ekranı.

   Sabit zaman aşımı yok: süre yalnızca ilerleme GELMEDİĞİNDE
   işler. Yavaş bir tahtada 3 MB'lık model 25 sn sürse bile
   gerçek model yüklenir, maket göstermeye düşülmez.
   ============================================================ */

export function createLoaderUI(onStall) {
  const root = document.getElementById("loader");
  const bar = document.getElementById("load-bar");
  const txt = document.getElementById("load-txt");
  const tag = document.getElementById("build-tag");

  let lastProgress = performance.now();
  let hidden = false;
  let stalled = false;
  let percent = 0;

  if (tag) tag.textContent = "BUILD " + CFG.version;

  function setText(t) { if (txt) txt.textContent = t; }

  function setPercent(p) {
    percent = Math.max(0, Math.min(100, p));
    if (bar) bar.style.width = percent.toFixed(1) + "%";
  }

  return {
    setText: function (t) { setText(t); lastProgress = performance.now(); },
    setPercent: setPercent,

    /* GLTFLoader ilerlemesi (loaded/total bilinmiyorsa yalnızca metin) */
    progress: function (loaded, total, label) {
      lastProgress = performance.now();
      stalled = false;
      if (total > 0) {
        setPercent((loaded / total) * 100);
        setText((label || "Model yükleniyor") + ": %" + Math.round((loaded / total) * 100));
      } else {
        setText((label || "Model yükleniyor") + "…");
      }
    },

    tick: function () {
      if (hidden || stalled) return;
      const idle = performance.now() - lastProgress;
      if (idle > CFG.loader.stallMs) {
        stalled = true;
        if (typeof onStall === "function") onStall(Math.round(idle / 1000));
      }
    },

    hide: function (delayMs) {
      if (hidden) return;
      hidden = true;
      setPercent(100);
      setTimeout(function () {
        if (root) root.classList.add("hide");
        setTimeout(function () { if (root) root.style.display = "none"; }, 500);
      }, delayMs || 0);
    },

    fatal: function (title, text) {
      const f = document.getElementById("fatal");
      const t = document.getElementById("fatal-title");
      const p = document.getElementById("fatal-text");
      if (t) t.textContent = title;
      if (p) p.textContent = text;
      if (f) f.hidden = false;
      if (root) root.classList.add("hide");
    },
  };
}
