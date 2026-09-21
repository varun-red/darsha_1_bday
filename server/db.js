// SQLite persistence layer on libSQL. Locally it uses a plain SQLite file
// (DB_PATH); in production it talks to a hosted Turso database
// (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN), which is what makes the app work on
// serverless hosts like Vercel where the filesystem is not persistent.
import { createClient } from '@libsql/client';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

const DB_PATH = process.env.DB_PATH || './data/party.sqlite';

export const DEFAULT_SETTINGS = {
  child_name: 'Darsha',
  child_nickname: 'our little blossom',
  event_title: "Darsha's First Birthday",
  tagline: 'Once upon a time, in an enchanted garden, a little blossom turned ONE…',
  // ISO 8601 date-time, local to the venue.
  event_date: '2026-11-22T17:30:00',
  event_end: '', // leave blank for no published end time (calendar entries assume 3 hours)
  timezone: 'America/Chicago',
  venue_name: 'Flora Events Venue',
  venue_address: '3333 W Grand Pkwy N, Katy, TX 77449',
  maps_url: '',
  parents_names: 'Mom & Dad',
  host_phone: '',
  host_email: '',
  rsvp_deadline: '2026-11-01',
  hero_photo_url: '',
  parking_note: 'Parking is available right at the venue.',
  whatsapp_template:
    "Hi {name}! 🌷🦋 You're invited to {child}'s enchanted garden first birthday on {date}. Step through the garden gate and RSVP here: {link}",
  email_subject_template: "🌸 You're invited to {child}'s Enchanted Garden First Birthday",
  email_template:
    "Dear {name},\n\nOnce upon a time, in an enchanted garden, a little blossom turned ONE… and we'd love for you to celebrate with us!\n\n📅 {date}\n📍 {venue}\n\nPlease RSVP by {deadline} at your personal invitation link:\n{link}\n\nWith love,\n{parents}",
  milestones_json: JSON.stringify([
    { month: 'Month 1', title: 'A tiny seed arrives', detail: 'Eyes barely open, already stealing hearts.', photo_url: '/assets/milestones/month-1.jpg' },
    { month: 'Month 3', title: 'First giggles', detail: 'The garden heard a new song.', photo_url: '/assets/milestones/month-3.jpg' },
    { month: 'Month 6', title: 'Sitting up tall', detail: 'Like a little tulip in the sun.', photo_url: '/assets/milestones/month-6.jpg' },
    { month: 'Month 9', title: 'Crawling adventures', detail: 'No corner of the house is safe.', photo_url: '/assets/milestones/month-9.jpg' },
    { month: 'Month 12', title: 'Turning ONE', detail: 'And so the enchanted garden party begins…' },
  ]),
};

let db;
let ready;
let cachedSessionSecret = process.env.SESSION_SECRET || null;

function isRemote() {
  return !!process.env.TURSO_DATABASE_URL;
}

