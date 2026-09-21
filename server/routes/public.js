import { Router } from 'express';
import {
  getPublicSettings,
  getGuestByToken,
  findGuestByContact,
  createGuest,
  updateGuest,
  upsertRsvp,
  addWish,
  listWishes,
} from '../db.js';
import { buildIcs, googleCalendarUrl, formatEventDate, zonedToUtc } from '../dates.js';
import { emailConfigured, sendMail } from '../mailer.js';
import { baseUrl } from '../invites.js';

const router = Router();

// Very light per-IP throttle for write endpoints.
const hits = new Map();
function throttle(limit, windowMs) {
  return (req, res, next) => {
    const key = `${req.path}:${req.ip}`;
    const now = Date.now();
    const rec = hits.get(key) || { n: 0, t: now };
    if (now - rec.t > windowMs) Object.assign(rec, { n: 0, t: now });
    rec.n += 1;
    hits.set(key, rec);
    if (rec.n > limit) return res.status(429).json({ error: 'Too many requests, please try again in a moment.' });
    next();
  };
}

function publicGuest(g) {
  if (!g) return null;
  return {
    token: g.token,
    name: g.name,
    email: g.email,
    phone: g.phone,
    household: g.household,
    max_party: g.max_party,
    rsvp: g.rsvp,
    status: g.status,
  };
}

async function eventPayload(req) {
  const s = await getPublicSettings();
  const site = baseUrl(req);
  return {
    ...s,
    milestones: safeJson(s.milestones_json, []),
    event_date_pretty: formatEventDate(s.event_date, s.timezone),
    event_start_utc: zonedToUtc(s.event_date, s.timezone)?.toISOString() ?? null,
    event_end_utc: zonedToUtc(s.event_end, s.timezone)?.toISOString() ?? null,
    google_calendar_url: googleCalendarUrl(s, site),
    ics_url: `${site}/calendar.ics`,
    maps_url:
      s.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.venue_name, s.venue_address].filter(Boolean).join(', '))}`,
  };
}

function safeJson(str, fallback) {
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

router.get('/api/event', async (req, res) => {
  const payload = await eventPayload(req);
  const guest = req.query.token ? publicGuest(await getGuestByToken(req.query.token)) : null;
  res.json({ event: payload, guest });
});

router.get('/api/invite/:token', async (req, res) => {
  const guest = await getGuestByToken(req.params.token);
  if (!guest) return res.status(404).json({ error: 'This invitation could not be found.' });
  res.json({ guest: publicGuest(guest) });
});

// Look up an existing RSVP by email or phone so guests can edit it.
router.post('/api/rsvp/lookup', throttle(15, 60_000), async (req, res) => {
  const { email, phone } = req.body || {};
  if (!email && !phone) return res.status(400).json({ error: 'Enter the email or phone you RSVP’d with.' });
  const guest = await findGuestByContact({ email, phone });
  if (!guest) return res.status(404).json({ error: 'We couldn’t find an RSVP with those details.' });
  res.json({ guest: publicGuest(guest) });
});

router.post('/api/rsvp', throttle(10, 60_000), async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim();
  const phone = String(b.phone || '').trim();
  const attending = b.attending === true || b.attending === 'yes' || b.attending === 'true';

  if (!name) return res.status(400).json({ error: 'Please tell us your name.' });
  if (name.length > 120) return res.status(400).json({ error: 'That name is a little long for our guest book.' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'That email address looks a bit tangled — please check it.' });

  let guest = b.token ? await getGuestByToken(b.token) : null;
  if (!guest) guest = await findGuestByContact({ email, phone });
  const hasContact = email || phone || guest?.email || guest?.phone;
  if (!hasContact) return res.status(400).json({ error: 'Please share an email or phone number so we can reach you.' });
  if (!guest) {
    guest = await createGuest({ name, email, phone, source: 'self' });
  } else {
    // Keep contact info fresh but never wipe values the host already has.
    const patch = {};
    if (name && !b.token) patch.name = name;
    if (email) patch.email = email;
    if (phone) patch.phone = phone;
    if (guest.source === 'self' && name) patch.name = name;
    guest = await updateGuest(guest.id, patch);
  }

  if (attending && guest.max_party) {
    const total = Number(b.adults || 1) + Number(b.children || 0);
    if (total > guest.max_party) {
      return res.status(400).json({ error: `Your invitation covers up to ${guest.max_party} guests. Please adjust the numbers or message us!` });
    }
  }

  const updated = await upsertRsvp(guest.id, {
    attending,
    adults: b.adults,
    children: b.children,
    party_names: b.party_names,
    dietary: b.dietary,
    song_request: b.song_request,
    message: b.message,
    needs_highchair: !!b.needs_highchair,
  });

  if (b.wish && String(b.wish).trim()) {
    await addWish({ guest_id: guest.id, author: updated.name, text: b.wish });
  }

  // Fire-and-forget confirmation email when SMTP is configured.
  if (emailConfigured() && updated.email) {
    const s = await getPublicSettings();
    const link = `${baseUrl(req)}/i/${updated.token}`;
    const text = attending
      ? `Dear ${updated.name},\n\nHooray! Your RSVP for ${s.child_name}'s Enchanted Garden first birthday is in the fairy post.\n\n📅 ${formatEventDate(s.event_date, s.timezone)}\n📍 ${[s.venue_name, s.venue_address].filter(Boolean).join(', ')}\n👥 ${updated.rsvp.adults} grown-up(s) and ${updated.rsvp.children} little one(s)\n\nNeed to change anything? Use your personal link: ${link}\n\nSee you under the fairy lights,\n${s.parents_names}`
      : `Dear ${updated.name},\n\nThank you for letting us know you can't make it to ${s.child_name}'s first birthday. You'll be missed among the roses!\n\nIf plans change, you can update your RSVP any time: ${link}\n\nWith love,\n${s.parents_names}`;
    sendMail({ to: updated.email, subject: attending ? `🦋 You're on the guest list, ${updated.name}!` : `🌙 Thank you, ${updated.name}`, text, settings: s }).catch((e) =>
      console.error('Confirmation email failed:', e.message)
    );
  }

  res.json({ ok: true, guest: publicGuest(updated) });
});

router.get('/api/wishes', async (req, res) => {
  res.json({ wishes: await listWishes({ approvedOnly: true }) });
});

router.post('/api/wishes', throttle(10, 60_000), async (req, res) => {
  const { author, text, token } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).json({ error: 'Whisper a wish first!' });
  if (String(text).length > 400) return res.status(400).json({ error: 'Wishes work best when they are short and sweet (400 characters max).' });
  const guest = token ? await getGuestByToken(token) : null;
  const wish = await addWish({ guest_id: guest?.id, author: author || guest?.name?.split(' ')[0], text });
  res.json({ ok: true, wish: { id: wish.id, author: wish.author, text: wish.text, created_at: wish.created_at } });
});

router.get('/calendar.ics', async (req, res) => {
  const s = await getPublicSettings();
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="enchanted-garden-birthday.ics"');
  res.send(buildIcs(s, baseUrl(req)));
});

export default router;
