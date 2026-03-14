// netlify/functions/api.js
// Self-contained Express API as a Netlify Function
// All routes inlined to avoid esbuild import path issues

import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ─── DATABASE ────────────────────────────────────────────────
const globalForPrisma = globalThis;
const prisma = globalForPrisma.__prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;

// ─── AUTH MIDDLEWARE ─────────────────────────────────────────
function authenticate(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    const decoded = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

function optionalAuth(req, res, next) {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) {
    try { const d = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET); req.userId = d.userId; req.userRole = d.role; } catch {}
  }
  next();
}

function makeToken(u) {
  return jwt.sign({ userId: u.id, role: u.role, email: u.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function vCode() { return Math.floor(100000 + Math.random() * 900000).toString(); }
function slugify(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

// ─── EXPRESS APP ─────────────────────────────────────────────
const app = express();
app.use(cors({ origin: process.env.URL || process.env.DEPLOY_PRIME_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ─── HEALTH ──────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ═════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═════════════════════════════════════════════════════════════
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, phone } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be 8+ characters' });
    if (await prisma.user.findUnique({ where: { email } })) return res.status(409).json({ error: 'Email already registered' });
    const validRole = ['BUYER', 'ARTIST', 'CHARITY'].includes(role) ? role : 'BUYER';
    const verificationCode = vCode();
    const user = await prisma.user.create({ data: { email, passwordHash: await bcrypt.hash(password, 12), firstName, lastName, phone, role: validRole, verificationCode } });
    res.status(201).json({ token: makeToken(user), user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, emailVerified: null }, verificationCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined, message: 'Check your email for the verification code.' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Registration failed' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email }, include: { artistProfile: true, charityProfile: true } });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: makeToken(user), user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl, emailVerified: user.emailVerified, hasProfile: !!(user.artistProfile || user.charityProfile), artistProfile: user.artistProfile ? { id: user.artistProfile.id, displayName: user.artistProfile.displayName, verified: user.artistProfile.verified } : null, charityProfile: user.charityProfile ? { id: user.charityProfile.id, name: user.charityProfile.name, verified: user.charityProfile.verified } : null } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Login failed' }); }
});

app.post('/api/auth/verify-email', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'Not found' });
    if (user.emailVerified) return res.json({ message: 'Already verified' });
    if (user.verificationCode !== req.body.code) return res.status(400).json({ error: 'Invalid code' });
    await prisma.user.update({ where: { id: req.userId }, data: { emailVerified: new Date(), verificationCode: null } });
    res.json({ message: 'Email verified' });
  } catch (e) { res.status(500).json({ error: 'Verification failed' }); }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, include: { artistProfile: true, charityProfile: true } });
    if (!user) return res.status(404).json({ error: 'Not found' });
    const { passwordHash, verificationCode, ...safe } = user;
    res.json(safe);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.patch('/api/auth/me', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, phone, avatarUrl } = req.body;
    const user = await prisma.user.update({ where: { id: req.userId }, data: { firstName, lastName, phone, avatarUrl } });
    res.json(user);
  } catch (e) { res.status(500).json({ error: 'Update failed' }); }
});

