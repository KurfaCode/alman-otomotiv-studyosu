import { CFG } from "../config.js";

export function bindDictionary() {
  const panel = document.getElementById("dict");
  const list = document.getElementById("dict-list");
  const btn = document.getElementById("btn-dict");
  const close = document.getElementById("dict-close");

  if (list && !list.childElementCount) {
    CFG.ui.dict.forEach(function (pair) {
      const dt = document.createElement("dt");
      dt.textContent = pair[0];
      const dd = document.createElement("dd");
      dd.textContent = pair[1];
      list.appendChild(dt);
      list.appendChild(dd);
    });
  }

  function setOpen(open) {
    if (!panel) return;
    panel.hidden = !open;
    if (btn) btn.classList.toggle("on", open);
  }

  if (btn) btn.addEventListener("click", function () { setOpen(!!panel.hidden); });
  if (close) close.addEventListener("click", function () { setOpen(false); });

  return { setOpen: setOpen, get open() { return panel && !panel.hidden; } };
}
