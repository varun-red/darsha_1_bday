/* Hosts' dashboard: guest list, invitations, RSVP tracking, wishes and settings. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const state = { guests: [], stats: null, filter: 'all', query: '', settings: null, emailConfigured: false, wishes: [] };

  // ---------- api ----------
  async function api(path, opts = {}) {
    const res = await fetch(`/api/admin${path}`, {
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
      body: opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body,
    });
    if (res.status === 401) {
      showLogin();
      throw new Error('Please log in again.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2800);
  }

  const fmtDate = (iso) => (iso ? new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z').toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

  // ---------- auth ----------
  function showLogin() {
    $('#loginView').hidden = false;
    $('#appView').hidden = true;
  }
  async function showApp(meta) {
    $('#loginView').hidden = true;
    $('#appView').hidden = false;
    $('#passwordBanner').hidden = !meta.defaultPassword;
    $('#emailBanner').hidden = !!meta.emailConfigured;
    state.emailConfigured = !!meta.emailConfigured;
    await Promise.all([loadOverview(), loadSettings()]);
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#loginError');
    err.hidden = true;
    try {
      const data = await api('/login', { method: 'POST', body: { password: e.target.password.value } });
      e.target.reset();
      await showApp(data);
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });
  $('#logoutBtn').addEventListener('click', async () => {
    await api('/logout', { method: 'POST' }).catch(() => {});
    showLogin();
  });

  // ---------- tabs ----------
  $$('.side__link').forEach((b) =>
    b.addEventListener('click', () => {
      $$('.side__link').forEach((x) => x.classList.toggle('is-active', x === b));
      $$('.tab').forEach((t) => (t.hidden = t.id !== `tab-${b.dataset.tab}`));
      if (b.dataset.tab === 'wishes') loadWishes();
      if (b.dataset.tab === 'overview') loadOverview();
      history.replaceState(null, '', `#${b.dataset.tab}`);
    })
  );
  const initialTab = location.hash.slice(1);
  if (initialTab) $(`.side__link[data-tab="${initialTab}"]`)?.click();

  // ---------- overview ----------
  async function loadOverview() {
    const data = await api('/overview');
    state.guests = data.guests;
    state.stats = data.stats;
    state.emailConfigured = data.emailConfigured;
    renderTiles();
    renderGuests();
  }

  function renderTiles() {
    const s = state.stats;
    const tiles = [
      ['Total headcount', s.total_headcount, 'hero'],
      ['Grown-ups', s.adults],
      ['Little ones', s.children],
      ['Households attending', s.attending_households],
      ['Declined', s.declined],
      ['Awaiting reply', s.pending],
      ['Invited', s.invited],
      ['Invites sent', s.invites_sent],
      ['High chairs', s.highchairs],
      ['Wishes on the tree', s.wishes],
    ];
    $('#tiles').innerHTML = tiles.map(([l, n, k]) => `<div class="tile ${k ? `tile--${k}` : ''}"><div class="tile__num">${n ?? 0}</div><div class="tile__label">${l}</div></div>`).join('');
    const total = Math.max(1, s.invited);
    const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;
    $('#responseBar').innerHTML = `<span class="b-att" style="width:${pct(s.attending_households)}"></span><span class="b-dec" style="width:${pct(s.declined)}"></span><span class="b-pen" style="width:${pct(s.pending)}"></span>`;
    $('#responseLegend').innerHTML = `<span><i style="background:var(--gold)"></i>${s.attending_households} attending</span><span><i style="background:var(--lavender)"></i>${s.declined} declined</span><span><i style="background:rgba(255,255,255,.2)"></i>${s.pending} awaiting</span>`;
    $('#dietaryList').innerHTML = s.dietary.length
      ? state.guests.filter((g) => g.rsvp?.attending && g.rsvp.dietary).map((g) => `<li class="dietary-item"><b>${esc(g.name)}</b> — ${esc(g.rsvp.dietary)}</li>`).join('')
      : '<li class="muted">No dietary notes yet.</li>';
    const recent = state.guests.filter((g) => g.rsvp).sort((a, b) => (a.rsvp.updated_at < b.rsvp.updated_at ? 1 : -1)).slice(0, 8);
    $('#recentList').innerHTML = recent.length
      ? recent.map((g) => `<li class="recent"><span><b>${esc(g.name)}</b> ${statusChip(g)}${g.rsvp.message ? `<div class="note">“${esc(g.rsvp.message)}”</div>` : ''}</span><span class="muted small">${fmtDate(g.rsvp.updated_at)}</span></li>`).join('')
      : '<li class="muted">No replies yet — send some invitations!</li>';
    $('#overviewDate').textContent = state.settings ? `${state.settings.event_title} · ${new Date(state.settings.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}` : '';
  }

  function statusChip(g) {
    const map = { attending: ['✨', 'Attending'], declined: ['🌙', 'Declined'], pending: ['…', 'Awaiting'] };
    const [i, l] = map[g.status];
    return `<span class="status status--${g.status}">${i} ${l}</span>`;
  }

  // ---------- guests table ----------
  $('#guestSearch').addEventListener('input', (e) => { state.query = e.target.value.toLowerCase(); renderGuests(); });
  $$('#statusChips .chip').forEach((c) =>
    c.addEventListener('click', () => {
      $$('#statusChips .chip').forEach((x) => x.classList.toggle('is-active', x === c));
      state.filter = c.dataset.filter;
      renderGuests();
    })
  );

  function visibleGuests() {
    return state.guests.filter((g) => {
      if (state.filter === 'uninvited' && g.invited_at) return false;
      if (['attending', 'declined', 'pending'].includes(state.filter) && g.status !== state.filter) return false;
      if (state.query) {
        const hay = [g.name, g.email, g.phone, g.household, g.tags, g.rsvp?.party_names].join(' ').toLowerCase();
        if (!hay.includes(state.query)) return false;
      }
      return true;
    });
  }

  function renderGuests() {
    const rows = visibleGuests();
    $('#guestEmpty').hidden = rows.length > 0;
    $('#guestRows').innerHTML = rows
      .map((g) => {
        const party = g.rsvp?.attending ? `${g.rsvp.adults} 👤 ${g.rsvp.children ? `· ${g.rsvp.children} 🧒` : ''}${g.rsvp.needs_highchair ? ' · 🪑' : ''}` : g.rsvp ? '—' : '<span class="muted">?</span>';
        const invite = g.invited_at ? `<div>via ${esc(g.invited_via || 'link')}</div><div class="g-sub">${fmtDate(g.invited_at)}</div>${g.reminded_at ? `<div class="g-sub">reminded ${fmtDate(g.reminded_at)}</div>` : ''}` : g.source === 'self' ? '<span class="g-sub">RSVP’d directly</span>' : '<span class="muted">not sent</span>';
        return `<tr data-id="${g.id}">
          <td><div class="g-name">${esc(g.name)}</div>${g.household ? `<div class="g-sub">${esc(g.household)}</div>` : ''}${g.tags ? `<span class="g-tag">${esc(g.tags)}</span>` : ''}${g.max_party ? `<div class="g-sub">up to ${g.max_party} guests</div>` : ''}</td>
          <td><div class="g-sub">${g.phone ? esc(g.phone) : ''}</div><div class="g-sub">${g.email ? esc(g.email) : ''}</div>${!g.phone && !g.email ? '<span class="muted">—</span>' : ''}</td>
          <td>${statusChip(g)}${g.rsvp?.party_names ? `<div class="g-sub">${esc(g.rsvp.party_names)}</div>` : ''}${g.rsvp?.dietary ? `<div class="g-sub">🥗 ${esc(g.rsvp.dietary)}</div>` : ''}</td>
          <td>${party}</td>
          <td>${invite}</td>
          <td><div class="row-actions">
            <button class="btn btn--gold btn--sm" data-act="invite">Invite</button>
            <button class="btn btn--ghost btn--sm" data-act="rsvp">RSVP</button>
            <button class="btn btn--ghost btn--sm" data-act="edit">Edit</button>
            <button class="btn btn--danger btn--sm" data-act="delete" aria-label="Delete ${esc(g.name)}">✕</button>
          </div></td></tr>`;
      })
      .join('');
  }

  $('#guestRows').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = Number(btn.closest('tr').dataset.id);
    const guest = state.guests.find((g) => g.id === id);
    const act = btn.dataset.act;
    if (act === 'invite') openInvite(guest);
    if (act === 'edit') openEdit(guest);
    if (act === 'rsvp') openRsvp(guest);
    if (act === 'delete') {
      if (!confirm(`Remove ${guest.name} from the guest list? Their RSVP will be deleted too.`)) return;
      await api(`/guests/${id}`, { method: 'DELETE' });
      toast(`${guest.name} removed`);
      loadOverview();
    }
  });

  $('#addGuestBtn').addEventListener('click', () => openEdit(null));
  $('#importBtn').addEventListener('click', openImport);
  $('#copyPendingBtn').addEventListener('click', async () => {
    const pending = state.guests.filter((g) => g.status === 'pending');
    if (!pending.length) return toast('Everyone has replied! 🎉');
    const text = pending.map((g) => `${g.name}: ${location.origin}/i/${g.token}`).join('\n');
    await navigator.clipboard.writeText(text).then(() => toast(`Copied ${pending.length} links`)).catch(() => toast('Clipboard blocked — try again after clicking the page'));
  });

  // ---------- drawer ----------
  const drawer = $('#drawer');
  function openDrawer(title, html) {
    $('#drawerTitle').textContent = title;
    $('#drawerBody').innerHTML = html;
    drawer.hidden = false;
    setTimeout(() => $('#drawerBody input, #drawerBody textarea, #drawerBody button')?.focus(), 50);
  }
  function closeDrawer() { drawer.hidden = true; }
  $$('[data-close]', drawer).forEach((el) => el.addEventListener('click', closeDrawer));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) closeDrawer(); });

  // ---- invite ----
  async function openInvite(guest) {
    openDrawer(`Invite ${guest.name}`, '<p class="muted">Preparing invitation…</p>');
    let data;
    try {
      data = await api(`/guests/${guest.id}/invite`);
    } catch (ex) {
      return openDrawer('Oops', `<p class="form-error">${esc(ex.message)}</p>`);
    }
    const inv = data.invite;
    const hasPhone = !!guest.phone;
    const hasEmail = !!guest.email;
    openDrawer(
      `Invite ${guest.name}`,
      `<div class="share">
        <div class="sub-h">Personal invitation link</div>
        <div class="share__link"><input readonly value="${esc(inv.link)}" id="invLink" /><button class="btn btn--ghost btn--sm" data-copy="#invLink">Copy</button></div>
        <div class="sub-h">Send the invitation</div>
        <div class="share__row">
          <a class="btn btn--wa" href="${esc(inv.whatsappUrl)}" target="_blank" rel="noopener" data-mark="whatsapp">💬 WhatsApp${hasPhone ? '' : ' (pick contact)'}</a>
          ${state.emailConfigured && hasEmail ? `<button class="btn btn--gold" data-send-email="invite">✉ Email now</button>` : ''}
          <a class="btn btn--ghost" href="${esc(inv.mailtoUrl)}" data-mark="email">✉ Open in email app</a>
          <button class="btn btn--ghost" data-copy-text="whatsapp">Copy message</button>
        </div>
        ${!hasPhone && !hasEmail ? '<p class="muted small">Tip: add a phone or email to this guest so buttons can pre-fill the recipient.</p>' : ''}
        <div class="sub-h">Preview</div>
        <div class="preview" id="waPreview">${esc(inv.whatsappText)}</div>
        <div class="sub-h">Printable QR code</div>
        <div class="qr">${inv.qrSvg}</div>
        <div class="share__row" style="justify-content:center"><a class="btn btn--ghost btn--sm" href="/api/admin/guests/${guest.id}/qr.svg" download="invite-${esc(guest.name.replace(/\s+/g, '-').toLowerCase())}.svg">Download QR</a></div>
        <div class="sub-h">Gentle reminder ${guest.status !== 'pending' ? '(already replied)' : ''}</div>
        <div class="share__row">
          <a class="btn btn--wa btn--sm" href="${esc(inv.reminderWhatsappUrl)}" target="_blank" rel="noopener" data-mark="whatsapp" data-kind="reminder">💬 Remind on WhatsApp</a>
          ${state.emailConfigured && hasEmail ? `<button class="btn btn--gold btn--sm" data-send-email="reminder">✉ Email reminder</button>` : ''}
          <a class="btn btn--ghost btn--sm" href="${esc(inv.reminderMailtoUrl)}" data-mark="email" data-kind="reminder">✉ Remind by email app</a>
        </div>
        <div class="preview">${esc(inv.reminderText)}</div>
        <div class="drawer-actions"><span class="muted small">${guest.invited_at ? `Invitation marked sent via ${esc(guest.invited_via)} on ${fmtDate(guest.invited_at)}.` : 'Not yet marked as sent.'}</span>
          <button class="btn btn--ghost btn--sm" data-mark-only="link">Mark as sent</button></div>
      </div>`
    );
    const body = $('#drawerBody');
    $$('[data-copy]', body).forEach((b) => b.addEventListener('click', () => copy($(b.dataset.copy, body).value, 'Link copied')));
    $$('[data-copy-text]', body).forEach((b) => b.addEventListener('click', () => copy(inv.whatsappText, 'Message copied')));
    $$('[data-mark]', body).forEach((a) =>
      a.addEventListener('click', async () => {
        await api(`/guests/${guest.id}/invited`, { method: 'POST', body: { via: a.dataset.mark, kind: a.dataset.kind || 'invite' } });
        toast(a.dataset.kind === 'reminder' ? 'Reminder noted' : `Marked as invited via ${a.dataset.mark}`);
        loadOverview();
      })
    );
    $$('[data-mark-only]', body).forEach((b) =>
      b.addEventListener('click', async () => {
        await api(`/guests/${guest.id}/invited`, { method: 'POST', body: { via: 'link' } });
        toast('Marked as invited');
        loadOverview();
        closeDrawer();
      })
    );
    $$('[data-send-email]', body).forEach((b) =>
      b.addEventListener('click', async () => {
        b.disabled = true;
        try {
          await api(`/guests/${guest.id}/send-email`, { method: 'POST', body: { kind: b.dataset.sendEmail } });
          toast(`Email sent to ${guest.email} ✨`);
          loadOverview();
        } catch (ex) {
          toast(ex.message);
        } finally {
          b.disabled = false;
        }
      })
    );
  }

  async function copy(text, msg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(msg);
    } catch {
      toast('Clipboard blocked — select and copy manually');
    }
  }

  // ---- add / edit guest ----
  function openEdit(guest) {
    const g = guest || {};
    openDrawer(
      guest ? `Edit ${guest.name}` : 'Add a guest',
      `<form id="guestForm">
        <div class="grid2">
          <label class="field field--full"><span>Name *</span><input name="name" required value="${esc(g.name)}" placeholder="Aunt Meera" /></label>
          <label class="field"><span>Phone / WhatsApp (with country code)</span><input name="phone" value="${esc(g.phone)}" placeholder="+1 555 123 4567" /></label>
          <label class="field"><span>Email</span><input name="email" type="email" value="${esc(g.email)}" /></label>
          <label class="field"><span>Household / greeting name</span><input name="household" value="${esc(g.household)}" placeholder="The Sharma family" /></label>
          <label class="field"><span>Max party size (optional)</span><input name="max_party" type="number" min="1" max="20" value="${esc(g.max_party)}" /></label>
          <label class="field"><span>Group / tag</span><input name="tags" value="${esc(g.tags)}" placeholder="Family · Friends · Neighbours" /></label>
          <label class="field field--full"><span>Private notes</span><textarea name="notes" rows="2">${esc(g.notes)}</textarea></label>
        </div>
        <p class="form-error" id="guestFormError" hidden></p>
        <div class="drawer-actions"><span></span><button class="btn btn--gold" type="submit">${guest ? 'Save changes' : 'Add guest'}</button></div>
      </form>`
    );
    $('#guestForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target).entries());
      try {
        if (guest) {
          await api(`/guests/${guest.id}`, { method: 'PATCH', body });
          toast('Guest updated');
          closeDrawer();
          await loadOverview();
        } else {
          const data = await api('/guests', { method: 'POST', body });
          toast(`${data.guest.name} added`);
          await loadOverview();
          openInvite(data.guest);
        }
      } catch (ex) {
        const err = $('#guestFormError');
        err.textContent = ex.message;
        err.hidden = false;
      }
    });
  }

  // ---- import ----
  function openImport() {
    openDrawer(
      'Import guest list',
      `<form id="importForm">
        <p class="muted small">Paste one guest per line. Separate fields with commas or tabs (straight from a spreadsheet):<br><code>Name, phone, email, household, max party</code><br>Phone and email can be in either order — we detect them.</p>
        <label class="field"><textarea name="text" rows="10" placeholder="Meera Sharma, +15551234567, meera@example.com, The Sharmas, 4&#10;Uncle Raj, +15559876543"></textarea></label>
        <p class="form-error" id="importError" hidden></p>
        <div class="drawer-actions"><span></span><button class="btn btn--gold" type="submit">Import guests</button></div>
      </form>`
    );
    $('#importForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const data = await api('/guests/import', { method: 'POST', body: { text: e.target.text.value } });
        toast(`Imported ${data.created.length} guest${data.created.length === 1 ? '' : 's'}${data.skipped.length ? `, ${data.skipped.length} skipped` : ''}`);
        closeDrawer();
        loadOverview();
      } catch (ex) {
        const err = $('#importError');
        err.textContent = ex.message;
        err.hidden = false;
      }
    });
  }

  // ---- record RSVP on behalf ----
  function openRsvp(guest) {
    const r = guest.rsvp || {};
    openDrawer(
      `RSVP for ${guest.name}`,
      `<form id="rsvpAdminForm">
        <p class="muted small">Record or correct a reply — handy when someone tells you in person.</p>
        <div class="grid2">
          <label class="field"><span>Attending?</span><select name="attending"><option value="yes" ${r.attending ? 'selected' : ''}>Yes</option><option value="no" ${guest.rsvp && !r.attending ? 'selected' : ''}>No</option></select></label>
          <label class="field"><span>Grown-ups</span><input name="adults" type="number" min="1" max="20" value="${r.adults ?? 1}" /></label>
          <label class="field"><span>Kids</span><input name="children" type="number" min="0" max="20" value="${r.children ?? 0}" /></label>
          <label class="check" style="align-self:end"><input type="checkbox" name="needs_highchair" ${r.needs_highchair ? 'checked' : ''} /><span>Needs high chair</span></label>
          <label class="field field--full"><span>Who's coming</span><input name="party_names" value="${esc(r.party_names)}" /></label>
          <label class="field field--full"><span>Dietary</span><input name="dietary" value="${esc(r.dietary)}" /></label>
          <label class="field field--full"><span>Song request</span><input name="song_request" value="${esc(r.song_request)}" /></label>
          <label class="field field--full"><span>Message</span><textarea name="message" rows="2">${esc(r.message)}</textarea></label>
        </div>
        <div class="drawer-actions">
          ${guest.rsvp ? '<button class="btn btn--danger btn--sm" type="button" id="clearRsvp">Clear reply</button>' : '<span></span>'}
          <button class="btn btn--gold" type="submit">Save RSVP</button>
        </div>
      </form>`
    );
    $('#rsvpAdminForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = Object.fromEntries(fd.entries());
      body.needs_highchair = fd.has('needs_highchair');
      await api(`/guests/${guest.id}/rsvp`, { method: 'PUT', body });
      toast('RSVP saved');
      closeDrawer();
      loadOverview();
    });
    $('#clearRsvp')?.addEventListener('click', async () => {
      if (!confirm('Clear this reply so the guest shows as awaiting?')) return;
      await api(`/guests/${guest.id}/rsvp`, { method: 'DELETE' });
      toast('Reply cleared');
      closeDrawer();
      loadOverview();
    });
  }

  // ---------- wishes ----------
  async function loadWishes() {
    const data = await api('/wishes');
    state.wishes = data.wishes;
    $('#wishRows').innerHTML = data.wishes.length
      ? data.wishes
          .map(
            (w) => `<li class="wish-row ${w.approved ? '' : 'is-hidden'}" data-id="${w.id}">
              <blockquote>“${esc(w.text)}”</blockquote>
              <div class="meta"><span>— ${esc(w.author)} · ${fmtDate(w.created_at)}</span>
              <span><button class="btn btn--ghost btn--sm" data-toggle="${w.approved ? 0 : 1}">${w.approved ? 'Hide' : 'Show'}</button> <button class="btn btn--danger btn--sm" data-del>✕</button></span></div>
            </li>`
          )
          .join('')
      : '<li class="muted">No wishes yet.</li>';
  }
  $('#wishRows').addEventListener('click', async (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    const id = li.dataset.id;
    if (e.target.matches('[data-toggle]')) {
      await api(`/wishes/${id}`, { method: 'PATCH', body: { approved: e.target.dataset.toggle === '1' } });
      loadWishes();
    }
    if (e.target.matches('[data-del]')) {
      if (!confirm('Delete this wish permanently?')) return;
      await api(`/wishes/${id}`, { method: 'DELETE' });
      loadWishes();
    }
  });

  // ---------- settings ----------
  const LIST_FIELDS = {
    schedule_json: { lines: 'schedule_lines', keys: ['time', 'title', 'detail'] },
    milestones_json: { lines: 'milestones_lines', keys: ['month', 'title', 'detail', 'photo_url'] },
    faq_json: { lines: 'faq_lines', keys: ['q', 'a'] },
  };
  const toLines = (json, keys) => {
    try {
      return JSON.parse(json).map((o) => keys.map((k) => o[k] ?? '').filter((v, i) => i < 2 || v !== '').join(' | ')).join('\n');
    } catch {
      return '';
    }
  };
  const fromLines = (text, keys) =>
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const parts = l.split('|').map((p) => p.trim());
        const o = {};
        keys.forEach((k, i) => { if (parts[i]) o[k] = parts[i]; });
        return o;
      });

  async function loadSettings() {
    const data = await api('/settings');
    state.settings = data.settings;
    const f = $('#settingsForm');
    for (const [k, v] of Object.entries(data.settings)) {
      const el = f.elements[k];
      if (el) el.value = v;
    }
    for (const [jsonKey, cfg] of Object.entries(LIST_FIELDS)) f.elements[cfg.lines].value = toLines(data.settings[jsonKey], cfg.keys);
    $('#brandName').textContent = data.settings.child_name;
    renderTilesSafe();
  }
  function renderTilesSafe() { if (state.stats) renderTiles(); }

  $('#settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#settingsError');
    err.hidden = true;
    const fd = new FormData(e.target);
    const body = {};
    for (const [k, v] of fd.entries()) if (!k.endsWith('_lines')) body[k] = v;
    for (const [jsonKey, cfg] of Object.entries(LIST_FIELDS)) body[jsonKey] = JSON.stringify(fromLines(fd.get(cfg.lines), cfg.keys));
    try {
      await api('/settings', { method: 'PUT', body });
      toast('Settings saved — the party site is updated ✨');
      await loadSettings();
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });

  // ---------- boot ----------
  (async () => {
    try {
      const meta = await fetch('/api/admin/session').then((r) => r.json());
      if (meta.authenticated) await showApp(meta);
      else {
        showLogin();
        $('#passwordBanner').hidden = !meta.defaultPassword;
      }
    } catch {
      showLogin();
    }
  })();
})();