app.post('/api/auth/setup/artist', authenticate, async (req, res) => {
  try {
    const { displayName, artistStatement, biography, location, socialLinks, sdgIds } = req.body;
    if (!displayName) return res.status(400).json({ error: 'Display name required' });
    if (await prisma.artistProfile.findUnique({ where: { userId: req.userId } })) return res.status(409).json({ error: 'Profile exists' });
    await prisma.user.update({ where: { id: req.userId }, data: { role: 'ARTIST' } });
    const profile = await prisma.artistProfile.create({ data: { userId: req.userId, displayName, artistStatement, biography, location, socialLinks: socialLinks || {}, sdgIds: sdgIds || [] } });
    res.status(201).json({ profile, message: 'Artist profile created.' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Setup failed' }); }
});

app.post('/api/auth/setup/charity', authenticate, async (req, res) => {
  try {
    const { name, mission, registrationNo, sdgIds, websiteUrl, target } = req.body;
    if (!name || !registrationNo) return res.status(400).json({ error: 'Name and registration number required' });
    if (await prisma.charityProfile.findUnique({ where: { userId: req.userId } })) return res.status(409).json({ error: 'Profile exists' });
    await prisma.user.update({ where: { id: req.userId }, data: { role: 'CHARITY' } });
    const profile = await prisma.charityProfile.create({ data: { userId: req.userId, name, mission, registrationNo, sdgIds: sdgIds || [], websiteUrl, target: target || 50000 } });
    res.status(201).json({ profile, message: 'Charity profile created.' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Setup failed' }); }
});

app.post('/api/auth/forgot-password', async (req, res) => { res.json({ message: 'If that email exists, a reset code has been sent.' }); });
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.verificationCode !== code) return res.status(400).json({ error: 'Invalid code' });
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12), verificationCode: null } });
    res.json({ message: 'Password reset successful' });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ═════════════════════════════════════════════════════════════
// PRODUCTS ROUTES
// ═════════════════════════════════════════════════════════════
app.get('/api/products', optionalAuth, async (req, res) => {
  try {
    const { category, sdg, charityId, artistId, minPrice, maxPrice, search, sort, type, page = 1, limit = 12, featured } = req.query;
    const where = { status: 'ACTIVE' };
    if (category) where.category = category.toUpperCase();
    if (sdg) where.sdgIds = { hasSome: [parseInt(sdg)] };
    if (charityId) where.charityId = charityId;
    if (artistId) where.artistId = artistId;
    if (type && type !== 'all') where.productType = type.toUpperCase();
    if (featured === 'true') where.featured = true;
    if (search) where.OR = [{ title: { contains: search, mode: 'insensitive' } }, { tags: { hasSome: [search.toLowerCase()] } }];
    if (minPrice || maxPrice) { where.basePrice = {}; if (minPrice) where.basePrice.gte = parseFloat(minPrice); if (maxPrice) where.basePrice.lte = parseFloat(maxPrice); }
    const orderBy = sort === 'price_asc' ? { basePrice: 'asc' } : sort === 'price_desc' ? { basePrice: 'desc' } : sort === 'newest' ? { createdAt: 'desc' } : { featured: 'desc' };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy, skip, take: parseInt(limit), include: { artist: { select: { id: true, displayName: true, avatarUrl: true, verified: true } }, charity: { select: { id: true, name: true, logo: true } }, variations: true, reviews: { select: { rating: true } } } }),
      prisma.product.count({ where })
    ]);
    res.json({ items: items.map(p => ({ ...p, avgRating: p.reviews.length ? (p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length).toFixed(1) : null, reviewCount: p.reviews.length })), total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch products' }); }
});

app.get('/api/products/:slug', optionalAuth, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { slug: req.params.slug }, include: { artist: true, charity: true, variations: true, addons: { orderBy: { sortOrder: 'asc' } }, reviews: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' } } } });
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/products', authenticate, requireRole('ARTIST', 'ADMIN'), async (req, res) => {
  try {
    const artist = await prisma.artistProfile.findUnique({ where: { userId: req.userId } });
    if (!artist) return res.status(400).json({ error: 'Artist profile required' });
    const { title, description, productType, category, basePrice, comparePrice, sku, stockQuantity, medium, year, sdgIds, images, gallery, charityId, autoCertificate, videoUrl, tags, fileUrl, fileFormat, previewUrl, pages: pg, featured } = req.body;
    if (!title || !basePrice) return res.status(400).json({ error: 'Title and price required' });
    let slug = slugify(title);
    if (await prisma.product.findUnique({ where: { slug } })) slug += '-' + Date.now().toString(36);
    const certId = autoCertificate ? `CAG-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}` : undefined;
    const product = await prisma.product.create({ data: { artistId: artist.id, charityId, title, slug, description, productType: productType || 'SIMPLE', category: category || 'ARTWORK', basePrice, comparePrice, sku, stockQuantity, medium, year, sdgIds: sdgIds || [], images: images || [], gallery, videoUrl, tags: tags || [], fileUrl, fileFormat, previewUrl, pages: pg, autoCertificate: !!autoCertificate, certificateId: certId, featured: !!featured, status: 'DRAFT' }, include: { variations: true, addons: true, artist: true, charity: true } });
    res.status(201).json(product);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Create failed' }); }
});

app.patch('/api/products/:id', authenticate, requireRole('ARTIST', 'ADMIN'), async (req, res) => {
  try {
    const p = await prisma.product.findUnique({ where: { id: req.params.id }, include: { artist: true } });
    if (!p) return res.status(404).json({ error: 'Not found' });
    if (req.userRole !== 'ADMIN' && p.artist.userId !== req.userId) return res.status(403).json({ error: 'Not yours' });
    const updated = await prisma.product.update({ where: { id: req.params.id }, data: req.body, include: { variations: true, addons: true } });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: 'Update failed' }); }
});

