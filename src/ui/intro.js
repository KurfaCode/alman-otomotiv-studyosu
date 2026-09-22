/* ============================================================
   Giriş kapısı (intro).

   İlk ekranda iki yol vardır:
     • "İntro İzle"        → tanıtım filmi oynar, bitince sahneye döner
     • "Sunumla Devam Et"  → film atlanır, doğrudan sahne açılır

   GARANTİ KURALI: hiçbir durumda kullanıcı boş ekranda kalmaz.
   Video dosyası yoksa, bozuksa ya da tarayıcı oynatamıyorsa kapı
   kendiliğinden kapanır ve sahne KENDİ sinematik turunu oynatır
   (main.js'teki onCinematic). Böylece okul tahtasında internet
   olmasa da, video kaldırılmış olsa da sunum çalışır.

   Kaynak zinciri: zayıf tahtalarda (Faz 1/2) filmin 720p30 sürümü
   denenir, o yoksa/bozuksa tam 1080p sürüme, o da olmazsa sahne
   turuna düşülür. 1080p60'ı Intel HD 3000/4000 akıcı çözemiyor;
   film kare kare atlamasın diye bu zincir vardır.

   Kapı açıkken sahne kısayolları kilitlenir: shell.js
   document.body üzerindeki "intro-open" sınıfına bakar.
   ============================================================ */

import { CFG } from "../config.js";

const INTRO_SALT = "kurfa_core_salt_998";
const INTRO_HASH = "5d64eeabeec4bdec4e5cb8488b4988430483bf57ba6531a7c6843364b081c754";

async function sha256Hex(str) {
  if (typeof crypto !== "undefined" && crypto.subtle && typeof TextEncoder !== "undefined") {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }
  return "";
}

async function verifyIntroSecurity(pin) {
  const clean = String(pin || "").trim();
  if (!clean) return false;

  // 1. Sunucu API doğrulaması (Cloudflare Worker / Vercel)
  try {
    const res = await fetch("/api/verify-intro-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: clean })
    });
    if (res.ok) {
      const data = await res.json().catch(function () { return {}; });
      if (data && data.success) return true;
    }
  } catch (_) {
    // Çevrimdışı veya kapalı intranet durumu
  }

  // 2. Kriptografik tuzlu özet (Plaintext kodda asla barındırılmaz)
  try {
    const computed = await sha256Hex(INTRO_SALT + ":" + clean);
    if (computed === INTRO_HASH) return true;
  } catch (_) { }

  return false;
}

function pad2(n) { return (n < 10 ? "0" : "") + n; }

