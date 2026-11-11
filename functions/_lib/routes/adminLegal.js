import { Hono } from 'hono';
import { writeAuditLog } from '../audit.js';
import { LEGAL_DOCS, legalDoc, latestVersion } from '../legal.js';

// Mounted under /api/admin (admin-only). Publishing is the ONLY write: it adds
// version n+1. There is deliberately no route that edits or deletes a version.
const adminLegal = new Hono();

const MAX_BODY = 300_000;

adminLegal.get('/', async (c) => {
  const prisma = c.get('prisma');
  try {
    const items = [];
    for (const d of LEGAL_DOCS) {
      const [cur, count] = await Promise.all([latestVersion(prisma, d.slug), prisma.legalDocument.count({ where: { slug: d.slug } })]);
      items.push({ slug: d.slug, title: d.title, version: cur?.version ?? null, publishedAt: cur?.publishedAt ?? null, versionCount: count });
    }
    return c.json({ items });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

// The current text plus the full version history (metadata only — bodies are fetched one at a time).
adminLegal.get('/:slug', async (c) => {
  const prisma = c.get('prisma');
  try {
    const meta = legalDoc(c.req.param('slug'));
    if (!meta) return c.json({ error: 'Not found' }, 404);
    const rows = await prisma.legalDocument.findMany({ where: { slug: meta.slug }, orderBy: { version: 'desc' } });
    return c.json({
      slug: meta.slug, title: meta.title,
      current: rows[0] || null,
      versions: rows.map(r => ({ version: r.version, publishedAt: r.publishedAt, createdBy: r.createdBy, changeNote: r.changeNote, length: r.body.length })),
    });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

adminLegal.get('/:slug/versions/:n', async (c) => {
  const prisma = c.get('prisma');
  try {
    const meta = legalDoc(c.req.param('slug')); const n = /^[0-9]{1,9}$/.test(c.req.param('n')) ? parseInt(c.req.param('n'), 10) : NaN;   // strict: '1.5' / '1abc' are not version 1
    if (!meta || !Number.isInteger(n)) return c.json({ error: 'Not found' }, 404);
    const doc = await prisma.legalDocument.findUnique({ where: { slug_version: { slug: meta.slug, version: n } } });
    return doc ? c.json(doc) : c.json({ error: 'Not found' }, 404);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

adminLegal.post('/:slug', async (c) => {
  const prisma = c.get('prisma');
  try {
    const meta = legalDoc(c.req.param('slug'));
    if (!meta) return c.json({ error: 'Unknown legal page' }, 404);
    const { body, changeNote } = await c.req.json().catch(() => ({}));
    if (typeof body !== 'string' || !body.trim()) return c.json({ error: 'The text can\'t be empty' }, 400);
    if (body.length > MAX_BODY) return c.json({ error: `The text is too long (max ${MAX_BODY.toLocaleString()} characters)` }, 400);
    if (changeNote != null && (typeof changeNote !== 'string' || changeNote.length > 300)) return c.json({ error: 'The change note must be 300 characters or fewer' }, 400);
    const text = body.replace(/\r\n/g, '\n').trim();
    const cur = await latestVersion(prisma, meta.slug);
    if (cur && cur.body === text) return c.json({ error: 'No changes — this is identical to the current version' }, 409);
    const version = (cur?.version ?? 0) + 1;
    let doc;
    try {
      doc = await prisma.legalDocument.create({ data: { slug: meta.slug, version, title: meta.title, body: text, changeNote: changeNote?.trim() || null, createdBy: c.get('userId') } });
    } catch (e) {
      // two admins published at the same instant — the unique (slug, version) key lets only one win
      if (e.code === 'P2002') return c.json({ error: 'Someone else published a new version at the same moment — reload and try again' }, 409);
      throw e;
    }
    await writeAuditLog(prisma, {
      adminId: c.get('userId'), action: 'legal.publish', targetType: 'LegalDocument', targetId: `${meta.slug}@v${version}`,
      before: cur ? { version: cur.version, length: cur.body.length } : null, after: { version, length: text.length, changeNote: doc.changeNote },
    });
    return c.json({ slug: doc.slug, version: doc.version, publishedAt: doc.publishedAt }, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Publish failed' }, 500); }
});

export default adminLegal;