app.delete('/api/products/:id', authenticate, requireRole('ARTIST', 'ADMIN'), async (req, res) => {
  try {
    const p = await prisma.product.findUnique({ where: { id: req.params.id }, include: { artist: true } });
    if (!p) return res.status(404).json({ error: 'Not found' });
    if (req.userRole !== 'ADMIN' && p.artist.userId !== req.userId) return res.status(403).json({ error: 'Not yours' });
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: 'Delete failed' }); }
});

app.post('/api/products/:slug/reviews', authenticate, async (req, res) => {
  try {
    const p = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    if (!p) return res.status(404).json({ error: 'Not found' });
    const { rating, text } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5 required' });
    const review = await prisma.review.create({ data: { productId: p.id, userId: req.userId, rating, text }, include: { user: { select: { firstName: true, lastName: true } } } });
    res.status(201).json(review);
  } catch (e) { res.status(500).json({ error: 'Review failed' }); }
});

// ═════════════════════════════════════════════════════════════
// ORDERS ROUTES
// ═════════════════════════════════════════════════════════════
const COUPONS = { 'IMPACT10': { type: 'percent', value: 10, minOrder: 50 }, 'WELCOME15': { type: 'percent', value: 15, minOrder: 0 }, 'ARTFREE': { type: 'fixed', value: 25, minOrder: 100 } };

app.post('/api/orders/validate-coupon', authenticate, async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const coupon = COUPONS[code?.toUpperCase()];
    if (!coupon) return res.status(400).json({ error: 'Invalid coupon code' });
    if (subtotal < coupon.minOrder) return res.status(400).json({ error: `Minimum order £${coupon.minOrder} required` });
    const discount = coupon.type === 'percent' ? subtotal * (coupon.value / 100) : coupon.value;
    res.json({ code: code.toUpperCase(), discount: Math.min(discount, subtotal), type: coupon.type, value: coupon.value });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/orders', authenticate, async (req, res) => {
  try {
    const { items, shippingAddress, couponCode } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'Cart is empty' });
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId }, include: { variations: true } });
      if (!product) return res.status(400).json({ error: `Product not found` });
      const price = item.variationId ? Number(product.variations.find(v => v.id === item.variationId)?.price || product.basePrice) : Number(product.basePrice);
      const lineTotal = price * item.quantity;
      subtotal += lineTotal;
      orderItems.push({ productId: product.id, variationId: item.variationId || null, quantity: item.quantity, unitPrice: price, addonSelections: item.addons || null, charitySplitAmt: lineTotal * 0.1, platformFeeAmt: lineTotal * 0.1 });
    }
    let discount = 0;
    if (couponCode) { const c = COUPONS[couponCode.toUpperCase()]; if (c && subtotal >= c.minOrder) { discount = c.type === 'percent' ? subtotal * (c.value / 100) : c.value; discount = Math.min(discount, subtotal); } }
    const ds = subtotal - discount;
    const shipping = ds > 500 ? 0 : 12.99;
    const order = await prisma.order.create({ data: { buyerId: req.userId, totalAmount: ds + shipping, shippingAmount: shipping, platformFee: ds * 0.1, charitySplit: ds * 0.1, shippingAddress, status: 'PROCESSING', items: { create: orderItems } }, include: { items: { include: { product: { select: { title: true, images: true, slug: true, artist: { select: { displayName: true } }, charity: { select: { name: true } }, autoCertificate: true, certificateId: true } } } } } });
    res.status(201).json({ order, discount, subtotal, shipping, platformFee: ds * 0.1, charitySplit: ds * 0.1, totalAmount: ds + shipping });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Order failed' }); }
});

