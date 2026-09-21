/* =========================================================
   garden.js — the living backdrop
   Procedural hedges, distant trees and flower beds; a floral
   garland arch; a canvas of pollen, butterflies and drifting
   petals; cursor sparkles, parallax and an optional ambient
   garden soundscape (Web Audio). Watercolour daylight palette.
   ========================================================= */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const isSmall = window.matchMedia('(max-width: 640px)').matches;

  // ---------- seeded random ----------
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  const f1 = (n) => n.toFixed(1);
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

  const PASTELS = ['#f9c5d1', '#d9cdef', '#fff6d8', '#c9dff0', '#fffdf7', '#fbd3c2'];
  const PASTEL_DEEP = ['#e9a0b5', '#b9a6dc', '#ead7a8', '#a5c4e2', '#e6d2c8', '#efa98f'];
  const LEAF = ['#9fd58f', '#66ad69', '#bfe6b0'];
  const FL = window.Flowers;

  // ---------- far layer: hazy hills and distant trees ----------
  function buildFar(svg) {
    if (!svg) return;
    const W = 1800, H = 600;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const r = rng(7);
    let out = `<defs>
      <linearGradient id="hillA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3f5d9"/><stop offset="1" stop-color="#c6e7b8"/></linearGradient>
      <linearGradient id="hillB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe9c2"/><stop offset="1" stop-color="#b0d9a2"/></linearGradient>
      <linearGradient id="farTree" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cbe8bc"/><stop offset="1" stop-color="#a3cf97"/></linearGradient>
    </defs>`;
    out += `<path d="M0 ${H} L0 420 Q300 330 600 400 T1200 380 T1800 410 L${W} ${H}Z" fill="url(#hillA)" opacity=".85"/>`;
    // distant round trees along the hill crest
    let d = '';
    for (let i = 0; i < 40; i++) {
      const x = (i / 40) * W + (r() - 0.5) * 40;
      const crest = 400 - Math.sin((x / W) * Math.PI * 2 + 1) * 30;
      const h = 60 + r() * 120;
      const w = h * (0.6 + r() * 0.5);
      const cy = crest - h * 0.55;
      const n = 3 + Math.floor(r() * 3);
      d += `M${f1(x - 3)},${f1(crest + 20)}L${f1(x - 2)},${f1(cy)}L${f1(x + 2)},${f1(cy)}L${f1(x + 3)},${f1(crest + 20)}Z`;
      for (let k = 0; k < n; k++) {
        const bx = x + (r() - 0.5) * w * 0.6;
        const by = cy - r() * h * 0.3;
        const br = w * (0.22 + r() * 0.18);
        d += ` M${f1(bx - br)},${f1(by)}a${f1(br)},${f1(br)} 0 1,1 ${f1(br * 2)},0a${f1(br)},${f1(br)} 0 1,1 ${f1(-br * 2)},0`;
      }
    }
    out += `<path d="${d}" fill="url(#farTree)" opacity=".9"/>`;
    out += `<path d="M0 ${H} L0 480 Q250 430 500 470 T1000 455 T1500 475 T1800 460 L${W} ${H}Z" fill="url(#hillB)"/>`;
    svg.innerHTML = out;
  }

  // ---------- mid layer: hedges and topiary ----------
  function buildMid(svg) {
    if (!svg) return;
    const W = 1800, H = 460;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const r = rng(19);
    let out = `<defs>
      <linearGradient id="hedgeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b6e2a5"/><stop offset="1" stop-color="#7fbd77"/></linearGradient>
      <linearGradient id="topiaryGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c2e7b2"/><stop offset="1" stop-color="#78b872"/></linearGradient>
    </defs>`;
    // hedge: overlapping round blobs along the base
    let d = `M0,${H}L0,${H - 120}`;
    let blobs = '';
    for (let x = -40; x < W + 80; x += 70 + r() * 40) {
      const br = 70 + r() * 60;
      const by = H - 60 + r() * 30;
      blobs += ` M${f1(x - br)},${f1(by)}a${f1(br)},${f1(br)} 0 1,1 ${f1(br * 2)},0a${f1(br)},${f1(br)} 0 1,1 ${f1(-br * 2)},0`;
    }
    d += `L${W},${H - 120}L${W},${H}Z`;
    out += `<path d="${d}${blobs}" fill="url(#hedgeGrad)"/>`;
    // topiary: balls on stems and cones, spaced out
    let topi = '';
    for (let i = 0; i < 9; i++) {
      const x = 120 + i * 200 + (r() - 0.5) * 80;
      if (r() < 0.5) {
        const br = 46 + r() * 30;
        const cy = H - 190 - r() * 60;
        topi += `<path d="M${f1(x - 6)},${f1(H - 100)}L${f1(x - 5)},${f1(cy)}L${f1(x + 5)},${f1(cy)}L${f1(x + 6)},${f1(H - 100)}Z" fill="#8fb884"/>`;
        topi += `<circle cx="${f1(x)}" cy="${f1(cy)}" r="${f1(br)}" fill="url(#topiaryGrad)"/>`;
        if (r() < 0.5) topi += `<circle cx="${f1(x)}" cy="${f1(cy - br - 26)}" r="${f1(br * 0.5)}" fill="url(#topiaryGrad)"/>`;
      } else {
        const h = 160 + r() * 120;
        const w = 70 + r() * 40;
        topi += `<path d="M${f1(x)},${f1(H - 110 - h)} L${f1(x + w / 2)},${f1(H - 100)} L${f1(x - w / 2)},${f1(H - 100)}Z" fill="url(#topiaryGrad)"/>`;
      }
    }
    out += topi;
    svg.innerHTML = out;
  }

  // ---------- near layer: tall flower stalks and grass ----------
  function buildNear(svg) {
    if (!svg) return;
    const W = 1800, H = 420;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const r = rng(31);
    let out = `<defs>
      ${FL.defs()}
      <linearGradient id="stalkGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ccb84"/><stop offset="1" stop-color="#4f9457"/></linearGradient>
      <linearGradient id="soilNear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#aedc9f"/><stop offset="1" stop-color="#7fbd77"/></linearGradient>
    </defs>`;
    out += `<path d="M0 ${H} L0 ${H - 60} Q300 ${H - 100} 600 ${H - 70} T1200 ${H - 80} T1800 ${H - 66} L${W} ${H}Z" fill="url(#soilNear)"/>`;
    // grass blades
    let grass = '';
    for (let i = 0; i < 160; i++) {
      const x = r() * W;
      const h = 40 + r() * 90;
      const lean = (r() - 0.5) * 50;
      grass += `M${f1(x)},${H - 50}Q${f1(x + lean * 0.4)},${f1(H - 50 - h * 0.6)} ${f1(x + lean)},${f1(H - 50 - h)}`;
    }
    out += `<path d="${grass}" stroke="#6fb26c" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/>`;
    // stalks with blooms
    let stalks = '';
    let blooms = '';
    for (let i = 0; i < 70; i++) {
      const x = r() * W;
      const h = 90 + r() * 170;
      const lean = (r() - 0.5) * 60;
      const topX = x + lean;
      const topY = H - 50 - h;
      stalks += `M${f1(x)},${H - 50}Q${f1(x + lean * 0.3)},${f1(H - 50 - h * 0.55)} ${f1(topX)},${f1(topY)}`;
      // leaves
      const ly = H - 50 - h * (0.3 + r() * 0.3);
      const lx = x + lean * 0.3;
      stalks += `M${f1(lx)},${f1(ly)}q-22,-6 -30,-26q20,4 30,26z M${f1(lx)},${f1(ly + 24)}q22,-6 30,-26q-20,4 -30,26z`;
      const kind = r();
      const rot = (r() - 0.5) * 40;
      if (kind < 0.38) {
        blooms += FL.daisy(topX, topY, 9 + r() * 8, rot);
      } else if (kind < 0.62) {
        blooms += FL.lavender(topX, topY - 8, 34 + r() * 26, (r() - 0.5) * 16);
      } else if (kind < 0.8) {
        blooms += FL.peony(topX, topY, 10 + r() * 9, pick(r, ['pink', 'blush', 'lilac']), rot);
      } else {
        blooms += FL.hydrangea(topX, topY, 10 + r() * 7, rot);
      }
    }
    out += `<path d="${stalks}" stroke="url(#stalkGrad)" stroke-width="3.5" fill="#9fd58f" stroke-linecap="round"/>`;
    out += blooms;
    svg.innerHTML = out;
  }
  function k2(c) { return c === 1 ? '#b9a6dc' : c === 3 ? '#a5c4e2' : '#c3aee6'; }

  // ---------- floral garland arch ----------
  function buildArch(svg) {
    if (!svg) return;
    const r = rng(43);
    // On phones the arch becomes a tall portrait frame anchored to the top of the hero:
    // pillars are inset so the whole garland stays inside the viewport, and they run
    // off the bottom behind the flower bed.
    const cx = 450, cy = 380, R = isSmall ? 350 : 340;
    const left = cx - R, right = cx + R, base = isSmall ? 2300 : 760;
    svg.setAttribute('viewBox', `0 0 900 ${base}`);
    svg.setAttribute('preserveAspectRatio', isSmall ? 'xMidYMin meet' : 'xMidYMax meet');
    let out = `<defs>
      ${FL.defs()}
      <radialGradient id="archPeony" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#fde6ec"/><stop offset=".6" stop-color="#f7b7c6"/><stop offset="1" stop-color="#e58fa9"/></radialGradient>
      <radialGradient id="archBlush" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#fff8f8"/><stop offset=".7" stop-color="#fbd9e1"/><stop offset="1" stop-color="#f0b3c3"/></radialGradient>
      <radialGradient id="archHydra" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#e8f1fa"/><stop offset="1" stop-color="#a9c9e6"/></radialGradient>
      <radialGradient id="archLilac" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#f3eefb"/><stop offset=".7" stop-color="#d9cdef"/><stop offset="1" stop-color="#b9a6dc"/></radialGradient>
      <radialGradient id="archYolk" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#fbe28f"/><stop offset="1" stop-color="#e9b93f"/></radialGradient>
    </defs>`;
    const archPath = `M${left} ${base} V${cy} A${R} ${R} 0 0 1 ${right} ${cy} V${base}`;
    // slim greenery arch
    out += `<path d="${archPath}" stroke="#7bb974" stroke-width="12" fill="none" stroke-linecap="round" opacity=".95"/>`;
    out += `<path d="${archPath}" stroke="#c9ecbb" stroke-width="3" fill="none" stroke-dasharray="10 16" opacity=".9"/>`;
    // sample points along the arch for foliage & blooms
    const pts = [];
    for (let y = base - 30; y > cy; y -= isSmall ? 44 : 34) { pts.push({ x: left, y, t: 0 }); pts.push({ x: right, y, t: 0 }); }
    for (let a = Math.PI; a >= 0; a -= Math.PI / 26) pts.push({ x: cx + Math.cos(a) * R, y: cy - Math.sin(a) * R, t: 1, a });
    let leaves = '';
    let blooms = '';
    let wisteria = '';
    let vines = '';
    for (const p of pts) {
      const n = 2 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const ang = r() * 360;
        const lx = p.x + (r() - 0.5) * 40;
        const ly = p.y + (r() - 0.5) * 34;
        leaves += FL.leaf(lx, ly, 18 + r() * 14, ang, pick(r, LEAF));
      }
      const kind = r();
      const bx = p.x + (r() - 0.5) * 30;
      const by = p.y + (r() - 0.5) * 30;
      const rot = (r() - 0.5) * 60;
      // phones get a lighter, whiter mix: fewer pink peonies, more daisies and hydrangea
      const peonyShare = isSmall ? 0.2 : 0.36;
      const hydraShare = isSmall ? 0.46 : 0.58;
      if (kind < peonyShare) {
        blooms += FL.peony(bx, by, 16 + r() * 14, r() < (isSmall ? 0.4 : 0.65) ? 'pink' : 'blush', rot);
      } else if (kind < hydraShare) {
        blooms += FL.hydrangea(bx, by, 18 + r() * 9, rot);
      } else if (kind < 0.84) {
        blooms += FL.daisy(bx, by, 13 + r() * 8, rot);
      } else if (kind < 0.94) {
        blooms += FL.peony(bx, by, 9 + r() * 6, 'lilac', rot);
      }
      // hanging wisteria and trailing vines from the upper arch
      if (p.t === 1 && p.y < cy - 40 && r() < 0.45) {
        const n2 = 5 + Math.floor(r() * 7);
        const drift = (r() - 0.5) * 20;
        for (let k = 0; k < n2; k++) {
          const wx = p.x + drift * (k / n2) + Math.sin(k * 1.3) * 3;
          const wy = p.y + 20 + k * 12;
          wisteria += `<circle cx="${f1(wx)}" cy="${f1(wy)}" r="${f1(6.5 - k * 0.4)}" fill="${k % 2 ? '#cfbcf3' : '#ae92e6'}" opacity=".95"/>`;
        }
      }
      if (p.t === 1 && p.a > 0.35 && p.a < Math.PI - 0.35 && (p.a < 1.05 || p.a > Math.PI - 1.05) && r() < 0.6) {
        const len = 90 + r() * 140;
        const sway = (r() - 0.5) * 60;
        vines += `<path d="M${f1(p.x)} ${f1(p.y)} q${f1(sway)} ${f1(len * 0.5)} ${f1(sway * 0.4)} ${f1(len)}" stroke="#7bb974" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        for (let k = 1; k < len / 22; k++) {
          const t = k / (len / 22);
          const vx = p.x + sway * t * (1 - t) * 2 * 0.5 + sway * 0.4 * t * t;
          const vy = p.y + len * t;
          const side = k % 2 ? 1 : -1;
          vines += FL.leaf(vx, vy, 12 + r() * 6, side * 50 + 20, pick(r, LEAF));
        }
      }
    }
    // pink satin bow on the left shoulder
    const bx = cx + Math.cos((135 * Math.PI) / 180) * R, by = cy - Math.sin((135 * Math.PI) / 180) * R;
    // outer group carries the position; the CSS sway animation on .bow would override an inline transform
    const bow = `<g transform="translate(${f1(bx)} ${f1(by)}) rotate(-20)"><g class="bow">
      <path d="M-6 6 q-10 40 -22 90 q8 -6 16 0 q4 -46 10 -88z" fill="#fbc6d9" stroke="#e8739c" stroke-width="1.2"/>
      <path d="M6 6 q10 40 24 86 q-8 -6 -16 0 q-4 -46 -12 -84z" fill="#f9b4ca" stroke="#e8739c" stroke-width="1.2"/>
      <ellipse cx="-30" cy="-6" rx="30" ry="17" transform="rotate(-18 -30 -6)" fill="#fbc6d9" stroke="#e8739c" stroke-width="1.4"/>
      <ellipse cx="30" cy="-6" rx="30" ry="17" transform="rotate(18 30 -6)" fill="#f9b4ca" stroke="#e8739c" stroke-width="1.4"/>
      <ellipse cx="-28" cy="-8" rx="14" ry="6" transform="rotate(-18 -28 -8)" fill="#fff" opacity=".45"/>
      <ellipse cx="28" cy="-8" rx="14" ry="6" transform="rotate(18 28 -8)" fill="#fff" opacity=".45"/>
      <circle cx="0" cy="0" r="9" fill="#f48fb1" stroke="#e8739c" stroke-width="1.2"/>
    </g></g>`;
    out += `<g>${vines}</g><g>${leaves}</g><g>${wisteria}</g><g>${blooms}</g>${bow}`;
    svg.innerHTML = out;
  }

  // ---------- climbing roses on the wishing-garden trellis ----------
  function buildTrellisVines(group) {
    if (!group) return;
    const r = rng(61);
    // frame of the trellis rect in its 800x420 scene: x 60..740, y 0..250
    const pts = [];
    for (let x = 80; x <= 720; x += 40) { pts.push({ x, y: 4 + (r() - 0.5) * 10 }); if (r() < 0.6) pts.push({ x: x + 20, y: 250 + (r() - 0.5) * 10 }); }
    for (let y = 20; y <= 240; y += 34) { pts.push({ x: 62 + (r() - 0.5) * 10, y }); pts.push({ x: 738 + (r() - 0.5) * 10, y }); }
    let leaves = '', roses = '';
    for (const p of pts) {
      const n = 1 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const ang = r() * 360;
        const lx = p.x + (r() - 0.5) * 30;
        const ly = p.y + (r() - 0.5) * 26;
        leaves += `<ellipse cx="${f1(lx)}" cy="${f1(ly)}" rx="6" ry="12" transform="rotate(${f1(ang)} ${f1(lx)} ${f1(ly)})" fill="${pick(r, LEAF)}"/>`;
      }
      if (r() < 0.55) {
        const rr = 7 + r() * 6;
        const rx = p.x + (r() - 0.5) * 22;
        const ry = p.y + (r() - 0.5) * 22;
        const k = r();
        roses += k < 0.45 ? FL.peony(rx, ry, rr, pick(r, ['pink', 'blush', 'lilac']), r() * 60) : k < 0.75 ? FL.daisy(rx, ry, rr * 0.9, r() * 60) : FL.hydrangea(rx, ry, rr * 0.9, r() * 60);
      }
    }
    group.innerHTML = `<defs>${FL.defs()}</defs>` + leaves + roses;
  }
  buildTrellisVines(document.getElementById('trellisVines'));

  buildFar(document.getElementById('gardenFar'));
  buildMid(document.getElementById('gardenMid'));
  buildNear(document.getElementById('gardenNear'));
  buildArch(document.getElementById('roseArch'));

  // ---------- parallax ----------
  const layers = Array.from(document.querySelectorAll('.hero__layer, .hero__arch'));
  const hero = document.getElementById('hero');
  let targetX = 0, targetY = 0, curX = 0, curY = 0, scrollY = 0;

  if (!reduceMotion) {
    if (finePointer) {
      window.addEventListener('pointermove', (e) => {
        targetX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetY = (e.clientY / window.innerHeight - 0.5) * 2;
      });
    }
    window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
  }

  function applyParallax() {
    curX += (targetX - curX) * 0.05;
    curY += (targetY - curY) * 0.05;
    const heroH = hero ? hero.offsetHeight : window.innerHeight;
    const s = Math.min(scrollY, heroH);
    for (const layer of layers) {
      const depth = parseFloat(layer.dataset.depth || '0.1');
      const tx = -curX * depth * 60;
      const ty = -curY * depth * 20 + s * depth * 1.4;
      const base = layer.classList.contains('hero__arch') ? 'translateX(-50%) ' : '';
      layer.style.transform = `${base}translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`;
    }
  }

  // ---------- canvas ----------
  const canvas = document.getElementById('sky');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let W = 0, H = 0, dpr = 1;
  const stars = [];
  const dust = [];
  const butterflies = [];
  const petals = [];
  const sparks = [];
  const pointer = { x: -9999, y: -9999, active: false, lastSpark: 0 };
  let shooting = null;

  const BUTTERFLY_COLORS = [
    ['#f9a9c5', '#e45a8c'], ['#cab4f1', '#8f6cd9'], ['#ffe08a', '#e0a520'], ['#a9d1f3', '#5f9fdf'], ['#ffffff', '#d9c48f'], ['#ffc3a8', '#e87a55'],
  ];

  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedStars();
  }

  function seedStars() {
    stars.length = 0;
    const r = rng(99);
    const n = 0; // daylight sky — no stars
    for (let i = 0; i < n; i++) {
      stars.push({ x: r() * W, y: r() * H * 0.5, s: 0.4 + r() * 1.3, p: r() * Math.PI * 2, sp: 0.4 + r() * 1.4, tint: r() });
    }
  }

  function seedLife() {
    dust.length = 0;
    const n = reduceMotion ? 0 : isSmall ? 16 : 34;
    for (let i = 0; i < n; i++) {
      dust.push({ x: Math.random() * W, y: H * 0.2 + Math.random() * H * 0.8, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, p: Math.random() * Math.PI * 2, sp: 0.6 + Math.random() * 1.4, r: 1 + Math.random() * 1.4 });
    }
    butterflies.length = 0;
    const b = reduceMotion ? 0 : isSmall ? 6 : 12;
    for (let i = 0; i < b; i++) butterflies.push(newButterfly());
    petals.length = 0;
    const m = reduceMotion ? 0 : isSmall ? 12 : 26;
    for (let i = 0; i < m; i++) petals.push(newPetal(true));
  }

  function newButterfly() {
    const [fill, edge] = BUTTERFLY_COLORS[Math.floor(Math.random() * BUTTERFLY_COLORS.length)];
    return {
      x: Math.random() * W,
      y: H * 0.15 + Math.random() * H * 0.7,
      a: Math.random() * Math.PI * 2,
      turn: 0,
      speed: 0.5 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      flap: 0.14 + Math.random() * 0.08,
      size: isSmall ? 8 + Math.random() * 5 : 11 + Math.random() * 8,
      bob: Math.random() * Math.PI * 2,
      fill, edge,
    };
  }

  function newPetal(anywhere) {
    const c = Math.random();
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : -10,
      vy: 0.25 + Math.random() * 0.4,
      drift: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.04,
      r: 3 + Math.random() * 4,
      color: c < 0.5 ? '#f9a9c5' : c < 0.75 ? '#fbcddd' : c < 0.9 ? '#ffffff' : '#cab4f1',
      a: 0.55 + Math.random() * 0.35,
    };
  }

  function glow(x, y, radius, rgb, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(${rgb},${alpha})`);
    g.addColorStop(0.35, `rgba(${rgb},${alpha * 0.45})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawButterfly(b, t) {
    const flap = Math.abs(Math.sin(b.phase));
    const wingScale = 0.25 + flap * 0.75;
    ctx.save();
    ctx.translate(b.x, b.y + Math.sin(b.bob) * 3);
    ctx.rotate(b.a + Math.PI / 2);
    // shadow glow
    glow(0, 0, b.size * 2.2, '255,235,210', 0.18);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side * wingScale, 1);
      ctx.fillStyle = b.fill;
      ctx.strokeStyle = b.edge;
      ctx.lineWidth = 1;
      // upper wing
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(b.size * 0.4, -b.size * 1.3, b.size * 1.5, -b.size * 1.2, b.size * 1.3, -b.size * 0.2);
      ctx.bezierCurveTo(b.size * 1.1, b.size * 0.2, b.size * 0.4, b.size * 0.1, 0, 0);
      ctx.fill();
      ctx.stroke();
      // lower wing
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(b.size * 0.5, b.size * 0.1, b.size * 1.1, b.size * 0.5, b.size * 0.8, b.size * 1.1);
      ctx.bezierCurveTo(b.size * 0.5, b.size * 1.3, b.size * 0.1, b.size * 0.7, 0, 0);
      ctx.fill();
      ctx.stroke();
      // spot
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(b.size * 0.8, -b.size * 0.55, b.size * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // body
    ctx.fillStyle = '#7a5a4a';
    ctx.beginPath();
    ctx.ellipse(0, 0.1 * b.size, b.size * 0.12, b.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5a4a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -b.size * 0.5);
    ctx.lineTo(-b.size * 0.3, -b.size * 0.95);
    ctx.moveTo(0, -b.size * 0.5);
    ctx.lineTo(b.size * 0.3, -b.size * 0.95);
    ctx.stroke();
    ctx.restore();
    void t;
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(50, now - last) / 16.67;
    last = now;
    if (!document.hidden && ctx) {
      ctx.clearRect(0, 0, W, H);
      const t = now / 1000;
      const scrollFade = Math.max(0, 1 - scrollY / (H * 1.2));

      // stars (only in the dark upper sky, fading as the sky lightens)
      for (const s of stars) {
        const tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.p);
        const depthFade = 1 - s.y / (H * 0.5);
        const a = tw * depthFade * (0.35 + scrollFade * 0.65);
        ctx.fillStyle = s.tint > 0.9 ? `rgba(255,211,220,${a})` : s.tint > 0.8 ? `rgba(200,179,245,${a})` : `rgba(255,246,236,${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y - scrollY * 0.15, s.s, 0, Math.PI * 2);
        ctx.fill();
        if (s.s > 1.4 && tw > 0.9) glow(s.x, s.y - scrollY * 0.15, s.s * 5, '255,240,220', 0.18 * scrollFade);
      }

      // petals
      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];
        p.y += p.vy * dt;
        p.drift += 0.012 * dt;
        p.x += Math.sin(p.drift) * 0.5 * dt;
        p.rot += p.vr * dt;
        if (p.y > H + 12) petals[i] = newPetal(false);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // fairy dust
      for (const f of dust) {
        f.p += 0.03 * f.sp * dt;
        f.vx += (Math.random() - 0.5) * 0.04 * dt;
        f.vy += (Math.random() - 0.5) * 0.04 * dt;
        const speed = Math.hypot(f.vx, f.vy);
        if (speed > 0.6) { f.vx = (f.vx / speed) * 0.6; f.vy = (f.vy / speed) * 0.6; }
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.x < -20) f.x = W + 20; else if (f.x > W + 20) f.x = -20;
        if (f.y < -20) f.y = H + 20; else if (f.y > H + 20) f.y = -20;
        const pulse = Math.pow((Math.sin(f.p) + 1) / 2, 2);
        const a = 0.15 + pulse * 0.75;
        glow(f.x, f.y, f.r * 8, '255,205,60', a * 0.4);
        ctx.fillStyle = `rgba(255,213,74,${a * 0.95})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // butterflies
      for (const b of butterflies) {
        b.phase += b.flap * dt * (1 + b.speed);
        b.bob += 0.05 * dt;
        b.turn += (Math.random() - 0.5) * 0.08 * dt;
        b.turn *= 0.92;
        if (pointer.active) {
          const dx = pointer.x - b.x;
          const dy = pointer.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 320 * 320 && d2 > 60 * 60) {
            const want = Math.atan2(dy, dx);
            let diff = want - b.a;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            b.turn += diff * 0.012 * dt;
          } else if (d2 <= 60 * 60) {
            b.turn += 0.05 * dt;
          }
        }
        b.a += b.turn;
        // gently keep them inside the viewport
        if (b.x < 40) b.turn += 0.02; else if (b.x > W - 40) b.turn -= 0.02;
        if (b.y < 80) b.a += (Math.PI / 2 - Math.sin(b.a)) * 0.01; else if (b.y > H - 80) b.a -= (Math.PI / 2 + Math.sin(b.a)) * 0.01;
        b.x += Math.cos(b.a) * b.speed * dt;
        b.y += Math.sin(b.a) * b.speed * dt;
        if (b.x < -60) b.x = W + 60; else if (b.x > W + 60) b.x = -60;
        if (b.y < -60) b.y = H + 60; else if (b.y > H + 60) b.y = -60;
        drawButterfly(b, t);
      }

      // cursor sparkles & bursts
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= s.decay * dt;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += s.g * dt;
        s.vx *= 0.98;
        const a = Math.max(0, s.life);
        glow(s.x, s.y, s.r * 4, s.rgb, a * 0.4);
        ctx.fillStyle = `rgba(${s.rgb},${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (!reduceMotion) applyParallax();
    requestAnimationFrame(frame);
  }

  function addSpark(x, y, opts = {}) {
    if (reduceMotion) return;
    sparks.push({
      x, y,
      vx: (Math.random() - 0.5) * (opts.spread ?? 1.2),
      vy: (Math.random() - 0.5) * (opts.spread ?? 1.2) - (opts.lift ?? 0.4),
      g: opts.g ?? 0.01,
      r: opts.r ?? 1 + Math.random() * 1.6,
      life: 1,
      decay: opts.decay ?? 0.03 + Math.random() * 0.03,
      rgb: opts.rgb ?? (Math.random() < 0.6 ? '255,205,60' : '244,143,177'),
    });
  }

  function burst(x, y, n = 42) {
    const colors = ['255,205,60', '244,143,177', '202,180,241', '255,255,255', '169,209,243'];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const sp = 1.5 + Math.random() * 3.5;
      sparks.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1, g: 0.05, r: 1.5 + Math.random() * 2, life: 1, decay: 0.012 + Math.random() * 0.012, rgb: colors[i % colors.length] });
    }
  }

  if (canvas) {
    resize();
    seedLife();
    window.addEventListener('resize', () => { resize(); });
    if (finePointer && !reduceMotion) {
      window.addEventListener('pointermove', (e) => {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        pointer.active = true;
        const now = performance.now();
        if (now - pointer.lastSpark > 28) {
          pointer.lastSpark = now;
          addSpark(e.clientX + (Math.random() - 0.5) * 6, e.clientY + (Math.random() - 0.5) * 6);
        }
      });
      window.addEventListener('pointerleave', () => { pointer.active = false; });
    }
    window.addEventListener('pointerdown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (['button', 'a', 'input', 'textarea', 'select', 'label', 'summary'].includes(tag) || e.target.closest('button, a, label, .modal__panel')) return;
      burst(e.clientX, e.clientY, isSmall ? 20 : 34);
    });
    requestAnimationFrame(frame);
  }

  // ---------- ambient soundscape (Web Audio, synthesised) ----------
  let audio = null;
  const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];

  function createAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctxA = new AC();
    const master = ctxA.createGain();
    master.gain.value = 0;
    master.connect(ctxA.destination);

    // breeze: filtered noise with a slow swell
    const bufferSize = ctxA.sampleRate * 2;
    const buffer = ctxA.createBuffer(1, bufferSize, ctxA.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }
    const noise = ctxA.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const nf = ctxA.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 520;
    nf.Q.value = 0.6;
    const ng = ctxA.createGain();
    ng.gain.value = 0.09;
    const lfo = ctxA.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoG = ctxA.createGain();
    lfoG.gain.value = 0.05;
    lfo.connect(lfoG).connect(ng.gain);
    noise.connect(nf).connect(ng).connect(master);
    noise.start();
    lfo.start();

    // warm pad
    const pad = ctxA.createGain();
    pad.gain.value = 0.045;
    const pf = ctxA.createBiquadFilter();
    pf.type = 'lowpass';
    pf.frequency.value = 700;
    for (const [freq, det] of [[174.61, -4], [261.63, 5], [329.63, -2]]) {
      const o = ctxA.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq;
      o.detune.value = det;
      o.connect(pf);
      o.start();
    }
    pf.connect(pad).connect(master);

    let chimeTimer = null;
    let birdTimer = null;
    function chime(freq, when = 0, vol = 0.18) {
      const t0 = ctxA.currentTime + when;
      const o = ctxA.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const o2 = ctxA.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = freq * 2.01;
      const g = ctxA.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.8);
      const g2 = ctxA.createGain();
      g2.gain.value = 0.25;
      o.connect(g);
      o2.connect(g2).connect(g);
      g.connect(master);
      o.start(t0);
      o2.start(t0);
      o.stop(t0 + 3);
      o2.stop(t0 + 3);
    }
    function chirp(when, base) {
      const t0 = ctxA.currentTime + when;
      const o = ctxA.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(base, t0);
      o.frequency.exponentialRampToValueAtTime(base * 1.5, t0 + 0.05);
      o.frequency.exponentialRampToValueAtTime(base * 1.1, t0 + 0.11);
      const g = ctxA.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.045, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
      const pan = ctxA.createStereoPanner ? ctxA.createStereoPanner() : null;
      if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; o.connect(g).connect(pan).connect(master); } else o.connect(g).connect(master);
      o.start(t0);
      o.stop(t0 + 0.15);
    }
    function scheduleChime() {
      chime(PENTA[Math.floor(Math.random() * PENTA.length)], 0, 0.07 + Math.random() * 0.07);
      chimeTimer = setTimeout(scheduleChime, 2200 + Math.random() * 5000);
    }
    function scheduleBird() {
      const n = 2 + Math.floor(Math.random() * 3);
      const base = 1700 + Math.random() * 900;
      for (let i = 0; i < n; i++) chirp(i * 0.16, base * (1 + (Math.random() - 0.5) * 0.1));
      birdTimer = setTimeout(scheduleBird, 3500 + Math.random() * 7000);
    }
    return {
      start() {
        if (ctxA.state !== 'running') ctxA.resume().catch(() => {});
        master.gain.cancelScheduledValues(ctxA.currentTime);
        master.gain.linearRampToValueAtTime(0.9, ctxA.currentTime + 1.5);
        if (!chimeTimer) scheduleChime();
        if (!birdTimer) birdTimer = setTimeout(scheduleBird, 1200);
      },
      stop() {
        master.gain.cancelScheduledValues(ctxA.currentTime);
        master.gain.linearRampToValueAtTime(0, ctxA.currentTime + 0.8);
        clearTimeout(chimeTimer);
        clearTimeout(birdTimer);
        chimeTimer = null;
        birdTimer = null;
      },
      celebrate() {
        ctxA.resume();
        const was = master.gain.value;
        if (was < 0.05) master.gain.setValueAtTime(0.7, ctxA.currentTime);
        [0, 0.12, 0.24, 0.36, 0.55].forEach((d, i) => chime(PENTA[[0, 2, 4, 6, 8][i]], d, 0.16));
        if (was < 0.05) master.gain.linearRampToValueAtTime(0, ctxA.currentTime + 3.5);
      },
    };
  }

  // iOS mutes Web Audio while the ringer switch is on silent unless a media
  // element is also playing, so loop a silent clip alongside the soundscape.
  const SILENT_CLIP = 'data:audio/wav;base64,UklGRvQHAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YdAHAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
  let unlockEl = null;
  function unlockMedia(on) {
    if (!unlockEl) {
      unlockEl = document.createElement('audio');
      unlockEl.setAttribute('playsinline', '');
      unlockEl.loop = true;
      unlockEl.preload = 'auto';
      unlockEl.src = SILENT_CLIP;
    }
    if (on) unlockEl.play().catch(() => {});
    else unlockEl.pause();
  }

  let audioOn = false;
  function toggleAudio(force) {
    audioOn = typeof force === 'boolean' ? force : !audioOn;
    if (!audio) audio = createAudio();
    if (!audio) return false;
    if (audioOn) { unlockMedia(true); audio.start(); } else { audio.stop(); unlockMedia(false); }
    return audioOn;
  }
  // Mobile browsers suspend audio in the background; pick it back up on return.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && audioOn && audio) { unlockMedia(true); audio.start(); }
  });

  window.Garden = {
    burst,
    addSpark,
    toggleAudio,
    celebrate() {
      if (!audio) audio = createAudio();
      if (audio) audio.celebrate();
    },
    get audioOn() { return audioOn; },
  };
})();
