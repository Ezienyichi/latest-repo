import { Hono } from 'hono';
import { authenticate, requireRole, optionalAuth } from '../auth.js';
import { createPayment } from '../payment.js';
import { getSplitRates, computeSplit } from '../split.js';

const orders = new Hono();

// Coupon codes (in production, store in DB)
const COUPONS = {
  IMPACT10: { type: 'percent', value: 10, minOrder: 50 },
  WELCOME15: { type: 'percent', value: 15, minOrder: 0 },
  ARTFREE: { type: 'fixed', value: 25, minOrder: 100 },
};

// optionalAuth: buyers must be able to check out with no account (guest
// checkout writes buyerEmail; logged-in buyers still get buyerId attached).
orders.post('/validate-coupon', optionalAuth, async (c) => {
  try {
    const { code, subtotal } = await c.req.json();
    const coupon = COUPONS[code?.toUpperCase()];
    if (!coupon) return c.json({ error: 'Invalid coupon code' }, 400);
    if (subtotal < coupon.minOrder) return c.json({ error: `Minimum order £${coupon.minOrder} required` }, 400);
    const discount = coupon.type === 'percent' ? subtotal * (coupon.value / 100) : coupon.value;
    return c.json({ code: code.toUpperCase(), discount: Math.min(discount, subtotal), type: coupon.type, value: coupon.value });
  } catch (e) { return c.json({ error: 'Validation failed' }, 500); }
});

orders.post('/', optionalAuth, async (c) => {
  const prisma = c.get('prisma');
  try {
    const { items, shippingAddress, couponCode, buyerEmail } = await c.req.json();
    if (!items?.length) return c.json({ error: 'Cart is empty' }, 400);
    const userId = c.get('userId') || null;
    if (!userId && !buyerEmail) return c.json({ error: 'Email required for guest checkout' }, 400);

    // Split rates come from SiteSetting (admin-editable, no redeploy needed),
    // falling back to hardcoded defaults only if the row is missing.
    const rates = await getSplitRates(prisma);

    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId }, include: { variations: true } });
      if (!product) return c.json({ error: `Product ${item.productId} not found` }, 400);
      const price = item.variationId
        ? Number(product.variations.find(v => v.id === item.variationId)?.price || product.basePrice)
        : Number(product.basePrice);
      const lineTotal = price * item.quantity;
      subtotal += lineTotal;
      const lineSplit = computeSplit(lineTotal, rates);
      orderItems.push({
        productId: product.id,
        variationId: item.variationId || null,
        quantity: item.quantity,
        unitPrice: price,
        addonSelections: item.addons || null,
        charitySplitAmt: lineSplit.charityAmt,
        platformFeeAmt: lineSplit.platformAmt,
      });
      if (product.stockQuantity != null && product.stockQuantity > 0) {
        await prisma.product.update({ where: { id: product.id }, data: { stockQuantity: { decrement: item.quantity } } });
      }
    }

    let discount = 0;
    if (couponCode) {
      const coupon = COUPONS[couponCode.toUpperCase()];
      if (coupon && subtotal >= coupon.minOrder) {
        discount = coupon.type === 'percent' ? subtotal * (coupon.value / 100) : coupon.value;
        discount = Math.min(discount, subtotal);
      }
    }

    const discountedSubtotal = subtotal - discount;
    const shipping = discountedSubtotal > 500 ? 0 : 12.99;
    const orderSplit = computeSplit(discountedSubtotal, rates);
    const { platformAmt: platformFee, charityAmt: charitySplit, artistAmt: artistPayout } = orderSplit;
    const totalAmount = discountedSubtotal + shipping;

    let order = await prisma.order.create({
      data: {
        buyerId: userId,
        buyerEmail: buyerEmail || (await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email,
        totalAmount,
        shippingAmount: shipping,
        platformFee,
        charitySplit,
        shippingAddress,
        status: 'PENDING',
        items: { create: orderItems },
      },
      include: {
        items: {
          include: {
            product: { select: { title: true, images: true, slug: true, artist: { select: { displayName: true } }, charity: { select: { name: true } }, autoCertificate: true, certificateId: true } },
            variation: true,
          },
        },
      },
    });

    // Payment processor is abstracted behind createPayment() — no provider
    // wired yet. Swapping in a real gateway later only touches payment.js.
    const payment = await createPayment(order);
    order = await prisma.order.update({
      where: { id: order.id },
      data: { paymentRef: payment.paymentRef, status: payment.status === 'pending' ? 'PENDING' : 'PROCESSING' },
      include: {
        items: {
          include: {
            product: { select: { title: true, images: true, slug: true, artist: { select: { displayName: true } }, charity: { select: { name: true } }, autoCertificate: true, certificateId: true } },
            variation: true,
          },
        },
      },
    });

    // Update charity raised amounts
    for (const item of order.items) {
      if (item.product?.charity?.name) {
        const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { charityId: true } });
        if (product?.charityId) {
          await prisma.charityProfile.update({ where: { id: product.charityId }, data: { raised: { increment: item.charitySplitAmt } } }).catch(() => {});
        }
      }
    }

    if (userId) {
      await prisma.notification.create({
        data: { userId, icon: '📦', title: 'Order placed', body: `Order ${order.id.slice(0, 12)} — £${totalAmount.toFixed(2)}`, link: `/orders/${order.id}` },
      }).catch(() => {});
    }

    return c.json({ order, paymentRef: payment.paymentRef, discount, subtotal, shipping, platformFee, charitySplit, artistPayout, totalAmount }, 201);
  } catch (e) { console.error('Order error:', e); return c.json({ error: 'Order creation failed' }, 500); }
});

