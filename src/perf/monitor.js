import { CFG } from "../config.js";

/* ============================================================
   Performans gözcüsü.

   Eski akıllı tahtalarda FPS düşerse kalite kademesi düşer:
   önce çözünürlük, sonra yansıma kapanır, en sonda jant
   animasyonu ve süsler gider. Cihaz toparlanırsa bir kademe
   geri alınır (tek yönlü düşüş yok).
   ============================================================ */

export function createMonitor(opts) {
  const onLevel = opts.onLevel || function () { };
  const maxLevel = CFG.perf.levels.length - 1;

  /* Kare aralığı çok uzunsa (sekme arka planda, pencere çizilmiyor)
     ölçüm sayılmaz; yoksa sahte "düşük FPS" yüzünden kalite boşuna düşer. */
  const STALE_MS = CFG.perf.sampleMs * 2.5;

  let level = typeof opts.startLevel === "number" ? opts.startLevel : CFG.perf.startLevel;
  let forced = typeof opts.forced === "number" ? opts.forced : null;
  let frames = 0;
  let last = performance.now();
  let lowStreak = 0;
  let highStreak = 0;
  let fps = 0;

  if (forced !== null) level = Math.max(0, Math.min(maxLevel, forced));

  function setLevel(n, announce) {
    const next = Math.max(0, Math.min(maxLevel, n));
    if (next === level) return;
    level = next;
    onLevel(level, announce !== false);
  }

  function update() {
    frames++;
    const now = performance.now();
    const span = now - last;
    if (span < CFG.perf.sampleMs) return;

    if (span > STALE_MS) {
      frames = 0;
      lowStreak = 0;
      highStreak = 0;
      last = now;
      return;
    }

    fps = Math.round((frames * 1000) / span);
    frames = 0;
    last = now;

    if (forced !== null) return;

    if (fps < CFG.perf.downFps) {
      lowStreak++;
      highStreak = 0;
      if (lowStreak >= CFG.perf.downAfter && level < maxLevel) {
        lowStreak = 0;
        setLevel(level + 1, true);
      }
    } else if (fps > CFG.perf.upFps) {
      highStreak++;
      lowStreak = 0;
      if (highStreak >= CFG.perf.upAfter && level > 0) {
        highStreak = 0;
        setLevel(level - 1, true);
      }
    } else {
      lowStreak = 0;
      highStreak = 0;
    }
  }

  return {
    update: update,
    setLevel: function (n) { setLevel(n, true); },
    force: function (n) { forced = Math.max(0, Math.min(maxLevel, n)); setLevel(forced, true); },
    get level() { return level; },
    get fps() { return fps; },
    get forced() { return forced; },
  };
}
