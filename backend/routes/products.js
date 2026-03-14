import { Router } from 'express';
import prisma from '../utils/db.js';
import { authenticate, requireRole, optionalAuth } from '../middleware/auth.js';

const router = Router();
const slugify = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// List products (public)
router.get('/', optionalAuth, async (req, res) => {
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
      prisma.product.findMany({ where, orderBy, skip, take: parseInt(limit),
        include: {
          artist: { select: { id: true, displayName: true, avatarUrl: true, verified: true } },
          charity: { select: { id: true, name: true, logo: true } },
          variations: true, reviews: { select: { rating: true } }
        }
      }),
      prisma.product.count({ where })
    ]);

    res.json({ items: items.map(p => ({ ...p, avgRating: p.reviews.length ? (p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length).toFixed(1) : null, reviewCount: p.reviews.length })), total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch products' }); }
});

// Get single product
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: { artist: true, charity: true, variations: true, addons: { orderBy: { sortOrder: 'asc' } },
        reviews: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' } } }
    });
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Create product
router.post('/', authenticate, requireRole('ARTIST', 'ADMIN'), async (req, res) => {
  try {
    const artist = await prisma.artistProfile.findUnique({ where: { userId: req.userId } });
    if (!artist) return res.status(400).json({ error: 'Artist profile required' });
    const { title, description, productType, category, basePrice, comparePrice, sku, stockQuantity, medium, year, sdgIds, images, gallery, charityId, autoCertificate, videoUrl, tags, fileUrl, fileFormat, previewUrl, pages: pg, variations, addons, featured } = req.body;
    if (!title || !basePrice) return res.status(400).json({ error: 'Title and price required' });

    let slug = slugify(title);
    if (await prisma.product.findUnique({ where: { slug } })) slug += '-' + Date.now().toString(36);
    const certId = autoCertificate ? `CAG-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}` : undefined;

    const product = await prisma.product.create({
      data: {
        artistId: artist.id, charityId, title, slug, description, productType: productType || 'SIMPLE', category: category || 'ARTWORK',
        basePrice, comparePrice, sku, stockQuantity, medium, year, sdgIds: sdgIds || [], images: images || [], gallery, videoUrl, tags: tags || [],
        fileUrl, fileFormat, previewUrl, pages: pg, autoCertificate: !!autoCertificate, certificateId: certId, featured: !!featured, status: 'DRAFT',
        variations: variations?.length ? { create: variations.map(v => ({ attributeCombination: v.attributes, price: v.price, sku: v.sku, stockQuantity: v.stockQuantity, imageUrl: v.imageUrl })) } : undefined,
        addons: addons?.length ? { create: addons.map((a, i) => ({ fieldType: a.fieldType, label: a.label, required: a.required || false, options: a.options, priceModifier: a.priceModifier, sortOrder: i })) } : undefined,
      },
      include: { variations: true, addons: true, artist: true, charity: true }
    });
    res.status(201).json(product);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Create failed' }); }
});

// Update product
router.patch('/:id', authenticate, requireRole('ARTIST', 'ADMIN'), async (req, res) => {
  try {
    const p = await prisma.product.findUnique({ where: { id: req.params.id }, include: { artist: true } });
    if (!p) return res.status(404).json({ error: 'Not found' });
    if (req.userRole !== 'ADMIN' && p.artist.userId !== req.userId) return res.status(403).json({ error: 'Not yours' });
    const updated = await prisma.product.update({ where: { id: req.params.id }, data: req.body, include: { variations: true, addons: true } });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: 'Update failed' }); }
});

// Delete product
router.delete('/:id', authenticate, requireRole('ARTIST', 'ADMIN'), async (req, res) => {
  try {
    const p = await prisma.product.findUnique({ where: { id: req.params.id }, include: { artist: true } });
    if (!p) return res.status(404).json({ error: 'Not found' });
    if (req.userRole !== 'ADMIN' && p.artist.userId !== req.userId) return res.status(403).json({ error: 'Not yours' });
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: 'Delete failed' }); }
});

// Add review
router.post('/:slug/reviews', authenticate, async (req, res) => {
  try {
    const p = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    if (!p) return res.status(404).json({ error: 'Not found' });
    const { rating, text } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5 required' });
    const review = await prisma.review.create({
      data: { productId: p.id, userId: req.userId, rating, text },
      include: { user: { select: { firstName: true, lastName: true } } }
    });
    res.status(201).json(review);
  } catch (e) { res.status(500).json({ error: 'Review failed' }); }
});

export default router;
