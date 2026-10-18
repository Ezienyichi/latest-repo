import { Hono } from 'hono';
import { checkRateLimit } from '../rateLimit.js';

const newsletter = new Hono();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCES = ['popup', 'homepage'];
const LIMIT = 10;
const WINDOW_SECONDS = 600;

// Public. Idempotent: re-subscribing an existing email is a silent success
// (upsert with an empty update) so the response never reveals whether an
// address is already on the list.
newsletter.post('/', async (c) => {
  const prisma = c.get('prisma');
  try {
    const body = await c.req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) return c.json({ error: 'Enter a valid email' }, 400);
    if (!SOURCES.includes(body.source)) return c.json({ error: 'Invalid source' }, 400);

    const ip = c.req.header('cf-connecting-ip') || 'unknown';
    const ok = await checkRateLimit(c.env.RATE_LIMIT_KV, `newsletter:${ip}`, LIMIT, WINDOW_SECONDS);
    if (!ok) return c.json({ error: 'Too many attempts — please try again later' }, 429);

    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {},
      create: { email, source: body.source },
    });
    return c.json({ ok: true }, 201);
  } catch (e) { return c.json({ error: 'Signup failed' }, 500); }
});

export default newsletter;