export function createIntro(opts) {
  const o = opts || {};
  const gate = document.getElementById("intro-gate");
  const film = document.getElementById("intro-film");
  const video = document.getElementById("intro-video");
  const note = document.getElementById("film-note");
  const btnFilm = document.getElementById("gate-film");
  const btnStart = document.getElementById("gate-start");
  const btnSkip = document.getElementById("film-skip");
  const lenEl = document.getElementById("gate-film-len");

  const pinModal = document.getElementById("intro-pin-modal");
  const pinClose = document.getElementById("gate-pin-close");
  const pinDisplay = document.getElementById("gate-pin-display");
  const pinHiddenInput = document.getElementById("gate-pin-hidden-input");
  const pinKeypad = document.getElementById("gate-pin-keypad");
  const pinErr = document.getElementById("gate-pin-error");

  let currentIntroPin = "";
  // Her sayfa yenilendiğinde (F5 / yeniden başlatma) şifre baştan istenir
  let isIntroUnlocked = false;

  const state = { open: false, watching: false, failed: false, opened: 0 };

  if (lenEl && CFG.intro && CFG.intro.seconds) lenEl.textContent = CFG.intro.seconds + " sn";

  function lock(on) {
    state.open = !!on;
    try { document.body.classList.toggle("intro-open", !!on); } catch (e) { }
  }

  /* Kapıyı kapat ve sahneye geç. mode: "video" | "skip" | "cinematic" */
  function close(mode) {
    hidePinPrompt();
    if (film && !film.hidden) stopVideo();
    if (film) film.hidden = true;
    if (gate) gate.hidden = true;
    lock(false);
    if (typeof o.onDone === "function") o.onDone(mode || "skip");
  }

  function stopVideo() {
    state.watching = false;
    clearTimeout(state.guard);
    if (!video) return;
    try {
      video.pause();
      video.removeAttribute("src");
      video.load();
    } catch (e) { }
  }

  /* Video oynatılamadı: sahne turuna düş (asla hata ekranı gösterme). */
  function fallback(reason) {
    if (state.failed) return;
    state.failed = true;
    stopVideo();
    if (film) film.hidden = true;
    try { console.warn("[AO] intro videosu oynatılamadı (" + reason + ") — sahne turu başlıyor."); } catch (e) { }
    if (gate) {
      const n = gate.querySelector(".gate-note");
      if (n) n.textContent = "Tanıtım filmi bu cihazda oynatılamadı; sahne kendi sinematik turunu gösterecek.";
      const a = gate.querySelector(".gate-actions");
      if (a) a.classList.add("degraded");
    }
    close("cinematic");
  }

  function watch() {
    if (state.watching) return;
    state.watching = true;
    if (gate) gate.hidden = true;
    if (film) film.hidden = false;
    if (note) note.textContent = "Tanıtım filmi oynatılıyor…";

    if (!video) { fallback("video yok"); return; }

    /* Kaynak zinciri: hafif sürüm → tam sürüm. Tek bir dosyaya
       bağlanmıyoruz; biri okunamazsa diğeri denenir. */
    const main = (CFG.intro && CFG.intro.video) || "";
    const light = (CFG.intro && CFG.intro.videoLight) || "";
    const chain = (o.light && light ? [light, main] : [main]).filter(function (s) { return !!s; });
    if (!chain.length) { fallback("kaynak tanımsız"); return; }

    let started = false;
    let attempt = 0;

    function arm() {
      /* Emniyet kemeri: 6 sn içinde tek kare bile gelmediyse sıradaki
         kaynak denenir, o da yoksa tur başlar. */
      clearTimeout(state.guard);
      state.guard = setTimeout(function () {
        if (!started && state.watching) next("zaman aşımı");
      }, 6000);
    }

    function next(reason) {
      /* Film kapatıldıysa emniyet kemeri geri getirmesin: yoksa
         "Sunumla Devam Et"ten sonra ses arkada çalmaya devam ederdi. */
      if (!state.watching || started || attempt >= chain.length) {
        if (state.watching && !started) fallback(reason || "okuma hatası");
        return;
      }
      const src = chain[attempt++];
      video.src = src;
      try { video.currentTime = 0; } catch (e) { }
      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch(function () { next("oynatma reddedildi"); });
      }
      arm();
    }

    video.addEventListener("error", function () { next("okuma hatası"); });
    video.addEventListener("ended", function () { close("video"); });
    video.addEventListener("playing", function () {
      started = true;
      clearTimeout(state.guard);
      if (note) note.textContent = "Tanıtım filmi oynatılıyor…";
    });

    next();
  }

  function updateIntroPinDisplay() {
    if (!pinDisplay) return;
    const dots = pinDisplay.querySelectorAll(".pin-dot");
    dots.forEach(function (dot, idx) {
      dot.classList.toggle("filled", idx < currentIntroPin.length);
    });
  }

  function setIntroStatus(msg, type) {
    if (!pinErr) return;
    pinErr.textContent = msg || "4 haneli PIN kodunuzu girin.";
    pinErr.className = "intro-auth-status" + (type ? " " + type : "");
  }

  function showPinPrompt() {
    if (!pinModal) {
      watch();
      return;
    }
    if (isIntroUnlocked) {
      watch();
      return;
    }

    currentIntroPin = "";
    if (pinHiddenInput) pinHiddenInput.value = "";
    updateIntroPinDisplay();
    setIntroStatus("", "");
    pinModal.hidden = false;

    setTimeout(function () {
      try { if (pinHiddenInput) pinHiddenInput.focus(); } catch (_) {}
    }, 50);
  }

  function hidePinPrompt() {
    if (pinModal) pinModal.hidden = true;
    currentIntroPin = "";
    if (pinHiddenInput) pinHiddenInput.value = "";
    updateIntroPinDisplay();
    setIntroStatus("", "");
  }

  async function handlePinSubmit() {
    const val = currentIntroPin.trim();
    if (!val) {
      setIntroStatus("Lütfen PIN kodunu girin.", "error");
      return;
    }

    setIntroStatus("Doğrulanıyor…", "");
    const ok = await verifyIntroSecurity(val);

    if (ok) {
      isIntroUnlocked = true;
      setIntroStatus("✓ Giriş başarılı!", "success");
      setTimeout(function () {
        hidePinPrompt();
        watch();
      }, 300);
    } else {
      setIntroStatus("✕ Hatalı PIN! Erişim reddedildi.", "error");
      if (pinDisplay) {
        pinDisplay.style.animation = "none";
        void pinDisplay.offsetHeight;
        pinDisplay.style.animation = "authShake 0.4s ease-in-out";
      }
      setTimeout(function () {
        currentIntroPin = "";
        if (pinHiddenInput) pinHiddenInput.value = "";
        updateIntroPinDisplay();
      }, 500);
    }
  }

  // Tuş takımı dinleyicisi
  if (pinKeypad) {
    pinKeypad.querySelectorAll(".intro-pin-key").forEach(function (keyBtn) {
      keyBtn.addEventListener("click", function () {
        const key = keyBtn.dataset.key;
        if (key === "clear") {
          currentIntroPin = "";
          if (pinHiddenInput) pinHiddenInput.value = "";
          updateIntroPinDisplay();
          setIntroStatus("", "");
        } else if (key === "enter") {
          handlePinSubmit();
        } else if (key && currentIntroPin.length < 4) {
          currentIntroPin += key;
          if (pinHiddenInput) pinHiddenInput.value = currentIntroPin;
          updateIntroPinDisplay();
          if (currentIntroPin.length === 4) {
            setTimeout(handlePinSubmit, 150);
          }
        }
      });
    });
  }

  // Gizli input & klavye
  if (pinHiddenInput) {
    pinHiddenInput.addEventListener("input", function () {
      const clean = pinHiddenInput.value.replace(/\D/g, "").slice(0, 4);
      currentIntroPin = clean;
      pinHiddenInput.value = clean;
      updateIntroPinDisplay();
      if (currentIntroPin.length === 4) {
        setTimeout(handlePinSubmit, 150);
      }
    });
  }

  if (pinDisplay && pinHiddenInput) {
    pinDisplay.addEventListener("click", function () {
      pinHiddenInput.focus();
    });
  }

  if (pinClose) pinClose.addEventListener("click", hidePinPrompt);

  if (pinModal) {
    pinModal.addEventListener("click", function (e) {
      if (e.target === pinModal) hidePinPrompt();
    });
  }

  function open() {
    if (gate) gate.hidden = false;
    lock(true);
    state.opened = Date.now();
  }

  if (btnFilm) btnFilm.addEventListener("click", showPinPrompt);
  if (btnStart) btnStart.addEventListener("click", function () { close("skip"); });
  if (btnSkip) btnSkip.addEventListener("click", function () { close("skip"); });
  if (video) video.addEventListener("click", function () { close("skip"); });
  if (film) film.addEventListener("click", function (e) { if (e.target === film) close("skip"); });

  /* Kapı açıkken klavye: ESC/Enter/Boşluk kapıyı kapatır, sahne
     kısayolları (R, L, ok tuşları) çalışmaz. */
  document.addEventListener("keydown", function (e) {
    if (!state.open && !state.watching) return;
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) {
      return;
    }
    const k = e.key;
    if (k === "Escape") {
      if (pinModal && !pinModal.hidden) {
        e.preventDefault();
        e.stopImmediatePropagation();
        hidePinPrompt();
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      close("skip");
      return;
    }
    if (pinModal && !pinModal.hidden) {
      if (k === "Backspace") {
        e.preventDefault();
        e.stopImmediatePropagation();
        currentIntroPin = currentIntroPin.slice(0, -1);
        if (pinHiddenInput) pinHiddenInput.value = currentIntroPin;
        updateIntroPinDisplay();
        return;
      }
      if (k === "Enter") {
        e.preventDefault();
        e.stopImmediatePropagation();
        handlePinSubmit();
        return;
      }
      if (/^[0-9]$/.test(k) && currentIntroPin.length < 4) {
        e.preventDefault();
        e.stopImmediatePropagation();
        currentIntroPin += k;
        if (pinHiddenInput) pinHiddenInput.value = currentIntroPin;
        updateIntroPinDisplay();
        if (currentIntroPin.length === 4) {
          setTimeout(handlePinSubmit, 150);
        }
        return;
      }
      return;
    }
    if (state.watching) {
      /* film oynarken herhangi bir tuş filmi geçer */
      if (k === "Enter" || k === " ") { e.preventDefault(); close("skip"); }
      return;
    }
    if (k === "Enter" || k === " ") {
      e.preventDefault();
      close("skip");
      return;
    }
    if (k === "i" || k === "I") {
      e.preventDefault();
      showPinPrompt();
      return;
    }
    /* diğer tuşlar sahneye gitmesin */
    e.stopImmediatePropagation();
  }, true);

  return {
    open: open,
    close: close,
    watch: watch,
    get isOpen() { return state.open || state.watching; },
    get failed() { return state.failed; },
    pad2: pad2,
  };
}
