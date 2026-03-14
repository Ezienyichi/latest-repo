import { Router } from 'express';
import prisma from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Coupon codes (in production, store in DB)
const COUPONS = {
  'IMPACT10': { type: 'percent', value: 10, minOrder: 50 },
  'WELCOME15': { type: 'percent', value: 15, minOrder: 0, oneTime: true },
  'ARTFREE': { type: 'fixed', value: 25, minOrder: 100 },
};

// Validate coupon
router.post('/validate-coupon', authenticate, async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const coupon = COUPONS[code?.toUpperCase()];
    if (!coupon) return res.status(400).json({ error: 'Invalid coupon code' });
    if (subtotal < coupon.minOrder) return res.status(400).json({ error: `Minimum order £${coupon.minOrder} required` });
    const discount = coupon.type === 'percent' ? subtotal * (coupon.value / 100) : coupon.value;
    res.json({ code: code.toUpperCase(), discount: Math.min(discount, subtotal), type: coupon.type, value: coupon.value });
  } catch (e) { res.status(500).json({ error: 'Validation failed' }); }
});

// Create order + Stripe payment intent
router.post('/', authenticate, async (req, res) => {
  try {
    const { items, shippingAddress, couponCode } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'Cart is empty' });

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId }, include: { variations: true } });
      if (!product) return res.status(400).json({ error: `Product ${item.productId} not found` });
      
      const price = item.variationId
        ? Number(product.variations.find(v => v.id === item.variationId)?.price || product.basePrice)
        : Number(product.basePrice);
      const lineTotal = price * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        productId: product.id,
        variationId: item.variationId || null,
        quantity: item.quantity,
        unitPrice: price,
        addonSelections: item.addons || null,
        charitySplitAmt: lineTotal * 0.1,
        platformFeeAmt: lineTotal * 0.1,
      });

      // Decrement stock if applicable
      if (product.stockQuantity != null && product.stockQuantity > 0) {
        await prisma.product.update({
          where: { id: product.id },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }
    }

    // Apply coupon discount
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
    const platformFee = discountedSubtotal * 0.1;
    const charitySplit = discountedSubtotal * 0.1;
    const totalAmount = discountedSubtotal + shipping;

    // Create Stripe Payment Intent (if Stripe is configured)
    let stripePaymentIntentId = null;
    let clientSecret = null;
    
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_your_key') {
      try {
        const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalAmount * 100), // Stripe uses cents
          currency: 'gbp',
          metadata: { userId: req.userId, couponCode: couponCode || '' },
        });
        stripePaymentIntentId = paymentIntent.id;
        clientSecret = paymentIntent.client_secret;
      } catch (stripeErr) {
        console.error('Stripe error:', stripeErr.message);
        // Continue without Stripe — demo mode
      }
    }

    const order = await prisma.order.create({
      data: {
        buyerId: req.userId,
        totalAmount,
        shippingAmount: shipping,
        platformFee,
        charitySplit,
        shippingAddress,
        stripePaymentIntentId,
        status: stripePaymentIntentId ? 'PENDING' : 'PROCESSING', // Demo mode skips payment
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

    // Update charity raised amounts
    for (const item of order.items) {
      if (item.product?.charity?.name) {
        // Find the charity and increment raised
        const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { charityId: true } });
        if (product?.charityId) {
          await prisma.charityProfile.update({
            where: { id: product.charityId },
            data: { raised: { increment: item.charitySplitAmt } },
          }).catch(() => {});
        }
      }
    }

    // Create notification
    await prisma.notification.create({
      data: {
        userId: req.userId,
        icon: '📦',
        title: 'Order placed',
        body: `Order ${order.id.slice(0, 12)} — £${totalAmount.toFixed(2)}`,
        link: `/orders/${order.id}`,
      },
    }).catch(() => {});

    res.status(201).json({
      order,
      clientSecret, // Frontend uses this for Stripe Elements
      discount,
      subtotal,
      shipping,
      platformFee,
      charitySplit,
      totalAmount,
    });
  } catch (e) {
    console.error('Order error:', e);
    res.status(500).json({ error: 'Order creation failed' });
  }
});

// Get user's orders
router.get('/', authenticate, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { buyerId: req.userId },
      include: {
        items: {
          include: {
            product: { select: { title: true, images: true, slug: true, artist: { select: { displayName: true } }, charity: { select: { name: true } }, autoCertificate: true, certificateId: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch orders' }); }
});

// Get single order
router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, buyerId: req.userId },
      include: {
        items: {
          include: {
            product: { select: { title: true, images: true, slug: true, medium: true, year: true, artist: { select: { displayName: true } }, charity: { select: { name: true, logo: true } }, autoCertificate: true, certificateId: true } },
            variation: true,
          },
        },
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Update order status (admin/artist)
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });

    // Notify buyer
    await prisma.notification.create({
      data: {
        userId: order.buyerId,
        icon: status === 'SHIPPED' ? '🚚' : status === 'DELIVERED' ? '✅' : '📋',
        title: `Order ${status.toLowerCase()}`,
        body: `Order ${order.id.slice(0, 12)} has been ${status.toLowerCase()}`,
        link: `/orders/${order.id}`,
      },
    }).catch(() => {});

    res.json(order);
  } catch (e) { res.status(500).json({ error: 'Update failed' }); }
});

export default router;
