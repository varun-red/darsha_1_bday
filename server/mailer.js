// Optional email sending. When SMTP_* env vars are set, invitations and RSVP
// confirmations go out via nodemailer; otherwise the admin UI falls back to
// mailto: links which open the host's own email client pre-filled.
import nodemailer from 'nodemailer';

let transport;

export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  if (!emailConfigured()) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

export function fromAddress(settings) {
  return process.env.SMTP_FROM || `"${settings?.parents_names || 'The Enchanted Forest'}" <${process.env.SMTP_USER}>`;
}

export async function sendMail({ to, subject, text, html, settings }) {
  const t = getTransport();
  if (!t) throw new Error('Email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.');
  return t.sendMail({ from: fromAddress(settings), to, subject, text, html: html || textToHtml(text) });
}

export function textToHtml(text) {
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const linked = esc(text).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color:#c9a227">$1</a>');
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0b1f1a;font-family:Georgia,serif;color:#f3ead7">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="background:linear-gradient(180deg,#123527,#0b1f1a);border:1px solid #2e6b4f;border-radius:20px;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,.4)">
      <div style="text-align:center;font-size:40px;line-height:1">🌲🍄✨</div>
      <div style="white-space:pre-wrap;font-size:17px;line-height:1.6;margin-top:16px">${linked}</div>
    </div>
    <p style="text-align:center;color:#8fae9b;font-size:12px;margin-top:20px">Sent with love from the Enchanted Forest</p>
  </div></body></html>`;
}
