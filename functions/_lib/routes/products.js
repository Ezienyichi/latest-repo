import { Hono } from 'hono';
import { authenticate, requireRole, optionalAuth } from '../auth.js';
import { slugify } from '../helpers.js';

const products = new Hono();

products.get('/', optionalAuth, async (c) => {
  const prisma = c.get('prisma');
  try {
    const q = c.req.query();
    const { category, sdg, charityId, artistId, minPrice, maxPrice, search, sort, type, featured } = q;
    const page = q.page || 1, limit = q.limit || 12;
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
      prisma.product.count({ where }),
    ]);
    return c.json({ items: items.map(p => ({ ...p, avgRating: p.reviews.length ? (p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length).toFixed(1) : null, reviewCount: p.reviews.length })), total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (e) { console.error(e); return c.json({ error: 'Failed to fetch products' }, 500); }
});

products.get('/:slug', optionalAuth, async (c) => {
  const prisma = c.get('prisma');
  try {
    const product = await prisma.product.findUnique({ where: { slug: c.req.param('slug') }, include: { artist: true, charity: true, variations: true, addons: { orderBy: { sortOrder: 'asc' } }, reviews: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' } } } });
    if (!product) return c.json({ error: 'Not found' }, 404);
    return c.json(product);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

products.post('/', authenticate, requireRole('ARTIST', 'ADMIN'), async (c) => {
  const prisma = c.get('prisma');
  try {
    const artist = await prisma.artistProfile.findUnique({ where: { userId: c.get('userId') } });
    if (!artist) return c.json({ error: 'Artist profile required' }, 400);
    const body = await c.req.json();
    const { title, description, productType, category, basePrice, comparePrice, sku, stockQuantity, medium, year, sdgIds, images, gallery, charityId, autoCertificate, videoUrl, tags, fileUrl, fileFormat, previewUrl, pages: pg, featured } = body;
    if (!title || !basePrice) return c.json({ error: 'Title and price required' }, 400);
    let slug = slugify(title);
    if (await prisma.product.findUnique({ where: { slug } })) slug += '-' + Date.now().toString(36);
    const certId = autoCertificate ? `CAG-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}` : undefined;
    const product = await prisma.product.create({ data: { artistId: artist.id, charityId, title, slug, description, productType: productType || 'SIMPLE', category: category || 'ARTWORK', basePrice, comparePrice, sku, stockQuantity, medium, year, sdgIds: sdgIds || [], images: images || [], gallery, videoUrl, tags: tags || [], fileUrl, fileFormat, previewUrl, pages: pg, autoCertificate: !!autoCertificate, certificateId: certId, featured: !!featured, status: 'DRAFT' }, include: { variations: true, addons: true, artist: true, charity: true } });
    return c.json(product, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Create failed' }, 500); }
});

products.patch('/:id', authenticate, requireRole('ARTIST', 'ADMIN'), async (c) => {
  const prisma = c.get('prisma');
  try {
    const p = await prisma.product.findUnique({ where: { id: c.req.param('id') }, include: { artist: true } });
    if (!p) return c.json({ error: 'Not found' }, 404);
    if (c.get('userRole') !== 'ADMIN' && p.artist.userId !== c.get('userId')) return c.json({ error: 'Not yours' }, 403);
    const updated = await prisma.product.update({ where: { id: c.req.param('id') }, data: await c.req.json(), include: { variations: true, addons: true } });
    return c.json(updated);
  } catch (e) { return c.json({ error: 'Update failed' }, 500); }
});

products.delete('/:id', authenticate, requireRole('ARTIST', 'ADMIN'), async (c) => {
  const prisma = c.get('prisma');
  try {
    const p = await prisma.product.findUnique({ where: { id: c.req.param('id') }, include: { artist: true } });
    if (!p) return c.json({ error: 'Not found' }, 404);
    if (c.get('userRole') !== 'ADMIN' && p.artist.userId !== c.get('userId')) return c.json({ error: 'Not yours' }, 403);
    await prisma.product.delete({ where: { id: c.req.param('id') } });
    return c.json({ message: 'Deleted' });
  } catch (e) { return c.json({ error: 'Delete failed' }, 500); }
});

products.post('/:slug/reviews', authenticate, async (c) => {
  const prisma = c.get('prisma');
  try {
    const p = await prisma.product.findUnique({ where: { slug: c.req.param('slug') } });
    if (!p) return c.json({ error: 'Not found' }, 404);
    const { rating, text } = await c.req.json();
    if (!rating || rating < 1 || rating > 5) return c.json({ error: 'Rating 1-5 required' }, 400);
    const review = await prisma.review.create({ data: { productId: p.id, userId: c.get('userId'), rating, text }, include: { user: { select: { firstName: true, lastName: true } } } });
    return c.json(review, 201);
  } catch (e) { return c.json({ error: 'Review failed' }, 500); }
});

export default products;
