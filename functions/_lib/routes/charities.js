import { Hono } from 'hono';
import { authenticate, optionalAuth } from '../auth.js';

const charities = new Hono();

charities.get('/', async (c) => {
  const prisma = c.get('prisma');
  try {
    const list = await prisma.charityProfile.findMany({ include: { resources: { where: { visibility: 'PUBLIC' } } }, orderBy: { raised: 'desc' } });
    return c.json(list);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

// FUNDERS_ONLY resources are only included for the charity's own owner, an
// actual funder of this charity, or an admin — everyone else (including
// anonymous visitors) gets the same PUBLIC-only view the list endpoint
// above uses. Same entitlement /api/uploads/download checks before handing
// over the file, kept consistent so the list a viewer sees always matches
// what they're actually allowed to open.
charities.get('/:id', optionalAuth, async (c) => {
  const prisma = c.get('prisma');
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const userRole = c.get('userRole');
    const charity = await prisma.charityProfile.findUnique({
      where: { id },
      include: { resources: true, partnerships: { include: { artist: { select: { displayName: true, avatarUrl: true, id: true } } } }, templates: { where: { isSystem: false } } },
    });
    if (!charity) return c.json({ error: 'Not found' }, 404);

    let seeFundersOnly = userRole === 'ADMIN' || charity.userId === userId;
    if (!seeFundersOnly && userId) {
      const funder = await prisma.funderRelationship.findUnique({ where: { userId_charityId: { userId, charityId: id } } });
      seeFundersOnly = !!funder;
    }
    if (!seeFundersOnly) charity.resources = charity.resources.filter(r => r.visibility === 'PUBLIC');

    return c.json(charity);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

charities.post('/:id/funder', authenticate, async (c) => {
  const prisma = c.get('prisma');
  try {
    await prisma.funderRelationship.upsert({
      where: { userId_charityId: { userId: c.get('userId'), charityId: c.req.param('id') } },
      update: {},
      create: { userId: c.get('userId'), charityId: c.req.param('id'), source: 'NEWSLETTER' },
    });
    await prisma.charityProfile.update({ where: { id: c.req.param('id') }, data: { funderCount: { increment: 1 } } });
    return c.json({ message: 'You are now supporting this charity' });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default charities;
