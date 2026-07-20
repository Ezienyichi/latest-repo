// Payment processor abstraction. No provider is wired yet — order creation
// calls createPayment() to obtain a paymentRef without knowing or caring
// which gateway (if any) eventually backs it. Swap this implementation for
// a real gateway integration later without touching order logic.
export async function createPayment(order) {
  return { paymentRef: `pending_${order.id}`, status: 'pending' };
}
