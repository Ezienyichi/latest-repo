// src/routes/admin.js — Admin panel endpoints
import { Router } from 'express';
import prisma from '../utils/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
const admin = [authenticate, requireRole('ADMIN')];

// List users with pagination and filtering
router.get('/users', ...admin, async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (role) where.role = role;
    if (search) where.OR = [{ email: { contains: search, mode: 'insensitive' } }, { firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }];
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip: (page - 1) * limit, take: parseInt(limit), orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, role: true, firstName: true, lastName: true, emailVerified: true, createdAt: true, artistProfile: { select: { displayName: true, verified: true } }, charityProfile: { select: { name: true, verified: true } } } }),
      prisma.user.count({ where }),
    ]);
    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Update user role / suspend
router.patch('/users/:id', ...admin, async (req, res) => {
  try {
    const { role, suspend } = req.body;
    const data = {};
    if (role) data.role = role;
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json(user);
  } catch (e) { res.status(500).json({ error: 'Update failed' }); }
});

// Verify artist
router.post('/verify-artist/:id', ...admin, async (req, res) => {
  try {
    const profile = await prisma.artistProfile.update({ where: { id: req.params.id }, data: { verified: true } });
    res.json({ message: 'Artist verified', profile });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Verify charity
router.post('/verify-charity/:id', ...admin, async (req, res) => {
  try {
    const profile = await prisma.charityProfile.update({ where: { id: req.params.id }, data: { verified: true } });
    res.json({ message: 'Charity verified', profile });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Pending moderation items
router.get('/moderation', ...admin, async (req, res) => {
  try {
    const [pendingArtists, pendingCharities, draftProducts] = await Promise.all([
      prisma.artistProfile.findMany({ where: { verified: false }, include: { user: { select: { email: true, firstName: true, lastName: true } } } }),
      prisma.charityProfile.findMany({ where: { verified: false }, include: { user: { select: { email: true } } } }),
      prisma.product.findMany({ where: { status: 'DRAFT' }, include: { artist: { select: { displayName: true } } }, take: 20 }),
    ]);
    res.json({ pendingArtists, pendingCharities, draftProducts });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Approve / reject product
router.patch('/products/:id/moderate', ...admin, async (req, res) => {
  try {
    const { status } = req.body; // ACTIVE or SUSPENDED
    const product = await prisma.product.update({ where: { id: req.params.id }, data: { status } });
    res.json(product);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Platform analytics
router.get('/analytics', ...admin, async (req, res) => {
  try {
    const [usersByRole, ordersByStatus, topArtists, topCharities, recentOrders] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.order.groupBy({ by: ['status'], _count: true, _sum: { totalAmount: true } }),
      prisma.artistProfile.findMany({ orderBy: { totalSold: 'desc' }, take: 5, select: { displayName: true, totalSold: true, artworkCount: true, verified: true } }),
      prisma.charityProfile.findMany({ orderBy: { raised: 'desc' }, take: 5, select: { name: true, raised: true, funderCount: true } }),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { buyer: { select: { email: true, firstName: true } }, _count: { select: { items: true } } } }),
    ]);
    res.json({ usersByRole, ordersByStatus, topArtists, topCharities, recentOrders });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
