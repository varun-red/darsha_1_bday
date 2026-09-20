/* =========================================================
   main.js — page behaviour: content binding, countdown,
   RSVP flow, wishing tree, FAQ, modal & scroll effects
   ========================================================= */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const tokenMatch = location.pathname.match(/^\/i\/([A-Za-z0-9_-]+)/);
  let token = tokenMatch ? tokenMatch[1] : new URLSearchParams(location.search).get('i');
  let event = null;
  let guest = null;

  // ---------- curtain ----------
  const curtain = $('#curtain');
  const openCurtain = () => curtain && curtain.classList.add('is-open');
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(openCurtain, 500));
  setTimeout(openCurtain, 1800);

  // ---------- topbar ----------
  const topbar = $('#topbar');
  const onScroll = () => topbar.classList.toggle('is-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- sound ----------
  const soundBtn = $('#soundToggle');
  soundBtn?.addEventListener('click', () => {
    const on = window.Forest?.toggleAudio();
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    toast(on ? '🎶 Forest sounds on' : 'Forest sounds off');
  });

  // ---------- reveal on scroll ----------
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -5% 0px' }
  );
  const observeReveals = () => $$('.reveal:not(.is-visible)').forEach((el) => io.observe(el));
  observeReveals();

  // card glow follows the pointer
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest?.('.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  });

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2800);
  }

  // ---------- data binding ----------
  function bind(data) {
    $$('[data-bind]').forEach((el) => {
      const key = el.dataset.bind;
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') el.textContent = data[key];
    });
  }

  function fmtDeadline(iso) {
    if (!iso) return '';
    const d = new Date(`${iso}T12:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }

  function fmtEnd(ev) {
    if (!ev.event_end_utc || !ev.event_start_utc) return '';
    try {
      const end = new Date(ev.event_end_utc).toLocaleTimeString('en-US', { timeZone: ev.timezone, hour: 'numeric', minute: '2-digit' });
      return `until around ${end}`;
    } catch {
      return '';
    }
  }

  function renderEvent(ev) {
    document.title = `${ev.child_name} Turns One · An Enchanted Forest Birthday`;
    bind(ev);
    $('#detailsEnd').textContent = fmtEnd(ev);
    $('#rsvpDeadline').textContent = fmtDeadline(ev.rsvp_deadline);
    $('#mapsLink').href = ev.maps_url;
    $('#gcalLink').href = ev.google_calendar_url;
    $('#successGcal').href = ev.google_calendar_url;
    const reg = $('#registryLink');
    if (ev.registry_url) { reg.href = ev.registry_url; reg.hidden = false; }
    const contact = [];
    if (ev.host_phone) contact.push(`<a href="tel:${esc(ev.host_phone.replace(/\s+/g, ''))}">${esc(ev.host_phone)}</a>`);
    if (ev.host_email) contact.push(`<a href="mailto:${esc(ev.host_email)}">${esc(ev.host_email)}</a>`);
    $('#footerContact').innerHTML = contact.length ? `Questions? Reach us at ${contact.join(' · ')}` : '';

    // schedule
    $('#schedule').innerHTML = (ev.schedule || [])
      .map(
        (s, i) => `<li class="stop reveal">
          <div class="stop__dot" aria-hidden="true">${i + 1}</div>
          <div class="stop__body">
            <div class="stop__time">${esc(s.time)}</div>
            <h3 class="stop__title">${esc(s.title)}</h3>
            <p class="stop__detail">${esc(s.detail)}</p>
          </div></li>`
      )
      .join('');

    // milestones
    const icons = ['🌱', '🌿', '🍄', '🦋', '🌸', '✨', '🌙', '🐇'];
    $('#milestones').innerHTML = (ev.milestones || [])
      .map(
        (m, i) => `<article class="mile" style="--tilt:${(i % 2 ? 1 : -1) * (1 + (i % 3) * 0.6)}deg">
          <div class="mile__photo">${m.photo_url ? `<img src="${esc(m.photo_url)}" alt="${esc(m.title)}" loading="lazy" />` : icons[i % icons.length]}</div>
          <div class="mile__month">${esc(m.month)}</div>
          <h3 class="mile__title">${esc(m.title)}</h3>
          <p class="mile__detail">${esc(m.detail)}</p>
        </article>`
      )
      .join('');

    // faq
    $('#faqList').innerHTML = (ev.faq || [])
      .map((f) => `<details class="faq__item"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
      .join('');

    observeReveals();
    startCountdown(ev.event_start_utc, ev.event_end_utc);
  }

  // ---------- countdown ----------
  let cdTimer;
  function startCountdown(startIso, endIso) {
    clearInterval(cdTimer);
    const start = new Date(startIso).getTime();
    const end = endIso ? new Date(endIso).getTime() : start + 4 * 3600 * 1000;
    const nums = Object.fromEntries($$('[data-count]').map((el) => [el.dataset.count, el]));
    const grid = $('#countdownGrid');
    const done = $('#countdownDone');
    const tick = () => {
      const now = Date.now();
      if (Number.isNaN(start)) return;
      if (now >= start && now <= end) {
        grid.hidden = true;
        done.hidden = false;
        done.textContent = '🎉 The forest is celebrating right now!';
        return;
      }
      if (now > end) {
        grid.hidden = true;
        done.hidden = false;
        done.textContent = '🌙 The party has ended — thank you for the magic!';
        return;
      }
      let diff = Math.floor((start - now) / 1000);
      const d = Math.floor(diff / 86400); diff -= d * 86400;
      const h = Math.floor(diff / 3600); diff -= h * 3600;
      const m = Math.floor(diff / 60);
      const s = diff - m * 60;
      const set = (el, v) => { const t = String(v).padStart(2, '0'); if (el.textContent !== t) el.textContent = t; };
      set(nums.days, d); set(nums.hours, h); set(nums.minutes, m); set(nums.seconds, s);
    };
    tick();
    cdTimer = setInterval(tick, 1000);
  }

  // ---------- RSVP ----------
  const form = $('#rsvpForm');
  const attendingFields = $('#attendingFields');
  const existing = $('#rsvpExisting');
  const success = $('#rsvpSuccess');
  const errorEl = $('#rsvpError');

  function setAttending(val) {
    const yes = val === 'yes';
    attendingFields.classList.toggle('is-collapsed', !yes);
    $('#rsvpSubmit span').textContent = yes ? "Send my RSVP ✨" : val === 'no' ? 'Send our love 🌙' : 'Send my RSVP';
  }
  $$('input[name="attending"]', form).forEach((r) => r.addEventListener('change', () => setAttending(r.value)));
  setAttending(null);

  $$('[data-stepper]').forEach((st) => {
    const input = $('input', st);
    $$('.stepper__btn', st).forEach((b) =>
      b.addEventListener('click', () => {
        const v = (parseInt(input.value, 10) || 0) + parseInt(b.dataset.step, 10);
        input.value = Math.min(Number(input.max), Math.max(Number(input.min), v));
        window.Forest?.addSpark?.(b.getBoundingClientRect().left + 22, b.getBoundingClientRect().top + 22, { spread: 2, lift: 1 });
      })
    );
  });

  function fillFromGuest(g) {
    if (!g) return;
    $('#rsvpToken').value = g.token || '';
    if (g.name) $('#rsvpName').value = g.name;
    if (g.email) $('#rsvpEmail').value = g.email;
    if (g.phone) $('#rsvpPhone').value = g.phone;
    if (g.rsvp) {
      const r = g.rsvp;
      const radio = $(`input[name="attending"][value="${r.attending ? 'yes' : 'no'}"]`, form);
      if (radio) { radio.checked = true; setAttending(radio.value); }
      $('#rsvpAdults').value = r.adults || 1;
      $('#rsvpChildren').value = r.children || 0;
      $('#rsvpPartyNames').value = r.party_names || '';
      $('#rsvpDietary').value = r.dietary || '';
      $('#rsvpHighchair').checked = !!r.needs_highchair;
      $('#rsvpSong').value = r.song_request || '';
      $('#rsvpMessage').value = r.message || '';
      $('#rsvpShareWish').checked = false;
    }
    if (g.max_party) { $('#rsvpAdults').max = g.max_party; $('#rsvpChildren').max = g.max_party; }
  }

  function showGreeting(g) {
    const greet = $('#greeting');
    if (!g) return;
    const first = g.household || g.name;
    greet.innerHTML = `Dear <strong>${esc(first)}</strong>, you are warmly invited`;
    greet.hidden = false;
    $('#rsvpLede').textContent = `${first}, we would be overjoyed to have you with us. Let us know below!`;
    if (g.rsvp) {
      existing.hidden = false;
      $('#rsvpExistingText').textContent = g.rsvp.attending
        ? `You've RSVP'd yes for ${g.rsvp.adults} grown-up${g.rsvp.adults === 1 ? '' : 's'}${g.rsvp.children ? ` and ${g.rsvp.children} little one${g.rsvp.children === 1 ? '' : 's'}` : ''}. We can't wait!`
        : "You've let us know you can't make it. We'll miss you!";
    }
  }

  $('#rsvpEditBtn')?.addEventListener('click', () => {
    existing.hidden = true;
    $('#rsvpName').focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const attending = form.attending.value;
    if (!attending) return showError('Please tell us whether you can come 🌿');
    if (!form.name.value.trim()) return showError('Please tell us your name.');
    if (!form.email.value.trim() && !form.phone.value.trim()) return showError('Share an email or phone so we can reach you.');

    const payload = {
      token: form.token.value || token || undefined,
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      attending: attending === 'yes',
      adults: form.adults.value,
      children: form.children.value,
      party_names: form.party_names.value,
      dietary: form.dietary.value,
      needs_highchair: form.needs_highchair.checked,
      song_request: form.song_request.value,
      message: form.message.value,
      wish: $('#rsvpShareWish').checked && form.message.value.trim() ? form.message.value.trim() : undefined,
    };
    const btn = $('#rsvpSubmit');
    btn.disabled = true;
    try {
      const res = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      guest = data.guest;
      token = guest.token;
      if (!location.pathname.startsWith(`/i/${token}`)) history.replaceState(null, '', `/i/${token}`);
      showSuccess(guest);
      if (payload.wish) loadWishes();
    } catch (err) {
      showError(err.message);
    } finally {
      btn.disabled = false;
    }
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
    errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showSuccess(g) {
    form.hidden = true;
    existing.hidden = true;
    success.hidden = false;
    const first = g.household || g.name;
    const att = g.rsvp?.attending;
    $('#successTitle').textContent = att ? `See you in the forest, ${first}!` : `Thank you, ${first}`;
    $('#successText').textContent = att
      ? `We've saved ${g.rsvp.adults} grown-up seat${g.rsvp.adults === 1 ? '' : 's'}${g.rsvp.children ? ` and ${g.rsvp.children} tiny toadstool${g.rsvp.children === 1 ? '' : 's'}` : ''} for you. Keep an eye on your ${g.email ? 'inbox' : 'phone'} for updates.`
      : "We're sad you can't make it, but so grateful you let us know. Sending fireflies your way.";
    $('#rsvpSuccess .rsvp__success-art').textContent = att ? '🍄✨' : '🌙💛';
    const link = `${location.origin}/i/${g.token}`;
    const a = $('#successLink');
    a.href = link;
    a.textContent = link;
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const r = success.getBoundingClientRect();
    setTimeout(() => {
      window.Forest?.burst(r.left + r.width / 2, Math.max(120, r.top + 60), 60);
      if (att) leafShower();
      window.Forest?.celebrate?.();
    }, 350);
  }

  $('#successEdit')?.addEventListener('click', () => {
    success.hidden = true;
    form.hidden = false;
    fillFromGuest(guest);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#successCopy')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('#successLink').href);
      toast('Link copied ✨');
    } catch {
      toast('Copy failed — long-press the link instead');
    }
  });

  function leafShower() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#e8c46a', '#f4b6c2', '#6fae8a', '#c9b8ff', '#ffe29a'];
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('i');
      el.className = 'burst' + (i % 3 === 0 ? ' leaf' : '');
      const x = Math.random() * window.innerWidth;
      el.style.left = `${x}px`;
      el.style.top = `-20px`;
      el.style.background = colors[i % colors.length];
      el.style.width = el.style.height = `${6 + Math.random() * 10}px`;
      el.style.setProperty('--dx', `${(Math.random() - 0.5) * 240}px`);
      el.style.setProperty('--dy', `${window.innerHeight * (0.6 + Math.random() * 0.6)}px`);
      el.style.setProperty('--rot', `${Math.random() * 720}deg`);
      el.style.animationDuration = `${2 + Math.random() * 2}s`;
      el.style.animationDelay = `${Math.random() * 0.8}s`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 5000);
    }
  }

  // ---------- lookup modal ----------
  const modal = $('#lookupModal');
  const openModal = () => { modal.hidden = false; $('input', modal).focus(); };
  const closeModal = () => { modal.hidden = true; };
  $('#lookupOpen').addEventListener('click', openModal);
  $$('[data-close]', modal).forEach((el) => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
  $('#lookupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const err = $('#lookupError');
    err.hidden = true;
    try {
      const res = await fetch('/api/rsvp/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: f.email.value, phone: f.phone.value }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      location.href = `/i/${data.guest.token}#rsvp`;
    } catch (ex) {
      err.textContent = ex.message || 'Not found.';
      err.hidden = false;
    }
  });

  // ---------- wishing tree ----------
  const CANOPY = [
    { cx: 400, cy: 230, r: 175 }, { cx: 260, cy: 290, r: 115 }, { cx: 545, cy: 280, r: 125 },
    { cx: 330, cy: 150, r: 95 }, { cx: 480, cy: 140, r: 100 }, { cx: 400, cy: 330, r: 105 },
  ];
  function lanternPos(id) {
    let s = (id * 2654435761) >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const c = CANOPY[Math.floor(rnd() * CANOPY.length)];
    const ang = rnd() * Math.PI * 2;
    const rad = Math.sqrt(rnd()) * c.r * 0.88;
    return { x: ((c.cx + Math.cos(ang) * rad) / 800) * 100, y: ((c.cy + Math.sin(ang) * rad) / 640) * 100 };
  }

  function renderWishes(wishes) {
    const lanterns = $('#lanterns');
    const list = $('#wishList');
    if (!wishes.length) {
      lanterns.innerHTML = `<p class="tree__empty">The tree is waiting for its very first wish…</p>`;
      list.innerHTML = '';
      return;
    }
    lanterns.innerHTML = wishes
      .slice(0, 80)
      .map((w, i) => {
        const p = lanternPos(w.id);
        const side = p.x < 22 ? 'tip-left' : p.x > 78 ? 'tip-right' : '';
        return `<button type="button" class="lantern ${side}" style="left:${p.x.toFixed(1)}%;top:${p.y.toFixed(1)}%;--dur:${(3 + (w.id % 5) * 0.5).toFixed(1)}s;--delay:-${(w.id % 7)}s;--pop:${Math.min(i, 20) * 0.05}s" aria-label="Wish from ${esc(w.author)}">
          <span class="lantern__tip"><strong>${esc(w.author)}</strong>${esc(w.text)}</span>
        </button>`;
      })
      .join('');
    list.innerHTML = wishes
      .map((w) => `<li class="wish"><p class="wish__text">“${esc(w.text)}”</p><p class="wish__author">— ${esc(w.author)}</p></li>`)
      .join('');
    $$('.lantern', lanterns).forEach((l) =>
      l.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = l.classList.contains('is-open');
        $$('.lantern.is-open', lanterns).forEach((o) => o.classList.remove('is-open'));
        if (!open) l.classList.add('is-open');
      })
    );
  }
  document.addEventListener('click', () => $$('.lantern.is-open').forEach((o) => o.classList.remove('is-open')));

  async function loadWishes() {
    try {
      const res = await fetch('/api/wishes');
      const data = await res.json();
      renderWishes(data.wishes || []);
    } catch {
      /* the tree simply stays quiet */
    }
  }

  $('#wishForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#wishError');
    err.hidden = true;
    const text = $('#wishText').value.trim();
    if (!text) { err.textContent = 'Whisper a wish first!'; err.hidden = false; return; }
    const author = $('#wishAuthor').value.trim() || guest?.name || $('#rsvpName').value.trim() || 'A forest friend';
    try {
      const res = await fetch('/api/wishes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author, text, token }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      $('#wishText').value = '';
      await loadWishes();
      const tree = $('#tree').getBoundingClientRect();
      window.Forest?.burst(tree.left + tree.width / 2, Math.max(100, tree.top + tree.height * 0.35), 50);
      window.Forest?.celebrate?.();
      toast('Your wish is glowing on the tree ✨');
      $('#tree').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (ex) {
      err.textContent = ex.message || 'The wind carried your wish away — try again.';
      err.hidden = false;
    }
  });

  // ---------- boot ----------
  async function boot() {
    try {
      const res = await fetch(`/api/event${token ? `?token=${encodeURIComponent(token)}` : ''}`);
      const data = await res.json();
      event = data.event;
      guest = data.guest;
      renderEvent(event);
      if (guest) {
        showGreeting(guest);
        fillFromGuest(guest);
      } else if (token) {
        toast('That invitation link was not recognised, but you are still welcome to RSVP below!');
        token = null;
      }
    } catch (err) {
      console.error(err);
      toast('The forest is a little foggy — some details could not load.');
    }
    loadWishes();
  }
  boot();
})();
