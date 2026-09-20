# 🌷 Darsha Turns One · Enchanted Garden Birthday Site

A single-page, interactive party website with a full RSVP system and a private hosts' dashboard for managing the guest list and sending invitations by WhatsApp or email.

## What guests see

- **A garden at magic hour** — a plum-to-peach dusk sky with string lights, a rose-and-wisteria arch framing the title, hazy distant trees, hedges and topiary, and flower beds in the foreground, all generated procedurally with mouse and scroll parallax. Butterflies flutter across the page and gather around the cursor, petals drift down, fairy dust glows, and clicking anywhere releases a sparkle burst.
- **Countdown** in blooming flowers, plus one-tap "Add to Google Calendar" and `.ics` download.
- **Details cards** — when, where (with map link), dress code and good-to-know notes.
- **A garden party unfolds** — the day's schedule laid out along a fairy-light vine.
- **First-year milestones** — a swipeable strip of polaroid-style cards (add photo URLs in settings).
- **RSVP** — yes/no choice, grown-ups and kids steppers, names & ages, dietary needs, high chair, song request, a note for the birthday girl, and "find & edit my RSVP" by email/phone. Success triggers a sparkle burst, a petal shower and a chime.
- **The Wishing Garden** — every wish blooms as a flower in the bed; hover or tap a bloom to read it.
- **Gift note**, FAQ accordion, and an optional ambient garden soundscape with birdsong and chimes (synthesised, no audio files).
- **Personal invitation links** (`/i/<token>`) greet each guest by name and pre-fill their RSVP.

## What hosts get (`/admin`)

- **Overview** — headcount, grown-ups vs kids, responses bar, dietary notes, latest replies.
- **Guest list** — add guests one at a time or paste a list from a spreadsheet; search and filter by status; edit, delete, or record an RSVP on someone's behalf.
- **Invite** drawer per guest — personal link, **WhatsApp** deep link with a pre-filled message, **email** (sent from the site when SMTP is configured, otherwise opens your mail app pre-filled), copy message, **printable QR code**, and a gentle **reminder** flow. Invitations are marked sent automatically.
- **Wishing Garden moderation** — hide or delete wishes.
- **Event settings** — every word on the site (names, dates, venue, dress code, schedule, milestones, FAQ, message templates) is editable live.
- **CSV export** of the full guest list.

## Run it locally

Requires Node.js 22 or newer. Data is stored in a local SQLite file via libSQL.

```bash
npm install
ADMIN_PASSWORD=your-secret npm start
# → http://localhost:3000        the party site
# → http://localhost:3000/admin  the hosts' dashboard
```

Run the API tests with `npm test`.

## Configuration

Copy `.env.example` and set the variables in your shell or hosting dashboard.

| Variable | Purpose |
| --- | --- |
| `ADMIN_PASSWORD` | Dashboard password. Defaults to `enchanted` with a warning — change it before sharing. |
| `PUBLIC_URL` | Public site URL used in invite links, QR codes and emails. |
| `DB_PATH` | Local SQLite file location (default `./data/party.sqlite`). Used when no Turso URL is set. |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Hosted [Turso](https://turso.tech) database. Required on serverless hosts such as Vercel, where the filesystem is not persistent. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional. Enables sending invitations, reminders and RSVP confirmations directly. Gmail works with an App Password. |
| `PORT` | Port to listen on (default 3000). |

## Deploy

### Vercel

The project deploys as an Express app with zero config. Because Vercel has no persistent disk, add the **Turso** integration from the Vercel Marketplace (`vercel integration add tursocloud/database`), which sets `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` on the project. Then set `ADMIN_PASSWORD` and `PUBLIC_URL` and run `vercel --prod`. Pushes to `main` deploy automatically once the GitHub repo is connected.

### Docker hosts

The included `Dockerfile` works on Fly.io, Railway, Render and similar. Mount a volume at `/app/data` so RSVPs survive restarts, set `ADMIN_PASSWORD` and `PUBLIC_URL`, and you're done.

```bash
docker build -t darsha-bday .
docker run -p 3000:3000 -v $(pwd)/data:/app/data -e ADMIN_PASSWORD=secret darsha-bday
```

## Project layout

```
server/            Express app
  index.js         app setup & static hosting
  db.js            SQLite schema, settings, guests, RSVPs, wishes
  routes/public.js event data, RSVP, wishes, calendar feed
  routes/admin.js  login, guest management, invites, export, settings
  invites.js       WhatsApp / email message building
  mailer.js        optional SMTP sending
  dates.js         timezone-aware formatting & iCalendar
  auth.js          password check & signed session cookie
public/
  index.html       the party site
  css/site.css     enchanted garden theme
  js/garden.js     procedural garden layers, butterflies, petals, parallax, sound
  js/main.js       content binding, countdown, RSVP, wishing garden
  admin/           hosts' dashboard
test/              API tests (node --test)
```
