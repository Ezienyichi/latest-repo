import { Router } from 'express';
import prisma from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const charities = await prisma.charityProfile.findMany({
      include: { products: { where: { status: 'ACTIVE' }, select: { id: true } }, resources: { where: { visibility: 'PUBLIC' } } },
      orderBy: { raised: 'desc' }
    });
    res.json(charities);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const charity = await prisma.charityProfile.findUnique({
      where: { id: req.params.id },
      include: { resources: true, partnerships: { include: { artist: { select: { displayName: true, avatarUrl: true, id: true } } } }, templates: { where: { isSystem: false } } }
    });
    if (!charity) return res.status(404).json({ error: 'Not found' });
    res.json(charity);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Newsletter signup / become funder
router.post('/:id/funder', authenticate, async (req, res) => {
  try {
    const rel = await prisma.funderRelationship.upsert({
      where: { userId_charityId: { userId: req.userId, charityId: req.params.id } },
      update: {},
      create: { userId: req.userId, charityId: req.params.id, source: 'NEWSLETTER' }
    });
    await prisma.charityProfile.update({ where: { id: req.params.id }, data: { funderCount: { increment: 1 } } });
    res.json({ message: 'You are now supporting this charity', rel });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
