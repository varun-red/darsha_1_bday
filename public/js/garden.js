/* =========================================================
   garden.js — the living backdrop
   Procedural hedges, distant trees and flower beds; a rose
   arch and string lights; a canvas of stars, fairy dust,
   butterflies and drifting petals; cursor sparkles, parallax
   and an optional ambient garden soundscape (Web Audio).
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

  const PASTELS = ['#f7a8bd', '#cdb8f6', '#fff0d2', '#f8c1a4', '#fff8f0', '#b9d8f6'];
  const PASTEL_DEEP = ['#d9678d', '#9a7fd6', '#e8c07a', '#e4895f', '#e2c9c9', '#7fa9dc'];

  // ---------- far layer: hazy hills and distant trees ----------
  function buildFar(svg) {
    if (!svg) return;
    const W = 1800, H = 600;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const r = rng(7);
    let out = `<defs>
      <linearGradient id="hillA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9c7ab0"/><stop offset="1" stop-color="#6b4f8a"/></linearGradient>
      <linearGradient id="hillB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7e5f98"/><stop offset="1" stop-color="#5a4586"/></linearGradient>
      <linearGradient id="farTree" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5c95"/><stop offset="1" stop-color="#4f3a72"/></linearGradient>
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
      <linearGradient id="hedgeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f8f62"/><stop offset="1" stop-color="#2a5a3f"/></linearGradient>
      <linearGradient id="topiaryGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5c9d6e"/><stop offset="1" stop-color="#2f6344"/></linearGradient>
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
        topi += `<path d="M${f1(x - 6)},${f1(H - 100)}L${f1(x - 5)},${f1(cy)}L${f1(x + 5)},${f1(cy)}L${f1(x + 6)},${f1(H - 100)}Z" fill="#2a4a36"/>`;
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
      <linearGradient id="stalkGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f7a55"/><stop offset="1" stop-color="#1f4f36"/></linearGradient>
      <linearGradient id="soilNear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6b49"/><stop offset="1" stop-color="#1c4a33"/></linearGradient>
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
    out += `<path d="${grass}" stroke="#1f4f36" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/>`;
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
      const c = Math.floor(r() * PASTELS.length);
      if (kind < 0.4) {
        // daisy-like: 6 petals + heart
        const pr = 6 + r() * 5;
        let petals = '';
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          petals += `<ellipse cx="${f1(topX + Math.cos(a) * pr)}" cy="${f1(topY + Math.sin(a) * pr)}" rx="${f1(pr * 0.55)}" ry="${f1(pr * 0.9)}" transform="rotate(${f1((a * 180) / Math.PI + 90)} ${f1(topX + Math.cos(a) * pr)} ${f1(topY + Math.sin(a) * pr)})"/>`;
        }
        blooms += `<g fill="${PASTELS[c]}">${petals}</g><circle cx="${f1(topX)}" cy="${f1(topY)}" r="${f1(pr * 0.5)}" fill="#f0c37a"/>`;
      } else if (kind < 0.7) {
        // lavender spike
        let spike = '';
        for (let k = 0; k < 6; k++) spike += `<ellipse cx="${f1(topX + (k % 2 ? 5 : -5))}" cy="${f1(topY + k * 9)}" rx="5" ry="6.5"/>`;
        blooms += `<g fill="${k2(c)}">${spike}</g>`;
      } else {
        // round bloom (rose/peony)
        const br = 8 + r() * 8;
        blooms += `<circle cx="${f1(topX)}" cy="${f1(topY)}" r="${f1(br)}" fill="${PASTELS[c]}"/><circle cx="${f1(topX - br * 0.15)}" cy="${f1(topY - br * 0.15)}" r="${f1(br * 0.5)}" fill="${PASTEL_DEEP[c]}" opacity=".5"/>`;
      }
    }
    out += `<path d="${stalks}" stroke="url(#stalkGrad)" stroke-width="3.5" fill="#2f6b49" stroke-linecap="round"/>`;
    out += blooms;
    svg.innerHTML = out;
  }
  function k2(c) { return c === 1 ? '#b39ae6' : c === 5 ? '#9fc3ea' : '#c8b3f5'; }

  // ---------- string lights ----------
  function buildLights(svg) {
    if (!svg) return;
    const W = 1000, H = 200;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const r = rng(5);
    const q = (p0, p1, p2, t) => ({
      x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
      y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y,
    });
    let out = `<defs><filter id="bulbGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4"/></filter></defs>`;
    const strands = [
      { p0: { x: -20, y: 10 }, p1: { x: 420, y: 150 }, p2: { x: 1020, y: 30 }, n: 16 },
      { p0: { x: -20, y: 40 }, p1: { x: 620, y: 190 }, p2: { x: 1020, y: 70 }, n: 14 },
    ];
    for (const s of strands) {
      out += `<path d="M${s.p0.x} ${s.p0.y} Q${s.p1.x} ${s.p1.y} ${s.p2.x} ${s.p2.y}" stroke="#2a1d45" stroke-width="2" fill="none" opacity=".8"/>`;
      for (let i = 1; i < s.n; i++) {
        const t = i / s.n + (r() - 0.5) * 0.01;
        const p = q(s.p0, s.p1, s.p2, t);
        const col = pick(r, ['#ffe1a8', '#ffd3dc', '#fff0d2', '#e9dcff']);
        out += `<line x1="${f1(p.x)}" y1="${f1(p.y)}" x2="${f1(p.x)}" y2="${f1(p.y + 8)}" stroke="#2a1d45" stroke-width="2"/>`;
        out += `<g class="bulb" style="animation-delay:-${f1(r() * 3.2)}s">
          <circle cx="${f1(p.x)}" cy="${f1(p.y + 15)}" r="11" fill="${col}" opacity=".45" filter="url(#bulbGlow)"/>
          <circle cx="${f1(p.x)}" cy="${f1(p.y + 15)}" r="5" fill="${col}"/>
          <circle cx="${f1(p.x - 1.5)}" cy="${f1(p.y + 13)}" r="1.6" fill="#fff"/>
        </g>`;
      }
    }
    svg.innerHTML = out;
  }

  // ---------- rose arch ----------
  function buildArch(svg) {
    if (!svg) return;
    const r = rng(43);
    const cx = 450, cy = 380, R = 340;
    const left = cx - R, right = cx + R, base = 760;
    let out = `<defs>
      <linearGradient id="archWood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3f6b4f"/><stop offset=".5" stop-color="#5a8c68"/><stop offset="1" stop-color="#2f5e42"/></linearGradient>
      <radialGradient id="archRose" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#ffd9e2"/><stop offset=".65" stop-color="#f2a0b6"/><stop offset="1" stop-color="#d9678d"/></radialGradient>
      <radialGradient id="archPeony" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#fff8f0"/><stop offset=".7" stop-color="#ffd3dc"/><stop offset="1" stop-color="#e9a3b5"/></radialGradient>
      <radialGradient id="archLilac" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#efe6ff"/><stop offset=".7" stop-color="#c8b3f5"/><stop offset="1" stop-color="#9a7fd6"/></radialGradient>
      <radialGradient id="archGold" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#fff6d6"/><stop offset=".7" stop-color="#ffe1a8"/><stop offset="1" stop-color="#e0a94c"/></radialGradient>
    </defs>`;
    const archPath = `M${left} ${base} V${cy} A${R} ${R} 0 0 1 ${right} ${cy} V${base}`;
    out += `<path d="${archPath}" stroke="#22432f" stroke-width="22" fill="none" stroke-linecap="round" opacity=".9"/>`;
    out += `<path d="${archPath}" stroke="url(#archWood)" stroke-width="14" fill="none" stroke-linecap="round"/>`;
    out += `<path d="${archPath}" stroke="#a7cfae" stroke-width="3" fill="none" stroke-dasharray="14 18" opacity=".45"/>`;
    // lattice inside the pillars
    for (const px of [left, right]) {
      for (let y = cy + 20; y < base - 30; y += 46) {
        out += `<path d="M${px - 18} ${y} L${px + 18} ${y + 34} M${px + 18} ${y} L${px - 18} ${y + 34}" stroke="#3f6b4f" stroke-width="4" opacity=".7" stroke-linecap="round"/>`;
      }
    }
    // sample points along the arch for foliage & blooms
    const pts = [];
    for (let y = base - 30; y > cy; y -= 34) { pts.push({ x: left, y, t: 0 }); pts.push({ x: right, y, t: 0 }); }
    for (let a = Math.PI; a >= 0; a -= Math.PI / 26) pts.push({ x: cx + Math.cos(a) * R, y: cy - Math.sin(a) * R, t: 1 });
    const fills = ['url(#archRose)', 'url(#archPeony)', 'url(#archLilac)', 'url(#archGold)', 'url(#archRose)'];
    let leaves = '';
    let roses = '';
    let wisteria = '';
    for (const p of pts) {
      const n = 2 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const ang = r() * 360;
        const lx = p.x + (r() - 0.5) * 34;
        const ly = p.y + (r() - 0.5) * 30;
        leaves += `<ellipse cx="${f1(lx)}" cy="${f1(ly)}" rx="7" ry="14" transform="rotate(${f1(ang)} ${f1(lx)} ${f1(ly)})" fill="${r() < 0.5 ? '#4d8f62' : '#6fae7f'}"/>`;
      }
      if (r() < 0.75) {
        const rr = 9 + r() * 9;
        const rx = p.x + (r() - 0.5) * 26;
        const ry = p.y + (r() - 0.5) * 26;
        roses += `<circle cx="${f1(rx)}" cy="${f1(ry)}" r="${f1(rr)}" fill="${pick(r, fills)}"/><circle cx="${f1(rx - rr * 0.15)}" cy="${f1(ry - rr * 0.1)}" r="${f1(rr * 0.42)}" fill="rgba(217,103,141,.28)"/>`;
      }
      if (p.t === 1 && r() < 0.35 && p.y < cy - 60) {
        const n2 = 4 + Math.floor(r() * 5);
        for (let k = 0; k < n2; k++) {
          const wx = p.x + (r() - 0.5) * 8 + Math.sin(k) * 3;
          const wy = p.y + 18 + k * 11;
          wisteria += `<circle cx="${f1(wx)}" cy="${f1(wy)}" r="${f1(6 - k * 0.4)}" fill="${k % 2 ? '#c8b3f5' : '#b39ae6'}" opacity=".95"/>`;
        }
      }
    }
    out += `<g>${leaves}</g><g>${wisteria}</g><g>${roses}</g>`;
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
    const fills = ['#f7a8bd', '#ffd3dc', '#cdb8f6', '#fff0d2'];
    for (const p of pts) {
      const n = 1 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const ang = r() * 360;
        const lx = p.x + (r() - 0.5) * 30;
        const ly = p.y + (r() - 0.5) * 26;
        leaves += `<ellipse cx="${f1(lx)}" cy="${f1(ly)}" rx="6" ry="12" transform="rotate(${f1(ang)} ${f1(lx)} ${f1(ly)})" fill="${r() < 0.5 ? '#4d8f62' : '#6fae7f'}"/>`;
      }
      if (r() < 0.55) {
        const rr = 6 + r() * 7;
        const rx = p.x + (r() - 0.5) * 22;
        const ry = p.y + (r() - 0.5) * 22;
        roses += `<circle cx="${f1(rx)}" cy="${f1(ry)}" r="${f1(rr)}" fill="${pick(r, fills)}"/><circle cx="${f1(rx - rr * 0.15)}" cy="${f1(ry - rr * 0.1)}" r="${f1(rr * 0.4)}" fill="rgba(217,103,141,.3)"/>`;
      }
    }
    group.innerHTML = leaves + roses;
  }
  buildTrellisVines(document.getElementById('trellisVines'));

  buildFar(document.getElementById('gardenFar'));
  buildMid(document.getElementById('gardenMid'));
  buildNear(document.getElementById('gardenNear'));
  buildLights(document.getElementById('stringLights'));
  buildArch(document.getElementById('roseArch'));

  // ---------- parallax ----------
  const layers = Array.from(document.querySelectorAll('.hero__layer, .hero__arch'));
  const moon = document.querySelector('.hero__moon');
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
    if (moon) moon.style.translate = `${(-curX * 14).toFixed(1)}px ${(s * 0.35 - curY * 8).toFixed(1)}px`;
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
    ['#f7a8bd', '#d9678d'], ['#cdb8f6', '#9a7fd6'], ['#ffe1a8', '#e0a94c'], ['#b9d8f6', '#7fa9dc'], ['#fff8f0', '#e2c9c9'], ['#f8c1a4', '#e4895f'],
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
    const n = Math.floor((W * H) / (isSmall ? 12000 : 8500));
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
      color: c < 0.5 ? '#f7a8bd' : c < 0.75 ? '#ffd3dc' : c < 0.9 ? '#fff8f0' : '#cdb8f6',
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
    glow(0, 0, b.size * 2.2, '255,225,200', 0.12);
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
    ctx.fillStyle = '#3a2545';
    ctx.beginPath();
    ctx.ellipse(0, 0.1 * b.size, b.size * 0.12, b.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2545';
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

      // shooting star
      if (!reduceMotion) {
        if (!shooting && Math.random() < 0.002 && scrollFade > 0.5) {
          shooting = { x: Math.random() * W * 0.8, y: Math.random() * H * 0.25, vx: 8 + Math.random() * 5, vy: 2.5 + Math.random() * 2, life: 1 };
        }
        if (shooting) {
          shooting.x += shooting.vx * dt;
          shooting.y += shooting.vy * dt;
          shooting.life -= 0.02 * dt;
          const grad = ctx.createLinearGradient(shooting.x, shooting.y, shooting.x - shooting.vx * 10, shooting.y - shooting.vy * 10);
          grad.addColorStop(0, `rgba(255,246,236,${shooting.life})`);
          grad.addColorStop(1, 'rgba(255,246,236,0)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(shooting.x, shooting.y);
          ctx.lineTo(shooting.x - shooting.vx * 10, shooting.y - shooting.vy * 10);
          ctx.stroke();
          if (shooting.life <= 0 || shooting.x > W + 50) shooting = null;
        }
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
        glow(f.x, f.y, f.r * 8, '255,225,168', a * 0.5);
        ctx.fillStyle = `rgba(255,246,236,${a})`;
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
        ctx.fillStyle = `rgba(255,250,240,${a})`;
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
      rgb: opts.rgb ?? (Math.random() < 0.7 ? '255,225,168' : '247,168,189'),
    });
  }

  function burst(x, y, n = 42) {
    const colors = ['255,225,168', '247,168,189', '205,184,246', '255,248,240', '185,216,246'];
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
        ctxA.resume();
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

  let audioOn = false;
  function toggleAudio(force) {
    audioOn = typeof force === 'boolean' ? force : !audioOn;
    if (!audio) audio = createAudio();
    if (!audio) return false;
    if (audioOn) audio.start(); else audio.stop();
    return audioOn;
  }

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