orders.get('/', authenticate, async (c) => {
  const prisma = c.get('prisma');
  try {
    const list = await prisma.order.findMany({
      where: { buyerId: c.get('userId') },
      include: { items: { include: { product: { select: { title: true, images: true, slug: true, artist: { select: { displayName: true } }, charity: { select: { name: true } }, autoCertificate: true, certificateId: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return c.json(list);
  } catch (e) { return c.json({ error: 'Failed to fetch orders' }, 500); }
});

orders.get('/:id', authenticate, async (c) => {
  const prisma = c.get('prisma');
  try {
    const order = await prisma.order.findFirst({
      where: { id: c.req.param('id'), buyerId: c.get('userId') },
      include: { items: { include: { product: { select: { title: true, images: true, slug: true, medium: true, year: true, artist: { select: { displayName: true } }, charity: { select: { name: true, logo: true } }, autoCertificate: true, certificateId: true } }, variation: true } } },
    });
    if (!order) return c.json({ error: 'Order not found' }, 404);
    return c.json(order);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

// Restricted to ADMIN — the ported backend/routes/orders.js version only
// required `authenticate`, letting any logged-in buyer update any order's
// status. That looked like an unintentional gap, so it's fixed here.
orders.patch('/:id/status', authenticate, requireRole('ADMIN'), async (c) => {
  const prisma = c.get('prisma');
  try {
    const { status } = await c.req.json();
    const valid = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    if (!valid.includes(status)) return c.json({ error: 'Invalid status' }, 400);
    const order = await prisma.order.update({ where: { id: c.req.param('id') }, data: { status } });
    if (order.buyerId) {
      await prisma.notification.create({
        data: { userId: order.buyerId, icon: status === 'SHIPPED' ? '🚚' : status === 'DELIVERED' ? '✅' : '📋', title: `Order ${status.toLowerCase()}`, body: `Order ${order.id.slice(0, 12)} has been ${status.toLowerCase()}`, link: `/orders/${order.id}` },
      }).catch(() => {});
    }
    return c.json(order);
  } catch (e) { return c.json({ error: 'Update failed' }, 500); }
});

export default orders;
