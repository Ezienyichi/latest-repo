import { Hono } from 'hono';
import { confirmPayment, handleWebhook, paymentInfo } from '../payment.js';
import { PRODUCT_VIEW_SELECT, withAccess } from '../orderView.js';

// PUBLIC — guests pay too. The payment `reference` (an unguessable value only
// the order's creator was given) is the credential, so no login is needed.
const payments = new Hono();

// The buyer's return step: "I've paid — confirm it". With the real processor
// this endpoint only VERIFIES with the processor (the body's `outcome` is
// ignored); with the test-mode stub, `outcome` lets the tester pick the result.
payments.post('/confirm', async (c) => {
  const prisma = c.get('prisma');
  try {
    const body = await c.req.json().catch(() => ({}));
    const res = await confirmPayment(prisma, body.reference, { env: c.env, simulate: body.outcome === 'failed' ? 'failed' : 'success' });
    if (res.status === 'not_found') return c.json({ error: 'Payment not found' }, 404);
    if (res.status === 'invalid_state') return c.json({ error: `This order is ${res.order.status.toLowerCase()} and can no longer be paid`, status: res.status }, 409);
    // Re-read with items so the response carries the digital access links once paid.
    const order = await prisma.order.findUnique({ where: { id: res.order.id }, include: { items: { include: { product: { select: PRODUCT_VIEW_SELECT }, variation: true } } } });
    return c.json({ status: res.status, alreadyPaid: !!res.alreadyPaid, testMode: paymentInfo().testMode, order: withAccess(order) });
  } catch (e) { console.error('Payment confirm error:', e); return c.json({ error: 'Could not confirm the payment' }, 500); }
});

// The processor's server-to-server notification (Paystack: charge.success).
payments.post('/webhook', async (c) => {
  const prisma = c.get('prisma');
  try {
    const rawBody = await c.req.text();
    const out = await handleWebhook(prisma, { rawBody, headers: Object.fromEntries(c.req.raw.headers), env: c.env });
    return c.json({ ok: true, ...out });
  } catch (e) {
    if (e.http) return c.json({ error: e.message }, e.http);
    console.error('Webhook error:', e); return c.json({ error: 'Webhook failed' }, 400);
  }
});

export default payments;
