import { Hono } from 'hono';
import { LEGAL_DOCS, legalDoc, latestVersion } from '../legal.js';

// PUBLIC. The five legal pages. A page is "published" once it has a version;
// the public always sees the latest one, and any older version stays viewable
// at /:slug/versions/:n (so "version 1" in an order or agreement record can be read back).
const legal = new Hono();

const view = (d) => ({ slug: d.slug, title: d.title, version: d.version, publishedAt: d.publishedAt, body: d.body });

legal.get('/', async (c) => {
  const prisma = c.get('prisma');
  try {
    const out = [];
    for (const d of LEGAL_DOCS) {
      const cur = await latestVersion(prisma, d.slug);
      out.push({ slug: d.slug, title: d.title, version: cur?.version ?? null, publishedAt: cur?.publishedAt ?? null });
    }
    return c.json({ items: out });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

legal.get('/:slug', async (c) => {
  const prisma = c.get('prisma');
  try {
    const meta = legalDoc(c.req.param('slug'));
    if (!meta) return c.json({ error: 'Not found' }, 404);
    const cur = await latestVersion(prisma, meta.slug);
    if (!cur) return c.json({ error: 'This page has not been published yet', title: meta.title }, 404);
    return c.json(view(cur));
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

legal.get('/:slug/versions/:n', async (c) => {
  const prisma = c.get('prisma');
  try {
    const meta = legalDoc(c.req.param('slug')); const n = /^[0-9]{1,9}$/.test(c.req.param('n')) ? parseInt(c.req.param('n'), 10) : NaN;   // strict: '1.5' / '1abc' are not version 1
    if (!meta || !Number.isInteger(n) || n < 1) return c.json({ error: 'Not found' }, 404);
    const doc = await prisma.legalDocument.findUnique({ where: { slug_version: { slug: meta.slug, version: n } } });
    if (!doc) return c.json({ error: 'Not found' }, 404);
    return c.json(view(doc));
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default legal;
