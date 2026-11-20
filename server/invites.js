// Builds personalised invitation messages and share links for WhatsApp / email.
import { formatEventDate } from './dates.js';

export function baseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export function inviteLink(req, guest) {
  return `${baseUrl(req)}/i/${guest.token}`;
}

export function fillTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}

export function templateVars(settings, guest, link) {
  return {
    name: guest?.name || 'friend',
    child: settings.child_name,
    date: formatEventDate(settings.event_date, settings.timezone),
    venue: [settings.venue_name, settings.venue_address].filter(Boolean).join(', '),
    deadline: settings.rsvp_deadline
      ? new Date(settings.rsvp_deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      : 'soon',
    link,
    parents: settings.parents_names,
    ladies: settings.dress_code_ladies || '',
    gents: settings.dress_code_gents || '',
  };
}

// Digits-only number for wa.me links, which need the country code. Ten-digit
// numbers typed without one are assumed local (DEFAULT_COUNTRY_CODE, US "1").
export function whatsappNumber(phone) {
  const raw = String(phone || '').trim();
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (raw.startsWith('+')) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.length === 10) digits = (process.env.DEFAULT_COUNTRY_CODE || '1').replace(/\D/g, '') + digits;
  return digits;
}

export function buildInvite(req, settings, guest) {
  const link = inviteLink(req, guest);
  const vars = templateVars(settings, guest, link);
  const whatsappText = fillTemplate(settings.whatsapp_template, vars);
  const emailSubject = fillTemplate(settings.email_subject_template, vars);
  const emailBody = fillTemplate(settings.email_template, vars);

  const phoneDigits = whatsappNumber(guest.phone);
  const whatsappUrl = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(whatsappText)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
  const mailtoUrl = `mailto:${encodeURIComponent(guest.email || '')}?subject=${encodeURIComponent(
    emailSubject
  )}&body=${encodeURIComponent(emailBody)}`;

  return { link, whatsappText, whatsappUrl, emailSubject, emailBody, mailtoUrl };
}

const DEFAULT_REMINDER = `Hi {name}! 🌸 A gentle reminder from the enchanted garden: we'd love to know if you can join {child}'s first birthday on {date}. RSVP here: {link}`;

export function reminderMessage(settings, guest, link) {
  const vars = templateVars(settings, guest, link);
  const template = settings.reminder_template && settings.reminder_template.trim() ? settings.reminder_template : DEFAULT_REMINDER;
  return fillTemplate(template, vars);
}
