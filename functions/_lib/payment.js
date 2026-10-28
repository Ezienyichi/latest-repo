// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT MODULE — the single slot a real processor (Paystack) plugs into.
//
// The rest of the app only ever calls three functions from here:
//
//   initiatePayment(order, { env })
//        → { reference, provider, testMode, status: 'pending', amount, checkoutUrl }
//        Called once, when an order is created. Gets the processor ready to take
//        money for `order.totalAmount` and returns the reference that identifies
//        the payment from then on (stored on Order.paymentRef, unique).
//        `checkoutUrl` is where the buyer is sent to pay (null for the stub, which
//        pays on the in-app test page).
//
//   confirmPayment(prisma, reference, { env, simulate })
//        → { status: 'paid' | 'failed' | 'pending' | 'not_found' | 'invalid_state',
//            alreadyPaid, order }
//        Asks the processor whether `reference` was really paid; if so, moves the
//        order PENDING → PAID (releasing digital links and crediting campaigns —
//        see orderFlow.js). IDEMPOTENT: call it from the buyer's return page AND
//        from the webhook; the order is only ever paid once.
//
//   handleWebhook(prisma, { rawBody, headers, env })
//        → { handled, reference? }   Verifies the processor's signature, extracts
//        the reference, then calls confirmPayment(). Stub: not configured.
//
// To switch to Paystack: write `paystackProvider` below with the same three
// methods (initialize → POST /transaction/initialize; verify → GET
// /transaction/verify/:reference and compare the amount; parseWebhook → check
// the x-paystack-signature HMAC of the raw body), then set `provider` to it.
// Nothing outside this file changes.
// ─────────────────────────────────────────────────────────────────────────────
import { markOrderPaid } from './orderFlow.js';

// ── provider adapters ───────────────────────────────────────────────────────
const stubProvider = {
  name: 'stub',
  // Test mode: no money moves. The in-app payment page lets the tester choose
  // the outcome; a real provider must never honour a client-chosen outcome.
  testMode: true,

  async initialize(order) {
    return { reference: `stub_${crypto.randomUUID()}`, checkoutUrl: null };
  },

  // `simulate` is the outcome picked on the test payment page.
  async verify(reference, { order, simulate }) {
    if (simulate === 'failed') return { status: 'failed' };
    // A real provider returns what was actually charged — this is where the
    // amount is compared with order.totalAmount (mismatch ⇒ not 'success').
    return { status: 'success', amountPaid: Number(order.totalAmount) };
  },

  async parseWebhook() {
    throw Object.assign(new Error('No payment webhook is configured while payments are in test mode'), { http: 501 });
  },
};

// ← swap to the real adapter here
const provider = stubProvider;

export const paymentInfo = () => ({ provider: provider.name, testMode: provider.testMode });

// ── public interface ────────────────────────────────────────────────────────
export async function initiatePayment(order, { env } = {}) {
  const init = await provider.initialize(order, { env });
  return {
    reference: init.reference,
    provider: provider.name,
    testMode: provider.testMode,
    status: 'pending',
    amount: Number(order.totalAmount),
    checkoutUrl: init.checkoutUrl ?? null,
  };
}

export async function confirmPayment(prisma, reference, { env, simulate } = {}) {
  if (typeof reference !== 'string' || !reference) return { status: 'not_found', order: null };
  const order = await prisma.order.findUnique({ where: { paymentRef: reference } });
  if (!order) return { status: 'not_found', order: null };

  // Already paid (e.g. the webhook got here first): nothing to do, report success.
  if (order.paidAt && order.status !== 'PENDING') return { status: 'paid', alreadyPaid: true, order };
  if (order.status !== 'PENDING') return { status: 'invalid_state', order };   // cancelled / refunded

  const result = await provider.verify(reference, { env, order, simulate: provider.testMode ? simulate : undefined });
  if (result.status !== 'success') return { status: result.status === 'failed' ? 'failed' : 'pending', order };

  const applied = await markOrderPaid(prisma, order.id, { provider: provider.name });
  const fresh = await prisma.order.findUnique({ where: { id: order.id } });
  return { status: 'paid', alreadyPaid: !applied, order: fresh };
}

export async function handleWebhook(prisma, { rawBody, headers, env }) {
  const event = await provider.parseWebhook({ rawBody, headers, env });   // throws if the signature is bad
  if (!event?.reference) return { handled: false };
  const res = await confirmPayment(prisma, event.reference, { env });
  return { handled: true, reference: event.reference, status: res.status };
}
