// Order lifecycle: what each status means, which moves are legal, and what
// happens to money when an order is paid (or un-paid).
//
//   PENDING ──pay──▶ PAID ──▶ PROCESSING ──▶ SHIPPED ──▶ DELIVERED
//      │               │            │            │            │
//      └─▶ CANCELLED   └─▶ CANCELLED / REFUNDED (from any paid state)   REFUNDED
//
// PENDING  created, not paid (nothing is delivered, nothing is credited)
// PAID     payment confirmed by the payment module — the ONLY way out of PENDING
//          other than cancelling. This is the moment digital links are released
//          and the charity split is credited to campaigns.
// PROCESSING / SHIPPED / DELIVERED   fulfilment, moved by an admin
// CANCELLED / REFUNDED               terminal; both reverse the campaign credit

export const PAID_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

// Digital items (music listen link, digital-book read link) are released only
// to an order that has been paid and not since cancelled / refunded.
export const grantsDigitalAccess = (order) => !!order && PAID_STATUSES.includes(order.status);

const TRANSITIONS = {
  PENDING: ['CANCELLED'],
  PAID: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
  SHIPPED: ['DELIVERED', 'CANCELLED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

// Returns null if an ADMIN may move an order from → to, else the reason not.
export function checkTransition(from, to) {
  if (to === 'PAID') return 'An order becomes PAID only when its payment is confirmed';
  if (from === to) return `The order is already ${from}`;
  if (!TRANSITIONS[from]) return `Unknown status ${from}`;
  if (!TRANSITIONS[from].includes(to)) {
    if (from === 'PENDING') return `An unpaid order can only be cancelled — it can't be ${to.toLowerCase()} until it is paid`;
    return `An order that is ${from.toLowerCase()} can't be moved to ${to.toLowerCase()}`;
  }
  return null;
}

// Credits each paid line's CHARITY SPLIT (already computed on the net price at
// order time) to the campaign its artwork supports. This function and
// reverseFundsAttribution() are the only writers of Project.raisedAmount.
async function applyFunds(tx, orderId, direction) {
  const items = await tx.orderItem.findMany({ where: { orderId }, include: { product: { select: { projectId: true, charityId: true } } } });
  for (const item of items) {
    const amount = item.charitySplitAmt;
    if (!(Number(amount) > 0)) continue;
    const op = direction === 'credit' ? 'increment' : 'decrement';
    if (item.product?.projectId) await tx.project.update({ where: { id: item.product.projectId }, data: { raisedAmount: { [op]: amount } } });
    // legacy stored per-charity total, kept in step so nothing that still reads it drifts
    if (item.product?.charityId) await tx.charityProfile.update({ where: { id: item.product.charityId }, data: { raised: { [op]: amount } } });
  }
}

// PENDING → PAID, once. Safe to call repeatedly or concurrently (callback +
// webhook): the conditional update lets exactly one caller through, so a
// campaign is never credited twice. Returns true if THIS call marked it paid.
export async function markOrderPaid(prisma, orderId, { provider }) {
  return prisma.$transaction(async (tx) => {
    const flipped = await tx.order.updateMany({ where: { id: orderId, status: 'PENDING' }, data: { status: 'PAID', paidAt: new Date(), paymentProvider: provider } });
    if (flipped.count === 0) return false;
    await applyFunds(tx, orderId, 'credit');
    await tx.order.update({ where: { id: orderId }, data: { fundsAttributedAt: new Date() } });
    return true;
  });
}

// Undo the campaign credit when a paid order is cancelled or refunded.
// Idempotent: only an order that currently holds a credit is reversed.
export async function reverseFundsAttribution(tx, orderId) {
  const cleared = await tx.order.updateMany({ where: { id: orderId, fundsAttributedAt: { not: null } }, data: { fundsAttributedAt: null } });
  if (cleared.count === 0) return false;
  await applyFunds(tx, orderId, 'debit');
  return true;
}
