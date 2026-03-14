// src/routes/artists.js
import { Router } from 'express';
import prisma from '../utils/db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const artists = await prisma.artistProfile.findMany({
      include: { user: { select: { email: true } }, products: { where: { status: 'ACTIVE' }, select: { id: true } } },
      orderBy: { totalSold: 'desc' }
    });
    res.json(artists.map(a => ({ ...a, productCount: a.products.length })));
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const artist = await prisma.artistProfile.findUnique({
      where: { id: req.params.id },
      include: { products: { where: { status: 'ACTIVE' }, include: { charity: { select: { name: true } }, reviews: { select: { rating: true } } } }, partnerships: { include: { charity: { select: { name: true, logo: true, sdgIds: true } } } } }
    });
    if (!artist) return res.status(404).json({ error: 'Not found' });
    res.json(artist);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
