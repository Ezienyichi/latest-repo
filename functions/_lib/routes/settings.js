import { Hono } from 'hono';

const settings = new Hono();

// Public, read-only subset of SiteSetting — safe for any visitor to see.
// Keeps the split rates admin-editable (via /api/admin/settings) while
// letting unauthenticated pages (checkout) show the real numbers instead
// of a guess baked into the frontend.
const PUBLIC_KEYS = ['charity_pct', 'platform_pct', 'theory_if', 'theory_and_if', 'theory_then'];
const DEFAULTS = {
  charity_pct: 0.10,
  platform_pct: 0.10,
  theory_if: 'If talented creatives are provided with a trusted platform to commercialize their creative work while partnering with credible charitable organizations and community initiatives,',
  theory_and_if: 'and if consumers, businesses, philanthropists, and corporate partners are given transparent opportunities to purchase creative products that directly finance SDG-aligned projects,',
  theory_then: 'then creative commerce can become a sustainable source of philanthropic capital that strengthens nonprofit organizations, empowers creative entrepreneurs, and delivers measurable improvements in communities across the world.',
};

settings.get('/public', async (c) => {
  const prisma = c.get('prisma');
  try {
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: PUBLIC_KEYS } } });
    const map = { ...DEFAULTS };
    for (const r of rows) if (typeof r.value === 'number' || typeof r.value === 'string') map[r.key] = r.value;
    return c.json(map);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default settings;
