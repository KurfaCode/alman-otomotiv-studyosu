/* ============================================================
   Marka armaları.

   Her arma tek renk (currentColor) çizilir: hem sol panelde
   hem duvardaki künyede aynı kimliği taşır. Dosya indirilmez,
   harici logo yoktur — hepsi çizimdir.

   emblemSVG(id) → SVG metni (panelde innerHTML ile kullanılır)
   emblemDataURI(id, color) → canvas'ta drawImage için veri adresi
   ============================================================ */

const MARKS = {
  /* Üç köşeli yıldız: kara, deniz ve havada motor gücü */
  mercedes:
    '<circle cx="24" cy="24" r="18" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M24 6v18M24 24L8.4 33M24 24l15.6 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',

  /* Bavyera dama tahtası: mavi-beyaz kadranlar */
  bmw:
    '<circle cx="24" cy="24" r="19" stroke="currentColor" stroke-width="3"/>' +
    '<circle cx="24" cy="24" r="13" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M11 24h13V11a13 13 0 0 0-13 13z" fill="currentColor" opacity=".5"/>' +
    '<path d="M24 11v13h13a13 13 0 0 0-13-13z" fill="#ffffff" opacity=".92"/>' +
    '<path d="M24 37v-13H11a13 13 0 0 0 13 13z" fill="#ffffff" opacity=".92"/>' +
    '<path d="M37 24H24v13a13 13 0 0 0 13-13z" fill="currentColor" opacity=".5"/>',

  /* Dört halka: Audi, DKW, Horch, Wanderer birliği */
  audi:
    '<g stroke="currentColor" stroke-width="2.4" fill="none">' +
    '<circle cx="10" cy="24" r="6"/><circle cx="19.3" cy="24" r="6"/>' +
    '<circle cx="28.7" cy="24" r="6"/><circle cx="38" cy="24" r="6"/></g>',

  /* Stuttgart kalkanı: dama + at */
  porsche:
    '<path d="M24 5l13.5 3.8v13.4c0 8.7-5.6 15.4-13.5 19.3-7.9-3.9-13.5-10.6-13.5-19.3V8.8z" ' +
    'stroke="currentColor" stroke-width="2" fill="none"/>' +
    '<path d="M10.5 18.5h27M10.5 28.5h27M24 5v36" stroke="currentColor" stroke-width="1.1" opacity=".55"/>' +
    '<path d="M12.6 20.8h8.6l1.3 1.4 1.3-1.4h8.6M12.6 30.6h9.2l1.2 1.3 1.2-1.3h9.2" ' +
    'stroke="currentColor" stroke-width="1.6" fill="none"/>',

  /* V ve W: halkın arabası */
  vw:
    '<circle cx="24" cy="24" r="18" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
    '<path d="M13.5 13.5l4.2 13.6L24 12l6.3 15.1 4.2-13.6" stroke="currentColor" stroke-width="2.1" ' +
    'fill="none" stroke-linejoin="round"/>' +
    '<path d="M18.6 13.5L24 25.8l5.4-12.3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>',

  /* İki iç içe M: Maybach monogramı */
  maybach:
    '<circle cx="24" cy="24" r="18" stroke="currentColor" stroke-width="2" fill="none"/>' +
    '<path d="M11.5 32.5v-15l6.2 9 6.2-9v15" stroke="currentColor" stroke-width="2.2" fill="none" ' +
    'stroke-linejoin="round"/>' +
    '<path d="M24.1 32.5v-15l6.2 9 6.2-9v15" stroke="currentColor" stroke-width="2.2" fill="none" ' +
    'stroke-linejoin="round"/>',
};

export function emblemSVG(id) {
  return '<svg viewBox="0 0 48 48" aria-hidden="true">' + (MARKS[id] || MARKS.mercedes) + "</svg>";
}

/* Canvas'ta kullanmak için: SVG'yi veri adresine çevirir. */
export function emblemDataURI(id, color) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" ' +
    'style="color:' + (color || "#ffffff") + '">' + (MARKS[id] || MARKS.mercedes) + "</svg>";
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export function hasEmblem(id) {
  return !!MARKS[id];
}
