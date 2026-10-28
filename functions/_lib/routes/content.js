import { Hono } from 'hono';
import { publicPartners } from '../partners.js';

const content = new Hono();

// Public, read-only. (Partners are managed through /api/admin/partners;
// the other PageContent rows and TeamMember have no admin editor yet.)
content.get('/page/:slug', async (c) => {
  const prisma = c.get('prisma');
  try {
    const row = await prisma.pageContent.findUnique({ where: { slug: c.req.param('slug') } });
    if (!row) return c.json({ error: 'Not found' }, 404);
    // Partners: inactive ones are for the admin only, and only display fields go out.
    if (row.slug === 'partners') return c.json({ slug: row.slug, title: row.title, updatedAt: row.updatedAt, body: { logos: publicPartners(row.body?.logos) } });
    return c.json(row);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

content.get('/team', async (c) => {
  const prisma = c.get('prisma');
  try {
    const members = await prisma.teamMember.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
    return c.json(members);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default content;
