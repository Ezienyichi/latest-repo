import { Hono } from 'hono';
import { authenticate, requireRole } from '../auth.js';

const admin = new Hono();
admin.use('*', authenticate, requireRole('ADMIN'));

admin.get('/users', async (c) => {
  const prisma = c.get('prisma');
  try {
    const q = c.req.query();
    const { role, search } = q;
    const page = q.page || 1, limit = q.limit || 20;
    const where = {};
    if (role) where.role = role;
    if (search) where.OR = [{ email: { contains: search, mode: 'insensitive' } }, { firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }];
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip: (page - 1) * limit, take: parseInt(limit), orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, role: true, firstName: true, lastName: true, emailVerified: true, createdAt: true, artistProfile: { select: { displayName: true, verified: true } }, charityProfile: { select: { name: true, verified: true } } },
      }),
      prisma.user.count({ where }),
    ]);
    return c.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.patch('/users/:id', async (c) => {
  const prisma = c.get('prisma');
  try {
    const { role } = await c.req.json();
    const data = {};
    if (role) data.role = role;
    const user = await prisma.user.update({ where: { id: c.req.param('id') }, data });
    return c.json(user);
  } catch (e) { return c.json({ error: 'Update failed' }, 500); }
});

admin.post('/verify-artist/:id', async (c) => {
  const prisma = c.get('prisma');
  try {
    const profile = await prisma.artistProfile.update({ where: { id: c.req.param('id') }, data: { verified: true } });
    return c.json({ message: 'Artist verified', profile });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.post('/verify-charity/:id', async (c) => {
  const prisma = c.get('prisma');
  try {
    const profile = await prisma.charityProfile.update({ where: { id: c.req.param('id') }, data: { verified: true } });
    return c.json({ message: 'Charity verified', profile });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.get('/moderation', async (c) => {
  const prisma = c.get('prisma');
  try {
    const [pendingArtists, pendingCharities, draftProducts] = await Promise.all([
      prisma.artistProfile.findMany({ where: { verified: false }, include: { user: { select: { email: true, firstName: true, lastName: true } } } }),
      prisma.charityProfile.findMany({ where: { verified: false }, include: { user: { select: { email: true } } } }),
      prisma.product.findMany({ where: { status: 'DRAFT' }, include: { artist: { select: { displayName: true } } }, take: 20 }),
    ]);
    return c.json({ pendingArtists, pendingCharities, draftProducts });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.patch('/products/:id/moderate', async (c) => {
  const prisma = c.get('prisma');
  try {
    const { status } = await c.req.json();
    const product = await prisma.product.update({ where: { id: c.req.param('id') }, data: { status } });
    return c.json(product);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.get('/analytics', async (c) => {
  const prisma = c.get('prisma');
  try {
    const [usersByRole, ordersByStatus, topArtists, topCharities, recentOrders] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.order.groupBy({ by: ['status'], _count: true, _sum: { totalAmount: true } }),
      prisma.artistProfile.findMany({ orderBy: { totalSold: 'desc' }, take: 5, select: { displayName: true, totalSold: true, artworkCount: true, verified: true } }),
      prisma.charityProfile.findMany({ orderBy: { raised: 'desc' }, take: 5, select: { name: true, raised: true, funderCount: true } }),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { buyer: { select: { email: true, firstName: true } }, _count: { select: { items: true } } } }),
    ]);
    return c.json({ usersByRole, ordersByStatus, topArtists, topCharities, recentOrders });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default admin;
