// src/routes/certificates.js — Certificate generation & verification
import { Router } from 'express';
import prisma from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Verify a certificate by ID (public)
router.get('/verify/:certId', async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { certificateId: req.params.certId },
      include: {
        artist: { select: { displayName: true, location: true, verified: true } },
        charity: { select: { name: true, logo: true, sdgIds: true, verified: true } },
      },
    });
    if (!product) return res.status(404).json({ valid: false, error: 'Certificate not found' });
    res.json({
      valid: true,
      certificate: {
        id: product.certificateId,
        artwork: product.title,
        artist: product.artist?.displayName,
        artistVerified: product.artist?.verified,
        charity: product.charity?.name,
        charityVerified: product.charity?.verified,
        medium: product.medium || product.fileFormat,
        year: product.year,
        sdgIds: product.sdgIds,
        category: product.category,
        issuedBy: 'Change Art Gallery — Fast Tackle Africa',
        verificationUrl: `${process.env.FRONTEND_URL || 'https://changeartgallery.com'}/verify/${product.certificateId}`,
      },
    });
  } catch (e) { res.status(500).json({ valid: false, error: 'Verification failed' }); }
});

// Get certificates for buyer's purchased items
router.get('/my-certificates', authenticate, async (req, res) => {
  try {
    const orderItems = await prisma.orderItem.findMany({
      where: { order: { buyerId: req.userId, status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] } } },
      include: {
        product: {
          select: { title: true, certificateId: true, autoCertificate: true, images: true, slug: true,
            artist: { select: { displayName: true } }, charity: { select: { name: true } } },
        },
        order: { select: { createdAt: true } },
      },
    });
    const certs = orderItems.filter(oi => oi.product?.autoCertificate && oi.product?.certificateId).map(oi => ({
      certificateId: oi.product.certificateId,
      artwork: oi.product.title,
      artist: oi.product.artist?.displayName,
      charity: oi.product.charity?.name,
      image: oi.product.images?.[0]?.url,
      slug: oi.product.slug,
      purchaseDate: oi.order.createdAt,
    }));
    res.json(certs);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
