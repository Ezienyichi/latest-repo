import { Hono } from 'hono';
import { authenticate } from '../auth.js';

const certificates = new Hono();

certificates.get('/verify/:certId', async (c) => {
  const prisma = c.get('prisma');
  try {
    const product = await prisma.product.findFirst({
      where: { certificateId: c.req.param('certId') },
      include: { artist: { select: { displayName: true, verified: true } }, charity: { select: { name: true, verified: true } } },
    });
    if (!product) return c.json({ valid: false, error: 'Certificate not found' }, 404);
    return c.json({
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
      },
    });
  } catch (e) { return c.json({ valid: false, error: 'Failed' }, 500); }
});

certificates.get('/my-certificates', authenticate, async (c) => {
  const prisma = c.get('prisma');
  try {
    const orderItems = await prisma.orderItem.findMany({
      where: { order: { buyerId: c.get('userId'), status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] } } },
      include: {
        product: { select: { title: true, certificateId: true, autoCertificate: true, images: true, slug: true, artist: { select: { displayName: true } }, charity: { select: { name: true } } } },
        order: { select: { createdAt: true } },
      },
    });
    return c.json(orderItems.filter(oi => oi.product?.autoCertificate && oi.product?.certificateId).map(oi => ({
      certificateId: oi.product.certificateId,
      artwork: oi.product.title,
      artist: oi.product.artist?.displayName,
      charity: oi.product.charity?.name,
      image: oi.product.images?.[0]?.url,
      slug: oi.product.slug,
      purchaseDate: oi.order.createdAt,
    })));
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default certificates;
