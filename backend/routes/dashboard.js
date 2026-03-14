import { Router } from 'express';
import prisma from '../utils/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// ── ARTIST DASHBOARD ────────────────────────────────────────
router.get('/artist', authenticate, requireRole('ARTIST'), async (req, res) => {
  try {
    const profile = await prisma.artistProfile.findUnique({ where: { userId: req.userId } });
    if (!profile) return res.status(404).json({ error: 'No artist profile' });

    const [products, orderItems, totalEarnings, partnerships] = await Promise.all([
      prisma.product.findMany({
        where: { artistId: profile.id },
        include: { charity: { select: { name: true, logo: true } }, reviews: { select: { rating: true } }, _count: { select: { orderItems: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.orderItem.findMany({
        where: { product: { artistId: profile.id } },
        include: { order: { select: { id: true, status: true, createdAt: true, shippingAddress: true, buyerId: true } }, product: { select: { title: true, images: true, slug: true } } },
        orderBy: { order: { createdAt: 'desc' } },
        take: 50,
      }),
      prisma.orderItem.aggregate({
        where: { product: { artistId: profile.id }, order: { status: { in: ['DELIVERED', 'SHIPPED', 'PROCESSING'] } } },
        _sum: { unitPrice: true, charitySplitAmt: true, platformFeeAmt: true },
      }),
      prisma.artistCharityPartnership.findMany({
        where: { artistId: profile.id },
        include: { charity: { select: { id: true, name: true, logo: true, sdgIds: true } } },
      }),
    ]);

    const gross = Number(totalEarnings._sum.unitPrice || 0);
    const charityTotal = Number(totalEarnings._sum.charitySplitAmt || 0);
    const platformTotal = Number(totalEarnings._sum.platformFeeAmt || 0);
    const netEarnings = gross - charityTotal - platformTotal;

    // Monthly earnings breakdown (last 6 months)
    const monthlyEarnings = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const monthItems = orderItems.filter(oi => {
        const created = new Date(oi.order.createdAt);
        return created >= start && created <= end && ['DELIVERED', 'SHIPPED', 'PROCESSING'].includes(oi.order.status);
      });
      monthlyEarnings.push({
        month: start.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
        revenue: monthItems.reduce((a, oi) => a + Number(oi.unitPrice), 0),
        orders: monthItems.length,
      });
    }

    res.json({
      profile,
      stats: {
        totalProducts: products.length,
        activeListings: products.filter(p => p.status === 'ACTIVE').length,
        draftListings: products.filter(p => p.status === 'DRAFT').length,
        totalOrders: orderItems.length,
        pendingOrders: orderItems.filter(o => o.order.status === 'PENDING').length,
        grossRevenue: gross,
        charityContributed: charityTotal,
        platformFees: platformTotal,
        netEarnings,
      },
      monthlyEarnings,
      products,
      recentOrders: orderItems.slice(0, 20),
      partnerships,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// Update artist profile
router.patch('/artist/profile', authenticate, requireRole('ARTIST'), async (req, res) => {
  try {
    const profile = await prisma.artistProfile.findUnique({ where: { userId: req.userId } });
    if (!profile) return res.status(404).json({ error: 'No profile' });
    const { displayName, artistStatement, biography, location, socialLinks, sdgIds, avatarUrl, exhibitions, awards } = req.body;
    const updated = await prisma.artistProfile.update({
      where: { id: profile.id },
      data: {
        ...(displayName && { displayName }),
        ...(artistStatement !== undefined && { artistStatement }),
        ...(biography !== undefined && { biography }),
        ...(location !== undefined && { location }),
        ...(socialLinks && { socialLinks }),
        ...(sdgIds && { sdgIds }),
        ...(avatarUrl && { avatarUrl }),
        ...(exhibitions && { exhibitions }),
        ...(awards && { awards }),
      },
    });
    res.json(updated);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Update failed' }); }
});

// ── CHARITY DASHBOARD ───────────────────────────────────────
router.get('/charity', authenticate, requireRole('CHARITY'), async (req, res) => {
  try {
    const profile = await prisma.charityProfile.findUnique({ where: { userId: req.userId } });
    if (!profile) return res.status(404).json({ error: 'No charity profile' });
    const [messages, resources, partnerships, templates] = await Promise.all([
      prisma.charityMessage.findMany({ where: { charityId: profile.id }, orderBy: { sentAt: 'desc' }, take: 20 }),
      prisma.charityResource.findMany({ where: { charityId: profile.id }, orderBy: { uploadedAt: 'desc' } }),
      prisma.artistCharityPartnership.findMany({ where: { charityId: profile.id }, include: { artist: { select: { displayName: true, avatarUrl: true, id: true, totalSold: true } } } }),
      prisma.messageTemplate.findMany({ where: { charityId: profile.id }, orderBy: { createdAt: 'desc' } }),
    ]);
    res.json({
      profile,
      stats: { funderCount: profile.funderCount, raised: Number(profile.raised), target: Number(profile.target), messagesSent: messages.length, resourceCount: resources.length, partnerCount: partnerships.length },
      messages, resources, partnerships, templates,
    });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Update charity profile
router.patch('/charity/profile', authenticate, requireRole('CHARITY'), async (req, res) => {
  try {
    const profile = await prisma.charityProfile.findUnique({ where: { userId: req.userId } });
    if (!profile) return res.status(404).json({ error: 'No profile' });
    const { name, mission, registrationNo, sdgIds, websiteUrl, target, logo } = req.body;
    const updated = await prisma.charityProfile.update({
      where: { id: profile.id },
      data: { ...(name && { name }), ...(mission !== undefined && { mission }), ...(registrationNo && { registrationNo }), ...(sdgIds && { sdgIds }), ...(websiteUrl !== undefined && { websiteUrl }), ...(target && { target: parseFloat(target) }), ...(logo && { logo }) },
    });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: 'Update failed' }); }
});

// Send charity message to funders
router.post('/charity/messages', authenticate, requireRole('CHARITY'), async (req, res) => {
  try {
    const profile = await prisma.charityProfile.findUnique({ where: { userId: req.userId } });
    if (!profile) return res.status(404).json({ error: 'No profile' });
    const { subject, bodyHtml, messageType, templateId } = req.body;
    if (!subject || !bodyHtml) return res.status(400).json({ error: 'Subject and body required' });
    const msg = await prisma.charityMessage.create({
      data: { charityId: profile.id, messageType: messageType || 'APPRECIATION', subject, bodyHtml, recipientCount: profile.funderCount },
    });
    res.status(201).json(msg);
  } catch (e) { res.status(500).json({ error: 'Send failed' }); }
});

// CRUD charity templates
router.post('/charity/templates', authenticate, requireRole('CHARITY'), async (req, res) => {
  try {
    const profile = await prisma.charityProfile.findUnique({ where: { userId: req.userId } });
    if (!profile) return res.status(404).json({ error: 'No profile' });
    const { name, subject, bodyHtml } = req.body;
    if (!name || !subject) return res.status(400).json({ error: 'Name and subject required' });
    const tmpl = await prisma.messageTemplate.create({ data: { charityId: profile.id, name, subject, bodyHtml: bodyHtml || '' } });
    res.status(201).json(tmpl);
  } catch (e) { res.status(500).json({ error: 'Create failed' }); }
});

router.delete('/charity/templates/:id', authenticate, requireRole('CHARITY'), async (req, res) => {
  try {
    await prisma.messageTemplate.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: 'Delete failed' }); }
});

// CRUD charity resources
router.post('/charity/resources', authenticate, requireRole('CHARITY'), async (req, res) => {
  try {
    const profile = await prisma.charityProfile.findUnique({ where: { userId: req.userId } });
    if (!profile) return res.status(404).json({ error: 'No profile' });
    const { title, fileUrl, fileType, visibility } = req.body;
    if (!title || !fileUrl) return res.status(400).json({ error: 'Title and file URL required' });
    const resource = await prisma.charityResource.create({ data: { charityId: profile.id, title, fileUrl, fileType: fileType || 'pdf', visibility: visibility || 'PUBLIC' } });
    res.status(201).json(resource);
  } catch (e) { res.status(500).json({ error: 'Create failed' }); }
});

router.delete('/charity/resources/:id', authenticate, requireRole('CHARITY'), async (req, res) => {
  try {
    await prisma.charityResource.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: 'Delete failed' }); }
});

// ── ADMIN DASHBOARD ─────────────────────────────────────────
router.get('/admin', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const [userCount, productCount, orderCount, revenue, recentUsers, recentOrders] = await Promise.all([
      prisma.user.count(),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true, charitySplit: true, platformFee: true } }),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, email: true, role: true, firstName: true, lastName: true, createdAt: true } }),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { buyer: { select: { email: true, firstName: true } }, items: { select: { product: { select: { title: true } } } } } }),
    ]);
    res.json({
      stats: { users: userCount, products: productCount, orders: orderCount, revenue: Number(revenue._sum.totalAmount || 0), charityTotal: Number(revenue._sum.charitySplit || 0), platformRevenue: Number(revenue._sum.platformFee || 0) },
      recentUsers, recentOrders,
    });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
