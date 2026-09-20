// SQLite persistence layer using Node's built-in sqlite module (Node >= 22.13).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

const DB_PATH = process.env.DB_PATH || './data/party.sqlite';

export const DEFAULT_SETTINGS = {
  child_name: 'Darsha',
  child_nickname: 'our little woodland sprite',
  event_title: "Darsha's First Birthday",
  tagline: 'Once upon a time, in an enchanted forest, a little sprite turned ONE…',
  // ISO 8601 date-time, local to the venue.
  event_date: '2026-11-15T16:00:00',
  event_end: '2026-11-15T19:00:00',
  timezone: 'America/Los_Angeles',
  venue_name: 'The Willow Grove Pavilion',
  venue_address: '123 Fern Hollow Lane, Woodland Hills, CA 91364',
  maps_url: '',
  dress_code: 'Woodland whimsy: earthy greens, soft florals, fairy wings and antlers most welcome',
  parents_names: 'Mom & Dad',
  host_phone: '',
  host_email: '',
  rsvp_deadline: '2026-11-01',
  gift_note:
    'Your presence is the only present we need. If you would like to bring something, a favourite picture book with a note inside would be treasured forever.',
  registry_url: '',
  hero_photo_url: '',
  parking_note: 'Free parking is available in the grove lot next to the pavilion.',
  whatsapp_template:
    "Hi {name}! 🌿✨ You're invited to {child}'s enchanted first birthday on {date}. Wander into the forest and RSVP here: {link}",
  email_subject_template: "🌲 You're invited to {child}'s Enchanted Forest First Birthday",
  email_template:
    "Dear {name},\n\nOnce upon a time, in an enchanted forest, a little sprite turned ONE… and we'd love for you to celebrate with us!\n\n📅 {date}\n📍 {venue}\n\nPlease RSVP by {deadline} at your personal invitation link:\n{link}\n\nWith love,\n{parents}",
  schedule_json: JSON.stringify([
    { time: '4:00 PM', title: 'Wander into the Woods', detail: 'Arrivals, fairy-wing fitting and woodland welcome drinks' },
    { time: '4:30 PM', title: 'Mushroom Picnic', detail: 'A feast of forest treats for little sprites and grown-ups' },
    { time: '5:30 PM', title: 'The Cake Smash', detail: 'Our birthday girl meets her very first toadstool cake' },
    { time: '6:00 PM', title: 'Firefly Farewell', detail: 'Bubbles, lanterns and goodbye hugs' },
  ]),
  faq_json: JSON.stringify([
    { q: 'Are kids welcome?', a: 'Absolutely! This is a celebration for little ones. Let us know how many small sprites are coming so we can prepare crafts and favours.' },
    { q: 'What should we wear?', a: 'Comfortable and whimsical. Think forest greens, soft florals, flower crowns, fairy wings or antlers. We will have some to borrow too!' },
    { q: 'Is the venue indoors or outdoors?', a: 'The pavilion is covered with an open lawn beside it, so we party rain or shine.' },
    { q: 'Do you have dietary options?', a: 'Yes! Tell us about allergies or preferences in your RSVP and we will make sure there is something delicious for everyone.' },
  ]),
  milestones_json: JSON.stringify([
    { month: 'Month 1', title: 'A tiny seed arrives', detail: 'Eyes barely open, already stealing hearts.' },
    { month: 'Month 3', title: 'First giggles', detail: 'The forest heard a new song.' },
    { month: 'Month 6', title: 'Sitting up tall', detail: 'Like a little mushroom on the moss.' },
    { month: 'Month 9', title: 'Crawling adventures', detail: 'No corner of the house is safe.' },
    { month: 'Month 12', title: 'Turning ONE', detail: 'And so the enchanted party begins…' },
  ]),
};

let db;

