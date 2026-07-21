import { Hono } from 'hono';
import { authenticate, requireRole } from '../auth.js';
import { writeAuditLog } from '../audit.js';

const admin = new Hono();
admin.use('*', authenticate, requireRole('ADMIN'));

// Known SiteSetting keys and their validators. PUT rejects anything not
// listed here — a typo'd key should fail loudly, not silently create a
// setting nothing reads.
const SETTING_VALIDATORS = {
  charity_pct: async (value, prisma) => {
    if (typeof value !== 'number' || !isFinite(value) || value < 0) return 'Must be a non-negative number';
    const otherRow = await prisma.siteSetting.findUnique({ where: { key: 'platform_pct' } });
    const other = typeof otherRow?.value === 'number' ? otherRow.value : 0.10;
    if (value + other > 1) return `charity_pct + platform_pct cannot exceed 1 (platform_pct is currently ${other}) — the artist share would go negative`;
    return null;
  },
  platform_pct: async (value, prisma) => {
    if (typeof value !== 'number' || !isFinite(value) || value < 0) return 'Must be a non-negative number';
    const otherRow = await prisma.siteSetting.findUnique({ where: { key: 'charity_pct' } });
    const other = typeof otherRow?.value === 'number' ? otherRow.value : 0.10;
    if (value + other > 1) return `charity_pct + platform_pct cannot exceed 1 (charity_pct is currently ${other}) — the artist share would go negative`;
    return null;
  },
  site_name: async (value) => (typeof value === 'string' && value.trim()) ? null : 'Must be a non-empty string',
  tagline: async (value) => (typeof value === 'string' && value.trim()) ? null : 'Must be a non-empty string',
  footer_copyright: async (value) => (typeof value === 'string' && value.trim()) ? null : 'Must be a non-empty string',
  contact_email: async (value) => (typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) ? null : 'Must be a valid email address',
  maintenance_mode: async (value) => (typeof value === 'boolean') ? null : 'Must be true or false',
  maintenance_message: async (value) => (typeof value === 'string') ? null : 'Must be a string',
  show_homepage_stats: async (value) => (typeof value === 'boolean') ? null : 'Must be true or false',
};

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
    const id = c.req.param('id');
    const { role } = await c.req.json();
    const before = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!before) return c.json({ error: 'Not found' }, 404);
    const data = {};
    if (role) data.role = role;
    const user = await prisma.user.update({ where: { id }, data });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'user.role_change', targetType: 'User', targetId: id, before, after: { role: user.role } });
    return c.json(user);
  } catch (e) { return c.json({ error: 'Update failed' }, 500); }
});

admin.post('/verify-artist/:id', async (c) => {
  const prisma = c.get('prisma');
  try {
    const id = c.req.param('id');
    const before = await prisma.artistProfile.findUnique({ where: { id }, select: { verified: true } });
    if (!before) return c.json({ error: 'Not found' }, 404);
    const profile = await prisma.artistProfile.update({ where: { id }, data: { verified: true } });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'artist.verify', targetType: 'ArtistProfile', targetId: id, before, after: { verified: profile.verified } });
    return c.json({ message: 'Artist verified', profile });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.post('/verify-charity/:id', async (c) => {
  const prisma = c.get('prisma');
  try {
    const id = c.req.param('id');
    const before = await prisma.charityProfile.findUnique({ where: { id }, select: { verified: true } });
    if (!before) return c.json({ error: 'Not found' }, 404);
    const profile = await prisma.charityProfile.update({ where: { id }, data: { verified: true } });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'charity.verify', targetType: 'CharityProfile', targetId: id, before, after: { verified: profile.verified } });
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
    const id = c.req.param('id');
    const { status } = await c.req.json();
    const before = await prisma.product.findUnique({ where: { id }, select: { status: true } });
    if (!before) return c.json({ error: 'Not found' }, 404);
    const product = await prisma.product.update({ where: { id }, data: { status } });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'product.status_change', targetType: 'Product', targetId: id, before, after: { status: product.status } });
    return c.json(product);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.get('/settings', async (c) => {
  const prisma = c.get('prisma');
  try {
    const rows = await prisma.siteSetting.findMany();
    const map = {};
    for (const r of rows) map[r.key] = r.value;
    return c.json(map);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.put('/settings/:key', async (c) => {
  const prisma = c.get('prisma');
  try {
    const key = c.req.param('key');
    const validate = SETTING_VALIDATORS[key];
    if (!validate) return c.json({ error: `Unknown setting key: ${key}` }, 400);
    const { value } = await c.req.json();
    const validationError = await validate(value, prisma);
    if (validationError) return c.json({ error: validationError }, 400);
    const before = await prisma.siteSetting.findUnique({ where: { key } });
    const row = await prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'setting.update', targetType: 'SiteSetting', targetId: key, before: before ? { value: before.value } : null, after: { value: row.value } });
    return c.json(row);
  } catch (e) { return c.json({ error: 'Update failed' }, 500); }
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
