import { Router } from 'express';
import QRCode from 'qrcode';
import {
  listGuests,
  getGuestById,
  createGuest,
  updateGuest,
  deleteGuest,
  upsertRsvp,
  deleteRsvp,
  stats,
  getPublicSettings,
  updateSettings,
  listWishes,
  setWishApproved,
  deleteWish,
  DEFAULT_SETTINGS,
} from '../db.js';
import {
  checkPassword,
  issueSession,
  clearSession,
  hasValidSession,
  requireAdmin,
  loginRateLimited,
  isDefaultPassword,
} from '../auth.js';
import { emailConfigured, sendMail } from '../mailer.js';
import { buildInvite, inviteLink, reminderMessage } from '../invites.js';

const router = Router();

// ---------- session ----------
router.get('/session', (req, res) => {
  res.json({ authenticated: hasValidSession(req), defaultPassword: isDefaultPassword(), emailConfigured: emailConfigured() });
});

router.post('/login', (req, res) => {
  if (loginRateLimited(req.ip)) return res.status(429).json({ error: 'Too many attempts. Rest on the garden bench for 15 minutes.' });
  if (!checkPassword(req.body?.password)) return res.status(401).json({ error: 'That is not the secret garden password.' });
  issueSession(res);
  res.json({ ok: true, defaultPassword: isDefaultPassword(), emailConfigured: emailConfigured() });
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.use(requireAdmin);

// ---------- dashboard ----------
router.get('/overview', (req, res) => {
  res.json({ stats: stats(), guests: listGuests(), emailConfigured: emailConfigured(), publicUrl: inviteLink(req, { token: '' }).replace(/\/i\/$/, '') });
});

// ---------- guests ----------
router.get('/guests', (req, res) => res.json({ guests: listGuests() }));

router.post('/guests', (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'A guest needs a name.' });
  const guest = createGuest({ ...req.body, source: 'admin' });
  res.status(201).json({ guest, invite: buildInvite(req, getPublicSettings(), guest) });
});

// Bulk import: one guest per line — "Name, phone, email, household, max party"
router.post('/guests/import', (req, res) => {
  const text = String(req.body?.text || '');
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const created = [];
  const skipped = [];
  for (const line of lines) {
    const cells = line.split(/[,\t;]/).map((c) => c.trim());
    const [name, a, b, household, maxParty] = cells;
    if (!name) continue;
    let phone = null;
    let email = null;
    for (const v of [a, b]) {
      if (!v) continue;
      if (v.includes('@')) email = v;
      else if (/\d{5,}/.test(v)) phone = v;
    }
    try {
      created.push(createGuest({ name, phone, email, household, max_party: maxParty, source: 'admin' }));
    } catch (e) {
      skipped.push({ line, reason: e.message });
    }
  }
  res.json({ created, skipped });
});

router.patch('/guests/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!getGuestById(id)) return res.status(404).json({ error: 'Guest not found.' });
  res.json({ guest: updateGuest(id, req.body || {}) });
});

router.delete('/guests/:id', (req, res) => {
  const ok = deleteGuest(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Guest not found.' });
  res.json({ ok: true });
});

// Invitation payload: personal link, WhatsApp deep link, mailto link, QR code
router.get('/guests/:id/invite', async (req, res) => {
  const guest = getGuestById(Number(req.params.id));
  if (!guest) return res.status(404).json({ error: 'Guest not found.' });
  const s = getPublicSettings();
  const invite = buildInvite(req, s, guest);
  const qr = await QRCode.toString(invite.link, { type: 'svg', margin: 1, color: { dark: '#2b1d4a', light: '#fff6ec' } });
  const reminder = reminderMessage(s, guest, invite.link);
  const phoneDigits = guest.phone ? guest.phone.replace(/\D/g, '') : '';
  res.json({
    guest,
    invite: {
      ...invite,
      qrSvg: qr,
      reminderText: reminder,
      reminderWhatsappUrl: phoneDigits
        ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(reminder)}`
        : `https://wa.me/?text=${encodeURIComponent(reminder)}`,
      reminderMailtoUrl: `mailto:${encodeURIComponent(guest.email || '')}?subject=${encodeURIComponent(`🌸 A little reminder: ${s.child_name}'s first birthday`)}&body=${encodeURIComponent(reminder)}`,
    },
  });
});

router.get('/guests/:id/qr.svg', async (req, res) => {
  const guest = getGuestById(Number(req.params.id));
  if (!guest) return res.status(404).send('Not found');
  const svg = await QRCode.toString(inviteLink(req, guest), { type: 'svg', margin: 1, color: { dark: '#2b1d4a', light: '#fff6ec' } });
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Content-Disposition', `inline; filename="invite-${guest.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.svg"`);
  res.send(svg);
});