export function getDb() {
  if (db) return db;
  const dir = dirname(DB_PATH);
  if (DB_PATH !== ':memory:' && !existsSync(dir)) mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      household TEXT,
      max_party INTEGER,
      tags TEXT,
      notes TEXT,
      invited_via TEXT,
      invited_at TEXT,
      reminded_at TEXT,
      source TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER NOT NULL UNIQUE REFERENCES guests(id) ON DELETE CASCADE,
      attending INTEGER NOT NULL,
      adults INTEGER NOT NULL DEFAULT 1,
      children INTEGER NOT NULL DEFAULT 0,
      party_names TEXT,
      dietary TEXT,
      song_request TEXT,
      message TEXT,
      needs_highchair INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      approved INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
    CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);
  `);

  // Seed defaults for any missing settings.
  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insert.run(k, String(v));
  insert.run('session_secret', randomBytes(32).toString('hex'));
}

// ---------- settings ----------
export function getSettings() {
  const rows = getDb().prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export function getPublicSettings() {
  const s = getSettings();
  delete s.session_secret;
  return s;
}

export function updateSettings(patch) {
  const db = getDb();
  const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const allowed = new Set(Object.keys(DEFAULT_SETTINGS));
  db.exec('BEGIN');
  try {
    for (const [k, v] of Object.entries(patch)) {
      if (!allowed.has(k)) continue;
      stmt.run(k, String(v ?? ''));
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return getPublicSettings();
}

// ---------- guests ----------
export function newToken() {
  // URL-safe, short but unguessable (~60 bits).
  return randomBytes(8).toString('base64url');
}

export function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/[^\d+]/g, '');
  return digits ? digits : null;
}

export function normalizeEmail(email) {
  if (!email) return null;
  const e = String(email).trim().toLowerCase();
  return e ? e : null;
}

export function createGuest({ name, email, phone, household, max_party, tags, notes, source = 'admin' }) {
  const db = getDb();
  const token = newToken();
  const info = db
    .prepare(
      `INSERT INTO guests (token, name, email, phone, household, max_party, tags, notes, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      token,
      String(name).trim(),
      normalizeEmail(email),
      normalizePhone(phone),
      household ? String(household).trim() : null,
      max_party ? Number(max_party) : null,
      tags ? String(tags).trim() : null,
      notes ? String(notes).trim() : null,
      source
    );
  return getGuestById(Number(info.lastInsertRowid));
}

export function updateGuest(id, patch) {
  const db = getDb();
  const fields = [];
  const values = [];
  const map = {
    name: (v) => String(v).trim(),
    email: normalizeEmail,
    phone: normalizePhone,
    household: (v) => (v ? String(v).trim() : null),
    max_party: (v) => (v ? Number(v) : null),
    tags: (v) => (v ? String(v).trim() : null),
    notes: (v) => (v ? String(v).trim() : null),
    invited_via: (v) => (v ? String(v) : null),
    invited_at: (v) => (v ? String(v) : null),
    reminded_at: (v) => (v ? String(v) : null),
  };
  for (const [k, fn] of Object.entries(map)) {
    if (k in patch) {
      fields.push(`${k} = ?`);
      values.push(fn(patch[k]));
    }
  }
  if (!fields.length) return getGuestById(id);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE guests SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getGuestById(id);
}

export function deleteGuest(id) {
  return getDb().prepare('DELETE FROM guests WHERE id = ?').run(id).changes > 0;
}

const GUEST_SELECT = `
  SELECT g.*, r.id AS rsvp_id, r.attending, r.adults, r.children, r.party_names, r.dietary,
         r.song_request, r.message, r.needs_highchair, r.created_at AS rsvp_created_at,
         r.updated_at AS rsvp_updated_at
  FROM guests g LEFT JOIN rsvps r ON r.guest_id = g.id`;

export function getGuestById(id) {
  return shape(getDb().prepare(`${GUEST_SELECT} WHERE g.id = ?`).get(id));
}

export function getGuestByToken(token) {
  if (!token) return null;
  return shape(getDb().prepare(`${GUEST_SELECT} WHERE g.token = ?`).get(String(token)));
}

export function findGuestByContact({ email, phone }) {
  const db = getDb();
  const e = normalizeEmail(email);
  const p = normalizePhone(phone);
  if (e) {
    const row = db.prepare(`${GUEST_SELECT} WHERE g.email = ?`).get(e);
    if (row) return shape(row);
  }
  if (p) {
    const row = db.prepare(`${GUEST_SELECT} WHERE g.phone = ?`).get(p);
    if (row) return shape(row);
  }
  return null;
}

export function listGuests() {
  return getDb()
    .prepare(`${GUEST_SELECT} ORDER BY g.created_at DESC, g.id DESC`)
    .all()
    .map(shape);
}

