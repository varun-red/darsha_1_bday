import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
process.env.ADMIN_PASSWORD = 'test-secret';

const { createApp } = await import('../server/index.js');

let server;
let base;
let cookie = '';

before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(() => server.close());

const json = (method, path, body, extra = {}) =>
  fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', cookie, ...extra },
    body: body ? JSON.stringify(body) : undefined,
  });

test('public event payload includes computed fields', async () => {
  const res = await fetch(`${base}/api/event`);
  assert.equal(res.status, 200);
  const { event, guest } = await res.json();
  assert.equal(guest, null);
  assert.equal(event.child_name, 'Darsha');
  assert.ok(Array.isArray(event.schedule) && event.schedule.length > 0);
  assert.ok(event.event_start_utc);
  assert.match(event.google_calendar_url, /^https:\/\/calendar\.google\.com/);
  assert.equal(event.session_secret, undefined);
});

test('calendar feed is served', async () => {
  const res = await fetch(`${base}/calendar.ics`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /BEGIN:VEVENT/);
  assert.match(text, /SUMMARY:Darsha's First Birthday/);
});

test('admin routes require a session', async () => {
  const res = await fetch(`${base}/api/admin/guests`);
  assert.equal(res.status, 401);
});

test('admin login rejects wrong and accepts right password', async () => {
  const bad = await json('POST', '/api/admin/login', { password: 'nope' });
  assert.equal(bad.status, 401);
  const good = await json('POST', '/api/admin/login', { password: 'test-secret' });
  assert.equal(good.status, 200);
  cookie = good.headers.get('set-cookie').split(';')[0];
  const session = await json('GET', '/api/admin/session');
  assert.equal((await session.json()).authenticated, true);
});

let guestId;
let token;

test('admin can add a guest and receive an invitation payload', async () => {
  const res = await json('POST', '/api/admin/guests', { name: 'Aunt Meera', phone: '+1 (555) 123-4567', email: 'Meera@Example.com', max_party: 3 });
  assert.equal(res.status, 201);
  const { guest, invite } = await res.json();
  guestId = guest.id;
  token = guest.token;
  assert.equal(guest.phone, '+15551234567');
  assert.equal(guest.email, 'meera@example.com');
  assert.equal(guest.status, 'pending');
  assert.match(invite.whatsappUrl, /^https:\/\/wa\.me\/15551234567\?text=/);
  assert.match(decodeURIComponent(invite.whatsappUrl), /Aunt Meera/);
  assert.ok(invite.link.endsWith(`/i/${token}`));
  assert.match(invite.mailtoUrl, /^mailto:meera%40example\.com\?subject=/);
});

test('invite detail includes QR and reminder', async () => {
  const res = await json('GET', `/api/admin/guests/${guestId}/invite`);
  const { invite } = await res.json();
  assert.match(invite.qrSvg, /<svg/);
  assert.match(invite.reminderText, /reminder/i);
});

test('personal invite page and API resolve the token', async () => {
  const page = await fetch(`${base}/i/${token}`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<title>/);
  const res = await fetch(`${base}/api/invite/${token}`);
  const { guest } = await res.json();
  assert.equal(guest.name, 'Aunt Meera');
  assert.equal(guest.id, undefined, 'internal id must not leak');
});

test('guest RSVP via token is enforced against max party', async () => {
  const tooMany = await json('POST', '/api/rsvp', { token, name: 'Aunt Meera', attending: true, adults: 3, children: 2 });
  assert.equal(tooMany.status, 400);
  const ok = await json('POST', '/api/rsvp', { token, name: 'Aunt Meera', attending: true, adults: 2, children: 1, dietary: 'Vegetarian', message: 'So excited!', wish: 'May your days sparkle' });
  assert.equal(ok.status, 200);
  const { guest } = await ok.json();
  assert.equal(guest.status, 'attending');
  assert.equal(guest.rsvp.adults, 2);
  assert.equal(guest.rsvp.children, 1);
});

test('wish left alongside RSVP appears publicly', async () => {
  const res = await fetch(`${base}/api/wishes`);
  const { wishes } = await res.json();
  assert.equal(wishes.length, 1);
  assert.equal(wishes[0].text, 'May your days sparkle');
  assert.equal(wishes[0].author, 'Aunt Meera');
});

test('open RSVP without invitation creates a self-registered guest', async () => {
  const res = await json('POST', '/api/rsvp', { name: 'Walk-in Wendy', email: 'wendy@example.com', attending: false });
  assert.equal(res.status, 200);
  const { guest } = await res.json();
  assert.equal(guest.status, 'declined');
  assert.ok(guest.token);
  const lookup = await json('POST', '/api/rsvp/lookup', { email: 'WENDY@example.com' });
  assert.equal(lookup.status, 200);
  assert.equal((await lookup.json()).guest.token, guest.token);
});

test('RSVP requires contact info', async () => {
  const res = await json('POST', '/api/rsvp', { name: 'Nobody', attending: true });
  assert.equal(res.status, 400);
});

test('stats reflect responses', async () => {
  const res = await json('GET', '/api/admin/overview');
  const { stats, guests } = await res.json();
  assert.equal(stats.invited, 2);
  assert.equal(stats.responded, 2);
  assert.equal(stats.attending_households, 1);
  assert.equal(stats.declined, 1);
  assert.equal(stats.adults, 2);
  assert.equal(stats.children, 1);
  assert.equal(stats.total_headcount, 3);
  assert.deepEqual(stats.dietary, ['Vegetarian']);
  assert.equal(guests.length, 2);
});

test('bulk import detects phone and email in either order', async () => {
  const res = await json('POST', '/api/admin/guests/import', { text: 'Uncle Raj, raj@example.com, +15550001111, The Rajs, 4\nGrandma Lata\t+15552223333\n\n' });
  const { created, skipped } = await res.json();
  assert.equal(created.length, 2);
  assert.equal(skipped.length, 0);
  assert.equal(created[0].email, 'raj@example.com');
  assert.equal(created[0].phone, '+15550001111');
  assert.equal(created[0].max_party, 4);
  assert.equal(created[1].phone, '+15552223333');
});

test('marking invited and CSV export work', async () => {
  const mark = await json('POST', `/api/admin/guests/${guestId}/invited`, { via: 'whatsapp' });
  assert.equal((await mark.json()).guest.invited_via, 'whatsapp');
  const csv = await json('GET', '/api/admin/export.csv');
  assert.equal(csv.status, 200);
  const text = await csv.text();
  assert.match(text, /Aunt Meera,attending,2,1/);
  assert.match(text, /Walk-in Wendy,declined/);
});

test('settings can be updated and validated', async () => {
  const bad = await json('PUT', '/api/admin/settings', { schedule_json: '{not json' });
  assert.equal(bad.status, 400);
  const good = await json('PUT', '/api/admin/settings', { child_name: 'Darsha ✨', venue_name: 'Fern Hollow', schedule_json: JSON.stringify([{ time: '1 PM', title: 'Hello', detail: 'World' }]) });
  assert.equal(good.status, 200);
  const ev = await (await fetch(`${base}/api/event`)).json();
  assert.equal(ev.event.child_name, 'Darsha ✨');
  assert.equal(ev.event.schedule.length, 1);
});

test('wishes can be hidden by the host', async () => {
  const list = await json('GET', '/api/admin/wishes');
  const { wishes } = await list.json();
  await json('PATCH', `/api/admin/wishes/${wishes[0].id}`, { approved: false });
  const pub = await (await fetch(`${base}/api/wishes`)).json();
  assert.equal(pub.wishes.length, 0);
});

test('email sending reports it is not configured', async () => {
  const res = await json('POST', `/api/admin/guests/${guestId}/send-email`, { kind: 'invite' });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /not configured/);
});

test('unknown API routes 404 as JSON and pages 404 as HTML', async () => {
  const api = await fetch(`${base}/api/nothing`);
  assert.equal(api.status, 404);
  assert.equal((await api.json()).error, 'Not found');
  const page = await fetch(`${base}/somewhere/lost`);
  assert.equal(page.status, 404);
  assert.match(await page.text(), /Lost in the woods/);
});
