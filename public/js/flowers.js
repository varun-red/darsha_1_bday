/* =========================================================
   flowers.js — painted-style SVG flowers
   Shared by the hero scenery (garden.js) and by the build step
   that bakes the static ground layer. Every function returns an
   SVG markup string centred on (x, y) with an overall radius r.
   Call Flowers.defs() once inside an <svg><defs> to get the
   gradients the shapes reference.
   ========================================================= */
(() => {
  'use strict';
  const f1 = (n) => (Math.round(n * 10) / 10).toString();
  const rad = (deg) => (deg * Math.PI) / 180;

  function defs() {
    return `
      <radialGradient id="flPinkOuter" cx="50%" cy="65%" r="60%"><stop offset="0" stop-color="#fbcdd8"/><stop offset="1" stop-color="#e58fa9"/></radialGradient>
      <radialGradient id="flPinkMid" cx="50%" cy="65%" r="60%"><stop offset="0" stop-color="#fde3e9"/><stop offset="1" stop-color="#f2a5ba"/></radialGradient>
      <radialGradient id="flPinkInner" cx="50%" cy="65%" r="60%"><stop offset="0" stop-color="#fff6f8"/><stop offset="1" stop-color="#f7c3cf"/></radialGradient>
      <radialGradient id="flBlushOuter" cx="50%" cy="65%" r="60%"><stop offset="0" stop-color="#fbe4ea"/><stop offset="1" stop-color="#efb0c1"/></radialGradient>
      <radialGradient id="flBlushMid" cx="50%" cy="65%" r="60%"><stop offset="0" stop-color="#fdf1f4"/><stop offset="1" stop-color="#f6c9d4"/></radialGradient>
      <radialGradient id="flBlushInner" cx="50%" cy="65%" r="60%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#fbdde5"/></radialGradient>
      <radialGradient id="flLilacOuter" cx="50%" cy="65%" r="60%"><stop offset="0" stop-color="#e5dcf5"/><stop offset="1" stop-color="#b39fd8"/></radialGradient>
      <radialGradient id="flLilacMid" cx="50%" cy="65%" r="60%"><stop offset="0" stop-color="#f0ebfa"/><stop offset="1" stop-color="#cdbde8"/></radialGradient>
      <radialGradient id="flLilacInner" cx="50%" cy="65%" r="60%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e2d8f4"/></radialGradient>
      <radialGradient id="flBlueFloret" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#f2f7fc"/><stop offset="1" stop-color="#a9c9e6"/></radialGradient>
      <radialGradient id="flDaisyPetal" cx="50%" cy="15%" r="90%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f0e6cf"/></radialGradient>
      <radialGradient id="flYolk" cx="42%" cy="38%" r="62%"><stop offset="0" stop-color="#fce68f"/><stop offset="1" stop-color="#dfa832"/></radialGradient>
      <linearGradient id="flLeaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8d3aa"/><stop offset="1" stop-color="#6f9a72"/></linearGradient>
    `;
  }

  const KINDS = {
    pink: ['flPinkOuter', 'flPinkMid', 'flPinkInner', '#e08ea8'],
    blush: ['flBlushOuter', 'flBlushMid', 'flBlushInner', '#e9a0b5'],
    lilac: ['flLilacOuter', 'flLilacMid', 'flLilacInner', '#a992cf'],
  };

  // Three rings of overlapping petals with a soft highlight — reads as a peony/rose.
  function peony(x, y, r, kind = 'pink', rot = 0) {
    const [outer, mid, inner, edge] = KINDS[kind] || KINDS.pink;
    let s = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})">`;
    const ring = (n, dist, rx, ry, fill, off) => {
      for (let k = 0; k < n; k++) {
        const a = (k / n) * 360 + off;
        const px = Math.cos(rad(a)) * dist * r;
        const py = Math.sin(rad(a)) * dist * r;
        s += `<ellipse cx="${f1(px)}" cy="${f1(py)}" rx="${f1(rx * r)}" ry="${f1(ry * r)}" transform="rotate(${f1(a + 90)} ${f1(px)} ${f1(py)})" fill="url(#${fill})" stroke="${edge}" stroke-width=".5" stroke-opacity=".5"/>`;
      }
    };
    ring(9, 0.52, 0.34, 0.58, outer, 0);
    ring(7, 0.34, 0.3, 0.48, mid, 20);
    ring(5, 0.17, 0.24, 0.36, inner, 36);
    s += `<circle r="${f1(r * 0.11)}" fill="${edge}" opacity=".5"/>`;
    s += `<ellipse cx="${f1(-r * 0.18)}" cy="${f1(-r * 0.3)}" rx="${f1(r * 0.24)}" ry="${f1(r * 0.11)}" fill="#fff" opacity=".35" transform="rotate(-30 ${f1(-r * 0.18)} ${f1(-r * 0.3)})"/>`;
    return s + '</g>';
  }

  // A mophead of four-petal florets.
  function hydrangea(x, y, r, rot = 0) {
    let s = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})">`;
    const floret = (fx, fy, sz, a0) => {
      for (let k = 0; k < 4; k++) {
        const a = a0 + k * 90;
        const px = fx + Math.cos(rad(a)) * sz * 0.5;
        const py = fy + Math.sin(rad(a)) * sz * 0.5;
        s += `<ellipse cx="${f1(px)}" cy="${f1(py)}" rx="${f1(sz * 0.42)}" ry="${f1(sz * 0.58)}" transform="rotate(${f1(a + 90)} ${f1(px)} ${f1(py)})" fill="url(#flBlueFloret)" stroke="#8fb6d9" stroke-width=".45" stroke-opacity=".6"/>`;
      }
      s += `<circle cx="${f1(fx)}" cy="${f1(fy)}" r="${f1(sz * 0.16)}" fill="#fff" opacity=".9"/>`;
    };
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
      floret(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.3, k * 25);
    }
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      floret(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4, r * 0.32, k * 15);
    }
    floret(0, 0, r * 0.34, 0);
    return s + '</g>';
  }

  // Slim white petals around a golden heart.
  function daisy(x, y, r, rot = 0, n = 12) {
    let s = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})">`;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 360;
      const px = Math.cos(rad(a)) * r * 0.52;
      const py = Math.sin(rad(a)) * r * 0.52;
      s += `<ellipse cx="${f1(px)}" cy="${f1(py)}" rx="${f1(r * 0.17)}" ry="${f1(r * 0.5)}" transform="rotate(${f1(a + 90)} ${f1(px)} ${f1(py)})" fill="url(#flDaisyPetal)" stroke="#e6d9b8" stroke-width=".5" stroke-opacity=".7"/>`;
    }
    s += `<circle r="${f1(r * 0.27)}" fill="url(#flYolk)"/>`;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      s += `<circle cx="${f1(Math.cos(a) * r * 0.14)}" cy="${f1(Math.sin(a) * r * 0.14)}" r="${f1(r * 0.04)}" fill="#c9962a" opacity=".55"/>`;
    }
    return s + '</g>';
  }

  // A spike of buds hanging from (x, y) downward for length h.
  function lavender(x, y, h, rot = 0) {
    let s = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})">`;
    s += `<path d="M0 0 V${f1(h)}" stroke="#7fa57c" stroke-width="${f1(Math.max(1.2, h * 0.03))}" stroke-linecap="round"/>`;
    const n = 9;
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1);
      const by = t * h * 0.8;
      const bx = (k % 2 ? 1 : -1) * h * 0.075 * (1 - t * 0.3);
      const br = h * 0.06 * (1.05 - t * 0.35);
      s += `<ellipse cx="${f1(bx)}" cy="${f1(by)}" rx="${f1(br * 0.85)}" ry="${f1(br)}" fill="${k % 2 ? '#c3aee6' : '#b39fd8'}"/>`;
      s += `<circle cx="${f1(bx - br * 0.25)}" cy="${f1(by - br * 0.3)}" r="${f1(br * 0.3)}" fill="#e6dcf6" opacity=".8"/>`;
    }
    return s + '</g>';
  }

  // A pointed leaf whose base is at (x, y), pointing along `angle`.
  function leaf(x, y, len, angle, fill = 'url(#flLeaf)') {
    return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(angle)})"><path d="M0 0 q${f1(len * 0.35)} ${f1(-len * 0.28)} ${f1(len)} 0 q${f1(-len * 0.35)} ${f1(len * 0.28)} ${f1(-len)} 0z" fill="${fill}"/><path d="M${f1(len * 0.1)} 0 H${f1(len * 0.9)}" stroke="#5f8a63" stroke-width=".6" opacity=".5"/></g>`;
  }

  const api = { defs, peony, hydrangea, daisy, lavender, leaf };
  globalThis.Flowers = api;
})();