function shape(row) {
  if (!row) return null;
  const { rsvp_id, attending, adults, children, party_names, dietary, song_request, message, needs_highchair, rsvp_created_at, rsvp_updated_at, ...guest } = row;
  guest.rsvp = rsvp_id
    ? {
        attending: !!attending,
        adults,
        children,
        party_names,
        dietary,
        song_request,
        message,
        needs_highchair: !!needs_highchair,
        created_at: rsvp_created_at,
        updated_at: rsvp_updated_at,
      }
    : null;
  guest.status = !guest.rsvp ? 'pending' : guest.rsvp.attending ? 'attending' : 'declined';
  return guest;
}

// ---------- rsvps ----------
export function upsertRsvp(guestId, data) {
  const db = getDb();
  const attending = data.attending ? 1 : 0;
  const adults = attending ? clampInt(data.adults, 1, 20, 1) : 0;
  const children = attending ? clampInt(data.children, 0, 20, 0) : 0;
  db.prepare(
    `INSERT INTO rsvps (guest_id, attending, adults, children, party_names, dietary, song_request, message, needs_highchair)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(guest_id) DO UPDATE SET
       attending = excluded.attending,
       adults = excluded.adults,
       children = excluded.children,
       party_names = excluded.party_names,
       dietary = excluded.dietary,
       song_request = excluded.song_request,
       message = excluded.message,
       needs_highchair = excluded.needs_highchair,
       updated_at = datetime('now')`
  ).run(
    guestId,
    attending,
    adults,
    children,
    clean(data.party_names, 500),
    clean(data.dietary, 500),
    clean(data.song_request, 200),
    clean(data.message, 1000),
    data.needs_highchair ? 1 : 0
  );
  return getGuestById(guestId);
}

export function deleteRsvp(guestId) {
  return getDb().prepare('DELETE FROM rsvps WHERE guest_id = ?').run(guestId).changes > 0;
}

export function stats() {
  const db = getDb();
  const totals = db
    .prepare(
      `SELECT
        COUNT(g.id) AS invited,
        SUM(CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END) AS responded,
        SUM(CASE WHEN r.attending = 1 THEN 1 ELSE 0 END) AS attending_households,
        SUM(CASE WHEN r.attending = 0 THEN 1 ELSE 0 END) AS declined,
        COALESCE(SUM(CASE WHEN r.attending = 1 THEN r.adults ELSE 0 END), 0) AS adults,
        COALESCE(SUM(CASE WHEN r.attending = 1 THEN r.children ELSE 0 END), 0) AS children,
        COALESCE(SUM(CASE WHEN r.attending = 1 THEN r.needs_highchair ELSE 0 END), 0) AS highchairs,
        SUM(CASE WHEN g.invited_at IS NOT NULL THEN 1 ELSE 0 END) AS invites_sent
      FROM guests g LEFT JOIN rsvps r ON r.guest_id = g.id`
    )
    .get();
  const wishes = db.prepare('SELECT COUNT(*) AS n FROM wishes').get().n;
  const dietary = db
    .prepare("SELECT dietary FROM rsvps WHERE attending = 1 AND dietary IS NOT NULL AND TRIM(dietary) <> ''")
    .all()
    .map((r) => r.dietary);
  return {
    ...totals,
    pending: totals.invited - totals.responded,
    total_headcount: totals.adults + totals.children,
    wishes,
    dietary,
  };
}

// ---------- wishes ----------
export function addWish({ guest_id, author, text }) {
  const db = getDb();
  const info = db
    .prepare('INSERT INTO wishes (guest_id, author, text) VALUES (?, ?, ?)')
    .run(guest_id ?? null, clean(author, 80) || 'A forest friend', clean(text, 400));
  return db.prepare('SELECT * FROM wishes WHERE id = ?').get(Number(info.lastInsertRowid));
}

export function listWishes({ approvedOnly = true } = {}) {
  const sql = approvedOnly
    ? 'SELECT id, author, text, created_at FROM wishes WHERE approved = 1 ORDER BY created_at DESC LIMIT 200'
    : 'SELECT * FROM wishes ORDER BY created_at DESC';
  return getDb().prepare(sql).all();
}

export function setWishApproved(id, approved) {
  return getDb().prepare('UPDATE wishes SET approved = ? WHERE id = ?').run(approved ? 1 : 0, id).changes > 0;
}

export function deleteWish(id) {
  return getDb().prepare('DELETE FROM wishes WHERE id = ?').run(id).changes > 0;
}

// ---------- helpers ----------
function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clean(v, max) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim().slice(0, max);
  return s ? s : null;
}

export function closeDb() {
  if (db) {
    db.close();
    db = undefined;
  }
}