// Mark the invitation as sent through a given channel (whatsapp/email/link/qr)
router.post('/guests/:id/invited', (req, res) => {
  const id = Number(req.params.id);
  if (!getGuestById(id)) return res.status(404).json({ error: 'Guest not found.' });
  const via = String(req.body?.via || 'link').slice(0, 20);
  const kind = req.body?.kind === 'reminder' ? 'reminder' : 'invite';
  const now = new Date().toISOString();
  const guest = kind === 'reminder' ? updateGuest(id, { reminded_at: now }) : updateGuest(id, { invited_via: via, invited_at: now });
  res.json({ guest });
});

// Send the invitation or reminder by email through SMTP (when configured)
router.post('/guests/:id/send-email', async (req, res) => {
  const guest = getGuestById(Number(req.params.id));
  if (!guest) return res.status(404).json({ error: 'Guest not found.' });
  if (!guest.email) return res.status(400).json({ error: `${guest.name} has no email address on file.` });
  if (!emailConfigured()) return res.status(400).json({ error: 'Email sending is not configured on the server. Use the "Open in email app" option instead, or set SMTP_* variables.' });
  const s = getPublicSettings();
  const invite = buildInvite(req, s, guest);
  const kind = req.body?.kind === 'reminder' ? 'reminder' : 'invite';
  try {
    if (kind === 'reminder') {
      await sendMail({ to: guest.email, subject: `🌸 A little reminder: ${s.child_name}'s first birthday`, text: reminderMessage(s, guest, invite.link), settings: s });
      return res.json({ ok: true, guest: updateGuest(guest.id, { reminded_at: new Date().toISOString() }) });
    }
    await sendMail({ to: guest.email, subject: invite.emailSubject, text: invite.emailBody, settings: s });
    res.json({ ok: true, guest: updateGuest(guest.id, { invited_via: 'email', invited_at: new Date().toISOString() }) });
  } catch (e) {
    res.status(502).json({ error: `Email failed: ${e.message}` });
  }
});

// Host can record or fix an RSVP on a guest's behalf (e.g. told in person)
router.put('/guests/:id/rsvp', (req, res) => {
  const id = Number(req.params.id);
  if (!getGuestById(id)) return res.status(404).json({ error: 'Guest not found.' });
  const b = req.body || {};
  res.json({ guest: upsertRsvp(id, { ...b, attending: b.attending === true || b.attending === 'yes' }) });
});

router.delete('/guests/:id/rsvp', (req, res) => {
  const id = Number(req.params.id);
  deleteRsvp(id);
  res.json({ guest: getGuestById(id) });
});

// ---------- export ----------
router.get('/export.csv', (req, res) => {
  const guests = listGuests();
  const cols = ['Name', 'Status', 'Adults', 'Children', 'Party names', 'Email', 'Phone', 'Household', 'Dietary', 'High chair', 'Song request', 'Message', 'Invited via', 'Invited at', 'Reminded at', 'RSVP updated', 'Invite link'];
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = guests.map((g) => [
    g.name,
    g.status,
    g.rsvp?.attending ? g.rsvp.adults : '',
    g.rsvp?.attending ? g.rsvp.children : '',
    g.rsvp?.party_names,
    g.email,
    g.phone,
    g.household,
    g.rsvp?.dietary,
    g.rsvp?.needs_highchair ? 'yes' : '',
    g.rsvp?.song_request,
    g.rsvp?.message,
    g.invited_via,
    g.invited_at,
    g.reminded_at,
    g.rsvp?.updated_at,
    inviteLink(req, g),
  ]);
  const csv = [cols, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="guest-list.csv"');
  res.send('﻿' + csv);
});

// ---------- settings ----------
router.get('/settings', (req, res) => res.json({ settings: getPublicSettings(), defaults: DEFAULT_SETTINGS }));

router.put('/settings', (req, res) => {
  const patch = req.body || {};
  for (const key of ['schedule_json', 'faq_json', 'milestones_json']) {
    if (key in patch) {
      try {
        const v = typeof patch[key] === 'string' ? JSON.parse(patch[key]) : patch[key];
        if (!Array.isArray(v)) throw new Error('must be a list');
        patch[key] = JSON.stringify(v);
      } catch (e) {
        return res.status(400).json({ error: `${key} is not valid: ${e.message}` });
      }
    }
  }
  res.json({ settings: updateSettings(patch) });
});

// ---------- wishes ----------
router.get('/wishes', (req, res) => res.json({ wishes: listWishes({ approvedOnly: false }) }));
router.patch('/wishes/:id', (req, res) => {
  setWishApproved(Number(req.params.id), !!req.body?.approved);
  res.json({ ok: true });
});
router.delete('/wishes/:id', (req, res) => {
  deleteWish(Number(req.params.id));
  res.json({ ok: true });
});

export default router;