app.get('/api/orders', authenticate, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({ where: { buyerId: req.userId }, include: { items: { include: { product: { select: { title: true, images: true, slug: true, artist: { select: { displayName: true } }, charity: { select: { name: true } }, autoCertificate: true, certificateId: true } } } } }, orderBy: { createdAt: 'desc' } });
    res.json(orders);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/orders/:id', authenticate, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, buyerId: req.userId }, include: { items: { include: { product: true, variation: true } } } });
    if (!order) return res.status(404).json({ error: 'Not found' });
    res.json(order);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ═════════════════════════════════════════════════════════════
// ARTISTS & CHARITIES ROUTES
// ═════════════════════════════════════════════════════════════
app.get('/api/artists', async (_, res) => {
  try {
    const artists = await prisma.artistProfile.findMany({ include: { products: { where: { status: 'ACTIVE' }, select: { id: true } } }, orderBy: { totalSold: 'desc' } });
    res.json(artists.map(a => ({ ...a, productCount: a.products.length })));
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/artists/:id', async (req, res) => {
  try {
    const artist = await prisma.artistProfile.findUnique({ where: { id: req.params.id }, include: { products: { where: { status: 'ACTIVE' }, include: { charity: { select: { name: true } }, reviews: { select: { rating: true } } } }, partnerships: { include: { charity: { select: { name: true, logo: true } } } } } });
    if (!artist) return res.status(404).json({ error: 'Not found' });
    res.json(artist);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/charities', async (_, res) => {
  try { const charities = await prisma.charityProfile.findMany({ include: { resources: { where: { visibility: 'PUBLIC' } } }, orderBy: { raised: 'desc' } }); res.json(charities); }
  catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/charities/:id', async (req, res) => {
  try {
    const charity = await prisma.charityProfile.findUnique({ where: { id: req.params.id }, include: { resources: true, partnerships: { include: { artist: { select: { displayName: true, avatarUrl: true, id: true } } } }, templates: { where: { isSystem: false } } } });
    if (!charity) return res.status(404).json({ error: 'Not found' });
    res.json(charity);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/charities/:id/funder', authenticate, async (req, res) => {
  try {
    await prisma.funderRelationship.upsert({ where: { userId_charityId: { userId: req.userId, charityId: req.params.id } }, update: {}, create: { userId: req.userId, charityId: req.params.id, source: 'NEWSLETTER' } });
    await prisma.charityProfile.update({ where: { id: req.params.id }, data: { funderCount: { increment: 1 } } });
    res.json({ message: 'You are now supporting this charity' });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ═════════════════════════════════════════════════════════════
// DASHBOARD ROUTES
// ═════════════════════════════════════════════════════════════
app.get('/api/dashboard/artist', authenticate, requireRole('ARTIST'), async (req, res) => {
  try {
    const profile = await prisma.artistProfile.findUnique({ where: { userId: req.userId } });
    if (!profile) return res.status(404).json({ error: 'No artist profile' });
    const [products, orderItems, totalEarnings, partnerships] = await Promise.all([
      prisma.product.findMany({ where: { artistId: profile.id }, include: { charity: { select: { name: true, logo: true } }, reviews: { select: { rating: true } }, _count: { select: { orderItems: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.orderItem.findMany({ where: { product: { artistId: profile.id } }, include: { order: { select: { id: true, status: true, createdAt: true } }, product: { select: { title: true, images: true, slug: true } } }, orderBy: { order: { createdAt: 'desc' } }, take: 50 }),
      prisma.orderItem.aggregate({ where: { product: { artistId: profile.id }, order: { status: { in: ['DELIVERED', 'SHIPPED', 'PROCESSING'] } } }, _sum: { unitPrice: true, charitySplitAmt: true, platformFeeAmt: true } }),
      prisma.artistCharityPartnership.findMany({ where: { artistId: profile.id }, include: { charity: { select: { id: true, name: true, logo: true } } } }),
    ]);
    const gross = Number(totalEarnings._sum.unitPrice || 0), charity = Number(totalEarnings._sum.charitySplitAmt || 0), platform = Number(totalEarnings._sum.platformFeeAmt || 0);
    const monthlyEarnings = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); const start = new Date(d.getFullYear(), d.getMonth(), 1); const end = new Date(d.getFullYear(), d.getMonth() + 1, 0); const mi = orderItems.filter(oi => { const c = new Date(oi.order.createdAt); return c >= start && c <= end && ['DELIVERED', 'SHIPPED', 'PROCESSING'].includes(oi.order.status); }); monthlyEarnings.push({ month: start.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), revenue: mi.reduce((a, oi) => a + Number(oi.unitPrice), 0), orders: mi.length }); }
    res.json({ profile, stats: { totalProducts: products.length, activeListings: products.filter(p => p.status === 'ACTIVE').length, draftListings: products.filter(p => p.status === 'DRAFT').length, totalOrders: orderItems.length, pendingOrders: orderItems.filter(o => o.order.status === 'PENDING').length, grossRevenue: gross, charityContributed: charity, platformFees: platform, netEarnings: gross - charity - platform }, monthlyEarnings, products, recentOrders: orderItems.slice(0, 20), partnerships });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

app.patch('/api/dashboard/artist/profile', authenticate, requireRole('ARTIST'), async (req, res) => {
  try {
    const profile = await prisma.artistProfile.findUnique({ where: { userId: req.userId } });
    if (!profile) return res.status(404).json({ error: 'No profile' });
    const { displayName, artistStatement, biography, location, socialLinks, sdgIds, avatarUrl, exhibitions, awards } = req.body;
    const updated = await prisma.artistProfile.update({ where: { id: profile.id }, data: { ...(displayName && { displayName }), ...(artistStatement !== undefined && { artistStatement }), ...(biography !== undefined && { biography }), ...(location !== undefined && { location }), ...(socialLinks && { socialLinks }), ...(sdgIds && { sdgIds }), ...(avatarUrl && { avatarUrl }), ...(exhibitions && { exhibitions }), ...(awards && { awards }) } });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: 'Update failed' }); }
});

app.get('/api/dashboard/charity', authenticate, requireRole('CHARITY'), async (req, res) => {
  try {
    const profile = await prisma.charityProfile.findUnique({ where: { userId: req.userId } });
    if (!profile) return res.status(404).json({ error: 'No charity profile' });
    const [messages, resources, partnerships, templates] = await Promise.all([
      prisma.charityMessage.findMany({ where: { charityId: profile.id }, orderBy: { sentAt: 'desc' }, take: 20 }),
      prisma.charityResource.findMany({ where: { charityId: profile.id }, orderBy: { uploadedAt: 'desc' } }),
      prisma.artistCharityPartnership.findMany({ where: { charityId: profile.id }, include: { artist: { select: { displayName: true, avatarUrl: true, id: true, totalSold: true } } } }),
      prisma.messageTemplate.findMany({ where: { charityId: profile.id }, orderBy: { createdAt: 'desc' } }),
    ]);
    res.json({ profile, stats: { funderCount: profile.funderCount, raised: Number(profile.raised), target: Number(profile.target), messagesSent: messages.length, resourceCount: resources.length, partnerCount: partnerships.length }, messages, resources, partnerships, templates });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/dashboard/charity/messages', authenticate, requireRole('CHARITY'), async (req, res) => {
  try { const profile = await prisma.charityProfile.findUnique({ where: { userId: req.userId } }); if (!profile) return res.status(404).json({ error: 'No profile' }); const { subject, bodyHtml, messageType } = req.body; if (!subject || !bodyHtml) return res.status(400).json({ error: 'Subject and body required' }); const msg = await prisma.charityMessage.create({ data: { charityId: profile.id, messageType: messageType || 'APPRECIATION', subject, bodyHtml, recipientCount: profile.funderCount } }); res.status(201).json(msg); } catch (e) { res.status(500).json({ error: 'Send failed' }); }
});

app.post('/api/dashboard/charity/templates', authenticate, requireRole('CHARITY'), async (req, res) => {
  try { const profile = await prisma.charityProfile.findUnique({ where: { userId: req.userId } }); if (!profile) return res.status(404).json({ error: 'No profile' }); const { name, subject, bodyHtml } = req.body; const tmpl = await prisma.messageTemplate.create({ data: { charityId: profile.id, name, subject, bodyHtml: bodyHtml || '' } }); res.status(201).json(tmpl); } catch (e) { res.status(500).json({ error: 'Create failed' }); }
});

app.delete('/api/dashboard/charity/templates/:id', authenticate, requireRole('CHARITY'), async (req, res) => {
  try { await prisma.messageTemplate.delete({ where: { id: req.params.id } }); res.json({ message: 'Deleted' }); } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/dashboard/charity/resources', authenticate, requireRole('CHARITY'), async (req, res) => {
  try { const profile = await prisma.charityProfile.findUnique({ where: { userId: req.userId } }); if (!profile) return res.status(404).json({ error: 'No profile' }); const { title, fileUrl, fileType, visibility } = req.body; const resource = await prisma.charityResource.create({ data: { charityId: profile.id, title, fileUrl, fileType: fileType || 'pdf', visibility: visibility || 'PUBLIC' } }); res.status(201).json(resource); } catch (e) { res.status(500).json({ error: 'Create failed' }); }
});

app.delete('/api/dashboard/charity/resources/:id', authenticate, requireRole('CHARITY'), async (req, res) => {
  try { await prisma.charityResource.delete({ where: { id: req.params.id } }); res.json({ message: 'Deleted' }); } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/dashboard/admin', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const [users, products, orders, revenue, recentOrders] = await Promise.all([prisma.user.count(), prisma.product.count({ where: { status: 'ACTIVE' } }), prisma.order.count(), prisma.order.aggregate({ _sum: { totalAmount: true, charitySplit: true, platformFee: true } }), prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { buyer: { select: { email: true, firstName: true } }, _count: { select: { items: true } } } })]);
    res.json({ stats: { users, products, orders, revenue: Number(revenue._sum.totalAmount || 0), charityTotal: Number(revenue._sum.charitySplit || 0), platformRevenue: Number(revenue._sum.platformFee || 0) }, recentOrders });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ═════════════════════════════════════════════════════════════
// CERTIFICATES ROUTES
// ═════════════════════════════════════════════════════════════
app.get('/api/certificates/verify/:certId', async (req, res) => {
  try {
    const product = await prisma.product.findFirst({ where: { certificateId: req.params.certId }, include: { artist: { select: { displayName: true, verified: true } }, charity: { select: { name: true, verified: true } } } });
    if (!product) return res.status(404).json({ valid: false, error: 'Certificate not found' });
    res.json({ valid: true, certificate: { id: product.certificateId, artwork: product.title, artist: product.artist?.displayName, artistVerified: product.artist?.verified, charity: product.charity?.name, charityVerified: product.charity?.verified, medium: product.medium || product.fileFormat, year: product.year, sdgIds: product.sdgIds, category: product.category, issuedBy: 'Change Art Gallery — Fast Tackle Africa' } });
  } catch (e) { res.status(500).json({ valid: false, error: 'Failed' }); }
});

app.get('/api/certificates/my-certificates', authenticate, async (req, res) => {
  try {
    const orderItems = await prisma.orderItem.findMany({ where: { order: { buyerId: req.userId, status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] } } }, include: { product: { select: { title: true, certificateId: true, autoCertificate: true, images: true, slug: true, artist: { select: { displayName: true } }, charity: { select: { name: true } } } }, order: { select: { createdAt: true } } } });
    res.json(orderItems.filter(oi => oi.product?.autoCertificate && oi.product?.certificateId).map(oi => ({ certificateId: oi.product.certificateId, artwork: oi.product.title, artist: oi.product.artist?.displayName, charity: oi.product.charity?.name, image: oi.product.images?.[0]?.url, slug: oi.product.slug, purchaseDate: oi.order.createdAt })));
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ═════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═════════════════════════════════════════════════════════════
const admin = [authenticate, requireRole('ADMIN')];

app.get('/api/admin/users', ...admin, async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (role) where.role = role;
    if (search) where.OR = [{ email: { contains: search, mode: 'insensitive' } }, { firstName: { contains: search, mode: 'insensitive' } }];
    const [users, total] = await Promise.all([prisma.user.findMany({ where, skip: (page - 1) * limit, take: parseInt(limit), orderBy: { createdAt: 'desc' }, select: { id: true, email: true, role: true, firstName: true, lastName: true, emailVerified: true, createdAt: true, artistProfile: { select: { displayName: true, verified: true } }, charityProfile: { select: { name: true, verified: true } } } }), prisma.user.count({ where })]);
    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/admin/verify-artist/:id', ...admin, async (req, res) => {
  try { const p = await prisma.artistProfile.update({ where: { id: req.params.id }, data: { verified: true } }); res.json({ message: 'Verified', profile: p }); } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/admin/verify-charity/:id', ...admin, async (req, res) => {
  try { const p = await prisma.charityProfile.update({ where: { id: req.params.id }, data: { verified: true } }); res.json({ message: 'Verified', profile: p }); } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/admin/moderation', ...admin, async (req, res) => {
  try {
    const [pendingArtists, pendingCharities, draftProducts] = await Promise.all([prisma.artistProfile.findMany({ where: { verified: false }, include: { user: { select: { email: true, firstName: true } } } }), prisma.charityProfile.findMany({ where: { verified: false }, include: { user: { select: { email: true } } } }), prisma.product.findMany({ where: { status: 'DRAFT' }, include: { artist: { select: { displayName: true } } }, take: 20 })]);
    res.json({ pendingArtists, pendingCharities, draftProducts });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.patch('/api/admin/products/:id/moderate', ...admin, async (req, res) => {
  try { const p = await prisma.product.update({ where: { id: req.params.id }, data: { status: req.body.status } }); res.json(p); } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/admin/analytics', ...admin, async (req, res) => {
  try {
    const [usersByRole, ordersByStatus, topArtists, topCharities, recentOrders] = await Promise.all([prisma.user.groupBy({ by: ['role'], _count: true }), prisma.order.groupBy({ by: ['status'], _count: true, _sum: { totalAmount: true } }), prisma.artistProfile.findMany({ orderBy: { totalSold: 'desc' }, take: 5, select: { displayName: true, totalSold: true, artworkCount: true, verified: true } }), prisma.charityProfile.findMany({ orderBy: { raised: 'desc' }, take: 5, select: { name: true, raised: true, funderCount: true } }), prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { buyer: { select: { email: true, firstName: true } }, _count: { select: { items: true } } } })]);
    res.json({ usersByRole, ordersByStatus, topArtists, topCharities, recentOrders });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ─── ERROR HANDLER ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('API Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

export const handler = serverless(app);
