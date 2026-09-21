// Date helpers: pretty formatting in the venue timezone and iCalendar export.

// Interpret a "wall clock" ISO string (no offset) as being in `tz`, and return the UTC Date.
export function zonedToUtc(isoLocal, tz) {
  const naive = new Date(isoLocal.length <= 10 ? `${isoLocal}T00:00:00Z` : `${isoLocal}Z`);
  if (Number.isNaN(naive.getTime())) return null;
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = Object.fromEntries(fmt.formatToParts(naive).map((p) => [p.type, p.value]));
    const asIfUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    const offset = asIfUtc - naive.getTime();
    return new Date(naive.getTime() - offset);
  } catch {
    return naive;
  }
}

export function formatEventDate(isoLocal, tz) {
  const d = zonedToUtc(isoLocal, tz);
  if (!d) return isoLocal;
  try {
    return d.toLocaleString('en-US', {
      timeZone: tz,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return isoLocal;
  }
}

function icsStamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function icsEscape(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/[,;]/g, (m) => `\\${m}`);
}

export function buildIcs(settings, url) {
  const start = zonedToUtc(settings.event_date, settings.timezone) || new Date();
  const end = zonedToUtc(settings.event_end, settings.timezone) || new Date(start.getTime() + 3 * 3600 * 1000);
  const uid = `darsha-first-birthday-${start.getTime()}@enchanted-garden`;
  const location = [settings.venue_name, settings.venue_address].filter(Boolean).join(', ');
  const description = `${settings.tagline}${url ? `\n\nRSVP: ${url}` : ''}`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Enchanted Garden Birthday//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(settings.event_title)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    `LOCATION:${icsEscape(location)}`,
    url ? `URL:${url}` : null,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(settings.event_title)} is tomorrow!`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

export function googleCalendarUrl(settings, url) {
  const start = zonedToUtc(settings.event_date, settings.timezone) || new Date();
  const end = zonedToUtc(settings.event_end, settings.timezone) || new Date(start.getTime() + 3 * 3600 * 1000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: settings.event_title,
    dates: `${icsStamp(start)}/${icsStamp(end)}`,
    details: `${settings.tagline}${url ? `\n\nRSVP: ${url}` : ''}`,
    location: [settings.venue_name, settings.venue_address].filter(Boolean).join(', '),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
