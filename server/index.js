import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initDb } from './db.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { isDefaultPassword } from './auth.js';
import { emailConfigured } from './mailer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const PORT = Number(process.env.PORT || 3000);

export function createApp() {
  const ready = initDb();
  ready.catch((e) => console.error('Database initialisation failed:', e));
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(express.json({ limit: '200kb' }));
  app.use(express.urlencoded({ extended: false }));

  // Make sure tables exist and defaults are seeded before handling any request.
  app.use((req, res, next) => {
    ready.then(() => next(), next);
  });

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  app.use(publicRoutes);
  app.use('/api/admin', adminRoutes);

  // Personal invitation links render the main page; the client reads the token from the URL.
  app.get('/i/:token', (req, res) => res.sendFile(join(PUBLIC_DIR, 'index.html')));
  app.get(['/admin', '/admin/'], (req, res) => res.sendFile(join(PUBLIC_DIR, 'admin', 'index.html')));

  app.use(express.static(PUBLIC_DIR, { extensions: ['html'], maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.status(404).sendFile(join(PUBLIC_DIR, '404.html'));
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed request body.' });
    res.status(500).json({ error: 'Something went wrong in the garden. Please try again.' });
  });

  return app;
}

// Vercel imports this module and serves the exported app; locally we listen ourselves.
const app = createApp();
export default app;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  app.listen(PORT, () => {
    console.log(`🌷 Enchanted Garden party site running at http://localhost:${PORT}`);
    console.log(`   Admin dashboard: http://localhost:${PORT}/admin`);
    if (isDefaultPassword()) console.warn('   ⚠ Using default admin password "enchanted". Set ADMIN_PASSWORD before sharing the site.');
    console.log(`   Email sending: ${emailConfigured() ? 'configured (SMTP)' : 'not configured — using mailto links'}`);
  });
}
