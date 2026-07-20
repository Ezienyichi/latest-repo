import { Hono } from 'hono';

const artists = new Hono();

artists.get('/', async (c) => {
  const prisma = c.get('prisma');
  try {
    const list = await prisma.artistProfile.findMany({ include: { products: { where: { status: 'ACTIVE' }, select: { id: true } } }, orderBy: { totalSold: 'desc' } });
    return c.json(list.map(a => ({ ...a, productCount: a.products.length })));
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

artists.get('/:id', async (c) => {
  const prisma = c.get('prisma');
  try {
    const artist = await prisma.artistProfile.findUnique({
      where: { id: c.req.param('id') },
      include: { products: { where: { status: 'ACTIVE' }, include: { charity: { select: { name: true } }, reviews: { select: { rating: true } } } }, partnerships: { include: { charity: { select: { name: true, logo: true } } } } },
    });
    if (!artist) return c.json({ error: 'Not found' }, 404);
    return c.json(artist);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default artists;
