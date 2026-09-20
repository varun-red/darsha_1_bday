// Minimal, dependency-free admin auth: password check + HMAC-signed session cookie.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { sessionSecret } from './db.js';

const COOKIE = 'garden_admin';
const SESSION_HOURS = 24 * 7;

export function adminPassword() {
  return process.env.ADMIN_PASSWORD || 'enchanted';
}

export function isDefaultPassword() {
  return !process.env.ADMIN_PASSWORD;
}

function secret() {
  return process.env.SESSION_SECRET || sessionSecret();
}

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function issueSession(res) {
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  const payload = String(exp);
  const value = `${payload}.${sign(payload)}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}${secure}`
  );
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

export function hasValidSession(req) {
  const raw = readCookie(req, COOKIE);
  if (!raw) return false;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(payload) > Date.now();
}

export function checkPassword(candidate) {
  const a = Buffer.from(String(candidate ?? ''));
  const b = Buffer.from(adminPassword());
  if (a.length !== b.length) {
    // Still perform a comparison to keep timing roughly constant.
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

// Simple in-memory rate limiter for the login endpoint.
const attempts = new Map();
export function loginRateLimited(ip) {
  const now = Date.now();
  const rec = attempts.get(ip) || { count: 0, first: now };
  if (now - rec.first > 15 * 60 * 1000) {
    rec.count = 0;
    rec.first = now;
  }
  rec.count += 1;
  attempts.set(ip, rec);
  return rec.count > 20;
}

export function requireAdmin(req, res, next) {
  if (hasValidSession(req)) return next();
  res.status(401).json({ error: 'Not authorised' });
}
