import { Hono } from 'hono';

const content = new Hono();

// Public, read-only. Admin write routes land later alongside the CRUD UI
// for PageContent/TeamMember — this only needs to serve what's already
// seeded so the About page has something to render.
content.get('/page/:slug', async (c) => {
  const prisma = c.get('prisma');
  try {
    const row = await prisma.pageContent.findUnique({ where: { slug: c.req.param('slug') } });
    if (!row) return c.json({ error: 'Not found' }, 404);
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