export function getDb() {
  if (db) return db;
  if (isRemote()) {
    db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
  } else if (DB_PATH === ':memory:') {
    db = createClient({ url: ':memory:' });
  } else {
    const dir = dirname(DB_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    db = createClient({ url: `file:${DB_PATH}` });
  }
  return db;
}

// Creates tables and seeds defaults once; safe to await on every request.
export function initDb() {
  if (!ready) ready = migrate(getDb());
  return ready;
}

// ---------- tiny query helpers ----------
async function run(sql, args = []) {
  const r = await getDb().execute({ sql, args });
  return { changes: r.rowsAffected, lastInsertRowid: r.lastInsertRowid === undefined ? null : Number(r.lastInsertRowid) };
}
async function get(sql, args = []) {
  const r = await getDb().execute({ sql, args });
  return r.rows[0] ? plain(r.rows[0]) : undefined;
}
async function all(sql, args = []) {
  const r = await getDb().execute({ sql, args });
  return r.rows.map(plain);
}
// libSQL rows carry column names as enumerable keys; copy them into a plain object.
function plain(row) {
  const o = {};
  for (const k of Object.keys(row)) o[k] = row[k];
  return o;
}

async function migrate(client) {
  if (!isRemote()) {
    await client.execute('PRAGMA journal_mode = WAL').catch(() => {});
    await client.execute('PRAGMA foreign_keys = ON').catch(() => {});
  }
  await client.executeMultiple(`
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
  const seeds = Object.entries(DEFAULT_SETTINGS).map(([k, v]) => ({ sql: 'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', args: [k, String(v)] }));
  seeds.push({ sql: 'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', args: ['session_secret', randomBytes(32).toString('hex')] });
  await client.batch(seeds, 'write');
  if (!cachedSessionSecret) {
    const row = await get("SELECT value FROM settings WHERE key = 'session_secret'");
    cachedSessionSecret = row?.value || null;
  }
}

// Synchronous accessor for the cookie-signing secret (populated by initDb).
export function sessionSecret() {
  if (!cachedSessionSecret) throw new Error('Database not initialised yet');
  return cachedSessionSecret;
}

// ---------- settings ----------
export async function getSettings() {
  const rows = await all('SELECT key, value FROM settings');
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export async function getPublicSettings() {
  const s = await getSettings();
  delete s.session_secret;
  return s;
}

export async function updateSettings(patch) {
  const allowed = new Set(Object.keys(DEFAULT_SETTINGS));
  const stmts = [];
  for (const [k, v] of Object.entries(patch)) {
    if (!allowed.has(k)) continue;
    stmts.push({ sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', args: [k, String(v ?? '')] });
  }
  if (stmts.length) await getDb().batch(stmts, 'write');
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

export async function createGuest({ name, email, phone, household, max_party, tags, notes, source = 'admin' }) {
  const token = newToken();
  const info = await run(
    `INSERT INTO guests (token, name, email, phone, household, max_party, tags, notes, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      token,
      String(name).trim(),
      normalizeEmail(email),
      normalizePhone(phone),
      household ? String(household).trim() : null,
      max_party ? Number(max_party) : null,
      tags ? String(tags).trim() : null,
      notes ? String(notes).trim() : null,
      source,
    ]
  );
  return getGuestById(info.lastInsertRowid);
}

export async function updateGuest(id, patch) {
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
  await run(`UPDATE guests SET ${fields.join(', ')} WHERE id = ?`, values);
  return getGuestById(id);
}

export async function deleteGuest(id) {
  // Explicit cascade so we do not depend on the foreign_keys pragma being on.
  const results = await getDb().batch(
    [
      { sql: 'DELETE FROM rsvps WHERE guest_id = ?', args: [id] },
      { sql: 'UPDATE wishes SET guest_id = NULL WHERE guest_id = ?', args: [id] },
      { sql: 'DELETE FROM guests WHERE id = ?', args: [id] },
    ],
    'write'
  );
  return results[2].rowsAffected > 0;
}

const GUEST_SELECT = `
  SELECT g.*, r.id AS rsvp_id, r.attending, r.adults, r.children, r.party_names, r.dietary,
         r.song_request, r.message, r.needs_highchair, r.created_at AS rsvp_created_at,
         r.updated_at AS rsvp_updated_at
  FROM guests g LEFT JOIN rsvps r ON r.guest_id = g.id`;

export async function getGuestById(id) {
  return shape(await get(`${GUEST_SELECT} WHERE g.id = ?`, [id]));
}

export async function getGuestByToken(token) {
  if (!token) return null;
  return shape(await get(`${GUEST_SELECT} WHERE g.token = ?`, [String(token)]));
}

export async function findGuestByContact({ email, phone }) {
  const e = normalizeEmail(email);
  const p = normalizePhone(phone);
  if (e) {
    const row = await get(`${GUEST_SELECT} WHERE g.email = ?`, [e]);
    if (row) return shape(row);
  }
  if (p) {
    const row = await get(`${GUEST_SELECT} WHERE g.phone = ?`, [p]);
    if (row) return shape(row);
  }
  return null;
}

export async function listGuests() {
  const rows = await all(`${GUEST_SELECT} ORDER BY g.created_at DESC, g.id DESC`);
  return rows.map(shape);
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
export async function upsertRsvp(guestId, data) {
  const attending = data.attending ? 1 : 0;
  const adults = attending ? clampInt(data.adults, 1, 20, 1) : 0;
  const children = attending ? clampInt(data.children, 0, 20, 0) : 0;
  await run(
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
       updated_at = datetime('now')`,
    [
      guestId,
      attending,
      adults,
      children,
      clean(data.party_names, 500),
      clean(data.dietary, 500),
      clean(data.song_request, 200),
      clean(data.message, 1000),
      data.needs_highchair ? 1 : 0,
    ]
  );
  return getGuestById(guestId);
}

export async function deleteRsvp(guestId) {
  return (await run('DELETE FROM rsvps WHERE guest_id = ?', [guestId])).changes > 0;
}

export async function stats() {
  const totals = await get(
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
  );
  for (const k of Object.keys(totals)) totals[k] = Number(totals[k] || 0);
  const wishes = Number((await get('SELECT COUNT(*) AS n FROM wishes')).n);
  const dietary = (await all("SELECT dietary FROM rsvps WHERE attending = 1 AND dietary IS NOT NULL AND TRIM(dietary) <> ''")).map((r) => r.dietary);
  return {
    ...totals,
    pending: totals.invited - totals.responded,
    total_headcount: totals.adults + totals.children,
    wishes,
    dietary,
  };
}

// ---------- wishes ----------
export async function addWish({ guest_id, author, text }) {
  const info = await run('INSERT INTO wishes (guest_id, author, text) VALUES (?, ?, ?)', [guest_id ?? null, clean(author, 80) || 'A garden friend', clean(text, 400)]);
  return get('SELECT * FROM wishes WHERE id = ?', [info.lastInsertRowid]);
}

export async function listWishes({ approvedOnly = true } = {}) {
  const sql = approvedOnly
    ? 'SELECT id, author, text, created_at FROM wishes WHERE approved = 1 ORDER BY created_at DESC LIMIT 200'
    : 'SELECT * FROM wishes ORDER BY created_at DESC';
  return all(sql);
}

export async function setWishApproved(id, approved) {
  return (await run('UPDATE wishes SET approved = ? WHERE id = ?', [approved ? 1 : 0, id])).changes > 0;
}

export async function deleteWish(id) {
  return (await run('DELETE FROM wishes WHERE id = ?', [id])).changes > 0;
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
    ready = undefined;
  }
}
