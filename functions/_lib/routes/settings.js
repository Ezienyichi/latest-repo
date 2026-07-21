import { Hono } from 'hono';

const settings = new Hono();

// Public, read-only subset of SiteSetting — safe for any visitor to see.
// Keeps the split rates admin-editable (via /api/admin/settings) while
// letting unauthenticated pages (checkout) show the real numbers instead
// of a guess baked into the frontend.
const PUBLIC_KEYS = ['charity_pct', 'platform_pct'];
const DEFAULTS = { charity_pct: 0.10, platform_pct: 0.10 };

settings.get('/public', async (c) => {
  const prisma = c.get('prisma');
  try {
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: PUBLIC_KEYS } } });
    const map = { ...DEFAULTS };
    for (const r of rows) if (typeof r.value === 'number') map[r.key] = r.value;
    return c.json(map);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default settings;
