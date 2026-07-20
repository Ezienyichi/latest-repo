import { Hono } from 'hono';
import { authenticate } from '../auth.js';

const charities = new Hono();

charities.get('/', async (c) => {
  const prisma = c.get('prisma');
  try {
    const list = await prisma.charityProfile.findMany({ include: { resources: { where: { visibility: 'PUBLIC' } } }, orderBy: { raised: 'desc' } });
    return c.json(list);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

charities.get('/:id', async (c) => {
  const prisma = c.get('prisma');
  try {
    const charity = await prisma.charityProfile.findUnique({
      where: { id: c.req.param('id') },
      include: { resources: true, partnerships: { include: { artist: { select: { displayName: true, avatarUrl: true, id: true } } } }, templates: { where: { isSystem: false } } },
    });
    if (!charity) return c.json({ error: 'Not found' }, 404);
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
