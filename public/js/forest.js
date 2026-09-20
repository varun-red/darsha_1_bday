/* =========================================================
   forest.js — the living backdrop
   Procedural tree silhouettes, a canvas of stars / fireflies /
   spores, cursor sparkles, parallax and an optional ambient
   soundscape synthesised with the Web Audio API.
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

  // ---------- procedural trees ----------
  function pinePath(x, baseY, h, w, tiers, r) {
    const pts = [];
    const top = baseY - h;
    pts.push([x, top]);
    for (let i = 1; i <= tiers; i++) {
      const t = i / tiers;
      const y = top + h * 0.82 * t;
      const half = (w / 2) * (0.25 + 0.75 * t) * (0.9 + r() * 0.2);
      pts.push([x + half, y + r() * 6]);
      if (i < tiers) pts.push([x + half * 0.55, y + h * 0.04]);
    }
    const trunkW = Math.max(3, w * 0.08);
    pts.push([x + trunkW, baseY - h * 0.18], [x + trunkW, baseY]);
    pts.push([x - trunkW, baseY], [x - trunkW, baseY - h * 0.18]);
    for (let i = tiers; i >= 1; i--) {
      const t = i / tiers;
      const y = top + h * 0.82 * t;
      const half = (w / 2) * (0.25 + 0.75 * t) * (0.9 + r() * 0.2);
      if (i < tiers) pts.push([x - half * 0.55, y + h * 0.04]);
      pts.push([x - half, y + r() * 6]);
    }
    return 'M' + pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join('L') + 'Z';
  }

  function roundTree(x, baseY, h, w, r) {
    const trunkW = Math.max(4, w * 0.1);
    const cy = baseY - h * 0.62;
    const blobs = 4 + Math.floor(r() * 3);
    let d = `M${x - trunkW},${baseY}L${x - trunkW * 0.7},${cy}L${x + trunkW * 0.7},${cy}L${x + trunkW},${baseY}Z`;
    for (let i = 0; i < blobs; i++) {
      const bx = x + (r() - 0.5) * w * 0.7;
      const by = cy - r() * h * 0.28;
      const br = w * (0.22 + r() * 0.2);
      // Same (clockwise) winding as the pine polygons so overlaps never punch holes.
      d += ` M${bx - br},${by}a${br},${br} 0 1,1 ${br * 2},0a${br},${br} 0 1,1 ${-br * 2},0`;
    }
    return d;
  }

  function buildLayer(svg, { seed, count, minH, maxH, colorA, colorB, roundRatio = 0.25 }) {
    if (!svg) return;
    const W = 1800;
    const H = 700;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const r = rng(seed);
    const gradId = `g${seed}`;
    let out = `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${colorA}"/><stop offset="1" stop-color="${colorB}"/></linearGradient></defs>`;
    let d = '';
    for (let i = 0; i < count; i++) {
      const x = (i / count) * W + (r() - 0.5) * (W / count) * 1.2;
      const h = minH + r() * (maxH - minH);
      const w = h * (0.32 + r() * 0.22);
      const baseY = H + 6 + r() * 14;
      d += r() < roundRatio ? roundTree(x, baseY, h * 0.75, w * 1.4, r) : pinePath(x, baseY, h, w, 5 + Math.floor(r() * 4), r);
    }
    out += `<path d="${d}" fill="url(#${gradId})"/>`;
    svg.innerHTML = out;
  }

  buildLayer(document.getElementById('treesFar'), { seed: 11, count: 34, minH: 220, maxH: 420, colorA: '#1d5a45', colorB: '#0f3a2c', roundRatio: 0.35 });
  buildLayer(document.getElementById('treesMid'), { seed: 23, count: 26, minH: 280, maxH: 520, colorA: '#123d2d', colorB: '#0a271d', roundRatio: 0.25 });
  buildLayer(document.getElementById('treesNear'), { seed: 37, count: 18, minH: 320, maxH: 620, colorA: '#08201a', colorB: '#040d0a', roundRatio: 0.15 });

  // ---------- parallax ----------
  const layers = Array.from(document.querySelectorAll('.hero__layer'));
  const moon = document.querySelector('.hero__moon');
  const hero = document.getElementById('hero');
  let targetX = 0;
  let targetY = 0;
  let curX = 0;
  let curY = 0;
  let scrollY = 0;

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
      layer.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`;
    }
    if (moon) moon.style.translate = `${(-curX * 18).toFixed(1)}px ${(s * 0.35 - curY * 10).toFixed(1)}px`;
  }

  // ---------- canvas ----------
  const canvas = document.getElementById('sky');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let W = 0;
  let H = 0;
  let dpr = 1;
  const stars = [];
  const fireflies = [];
  const spores = [];
  const sparks = [];
  const pointer = { x: -9999, y: -9999, active: false, lastSpark: 0 };
  let shooting = null;

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
    const n = Math.floor((W * H) / (isSmall ? 9000 : 6500));
    for (let i = 0; i < n; i++) {
      stars.push({ x: r() * W, y: r() * H * 0.75, s: 0.4 + r() * 1.4, p: r() * Math.PI * 2, sp: 0.4 + r() * 1.4, tint: r() });
    }
  }

  function seedFireflies() {
    fireflies.length = 0;
    const n = reduceMotion ? 0 : isSmall ? 26 : 60;
    for (let i = 0; i < n; i++) {
      fireflies.push({
        x: Math.random() * W,
        y: H * 0.25 + Math.random() * H * 0.8,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        p: Math.random() * Math.PI * 2,
        sp: 0.6 + Math.random() * 1.4,
        r: 1.4 + Math.random() * 1.8,
        hue: Math.random() < 0.85 ? 48 : 95,
      });
    }
    spores.length = 0;
    const m = reduceMotion ? 0 : isSmall ? 18 : 40;
    for (let i = 0; i < m; i++) spores.push(newSpore(true));
  }

  function newSpore(anywhere) {
    return { x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10, vy: 0.15 + Math.random() * 0.35, drift: Math.random() * Math.PI * 2, r: 0.6 + Math.random() * 1.2, a: 0.15 + Math.random() * 0.3 };
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

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(50, now - last) / 16.67;
    last = now;
    if (!document.hidden && ctx) {
      ctx.clearRect(0, 0, W, H);
      const t = now / 1000;
      const scrollFade = Math.max(0, 1 - scrollY / (H * 1.2));

      // stars
      for (const s of stars) {
        const tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.p);
        const depthFade = 1 - s.y / (H * 0.8);
        const a = tw * depthFade * (0.4 + scrollFade * 0.6);
        ctx.fillStyle = s.tint > 0.9 ? `rgba(244,182,194,${a})` : s.tint > 0.8 ? `rgba(201,184,255,${a})` : `rgba(255,248,225,${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y - scrollY * 0.15, s.s, 0, Math.PI * 2);
        ctx.fill();
        if (s.s > 1.5 && tw > 0.9) glow(s.x, s.y - scrollY * 0.15, s.s * 5, '255,240,200', 0.18 * scrollFade);
      }

      // shooting star
      if (!reduceMotion) {
        if (!shooting && Math.random() < 0.0025 && scrollFade > 0.5) {
          shooting = { x: Math.random() * W * 0.8, y: Math.random() * H * 0.3, vx: 8 + Math.random() * 5, vy: 3 + Math.random() * 2, life: 1 };
        }
        if (shooting) {
          shooting.x += shooting.vx * dt;
          shooting.y += shooting.vy * dt;
          shooting.life -= 0.02 * dt;
          const grad = ctx.createLinearGradient(shooting.x, shooting.y, shooting.x - shooting.vx * 10, shooting.y - shooting.vy * 10);
          grad.addColorStop(0, `rgba(255,248,225,${shooting.life})`);
          grad.addColorStop(1, 'rgba(255,248,225,0)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(shooting.x, shooting.y);
          ctx.lineTo(shooting.x - shooting.vx * 10, shooting.y - shooting.vy * 10);
          ctx.stroke();
          if (shooting.life <= 0 || shooting.x > W + 50) shooting = null;
        }
      }

      // spores
      for (let i = 0; i < spores.length; i++) {
        const s = spores[i];
        s.y -= s.vy * dt;
        s.drift += 0.01 * dt;
        s.x += Math.sin(s.drift) * 0.3 * dt;
        if (s.y < -10) spores[i] = newSpore(false);
        ctx.fillStyle = `rgba(200,240,210,${s.a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // fireflies
      for (const f of fireflies) {
        f.p += 0.03 * f.sp * dt;
        f.vx += (Math.random() - 0.5) * 0.06 * dt;
        f.vy += (Math.random() - 0.5) * 0.06 * dt;
        if (pointer.active) {
          const dx = pointer.x - f.x;
          const dy = pointer.y - f.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 260 * 260 && d2 > 40 * 40) {
            const d = Math.sqrt(d2);
            f.vx += (dx / d) * 0.05 * dt;
            f.vy += (dy / d) * 0.05 * dt;
          } else if (d2 <= 40 * 40) {
            f.vx -= dx * 0.004 * dt;
            f.vy -= dy * 0.004 * dt;
          }
        }
        const speed = Math.hypot(f.vx, f.vy);
        const maxS = 1.2;
        if (speed > maxS) { f.vx = (f.vx / speed) * maxS; f.vy = (f.vy / speed) * maxS; }
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.x < -20) f.x = W + 20; else if (f.x > W + 20) f.x = -20;
        if (f.y < -20) f.y = H + 20; else if (f.y > H + 20) f.y = -20;
        const pulse = Math.pow((Math.sin(f.p) + 1) / 2, 2.2);
        const a = 0.15 + pulse * 0.85;
        const rgb = f.hue === 48 ? '255,220,120' : '190,255,160';
        glow(f.x, f.y, f.r * 9, rgb, a * 0.55);
        ctx.fillStyle = `rgba(${f.hue === 48 ? '255,246,200' : '230,255,220'},${a})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
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
        ctx.fillStyle = `rgba(255,250,230,${a})`;
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
      rgb: opts.rgb ?? (Math.random() < 0.8 ? '255,220,120' : '244,182,194'),
    });
  }

  function burst(x, y, n = 42) {
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const sp = 1.5 + Math.random() * 3.5;
      sparks.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1, g: 0.05, r: 1.5 + Math.random() * 2, life: 1, decay: 0.012 + Math.random() * 0.012, rgb: ['255,220,120', '244,182,194', '201,184,255', '190,255,160'][i % 4] });
    }
  }

  if (canvas) {
    resize();
    seedFireflies();
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

    // wind: filtered noise with slow LFO
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
    nf.frequency.value = 420;
    nf.Q.value = 0.6;
    const ng = ctxA.createGain();
    ng.gain.value = 0.12;
    const lfo = ctxA.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoG = ctxA.createGain();
    lfoG.gain.value = 0.07;
    lfo.connect(lfoG).connect(ng.gain);
    noise.connect(nf).connect(ng).connect(master);
    noise.start();
    lfo.start();

    // pad: two detuned triangles
    const pad = ctxA.createGain();
    pad.gain.value = 0.05;
    const pf = ctxA.createBiquadFilter();
    pf.type = 'lowpass';
    pf.frequency.value = 600;
    for (const [freq, det] of [[130.81, -4], [196.0, 5], [261.63, -2]]) {
      const o = ctxA.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq;
      o.detune.value = det;
      o.connect(pf);
      o.start();
    }
    pf.connect(pad).connect(master);

    // chimes
    let timer = null;
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
    function scheduleChime() {
      chime(PENTA[Math.floor(Math.random() * PENTA.length)], 0, 0.08 + Math.random() * 0.08);
      timer = setTimeout(scheduleChime, 1800 + Math.random() * 4200);
    }
    return {
      ctx: ctxA,
      master,
      start() {
        ctxA.resume();
        master.gain.cancelScheduledValues(ctxA.currentTime);
        master.gain.linearRampToValueAtTime(0.9, ctxA.currentTime + 1.5);
        if (!timer) scheduleChime();
      },
      stop() {
        master.gain.cancelScheduledValues(ctxA.currentTime);
        master.gain.linearRampToValueAtTime(0, ctxA.currentTime + 0.8);
        clearTimeout(timer);
        timer = null;
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

  window.Forest = {
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
