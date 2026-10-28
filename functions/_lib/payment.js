// Payment processor abstraction. No provider is wired yet — order creation
// calls createPayment() to obtain a paymentRef without knowing or caring
// which gateway (if any) eventually backs it. Swap this implementation for
// a real gateway integration later without touching order logic.
export async function createPayment(order) {
  return { paymentRef: `pending_${order.id}`, status: 'pending' };
}

// Does this order entitle the buyer to its digital items (music listen link,
// digital-book read link)? This is the ONE place that decides, so connecting
// a real gateway means changing only this function.
//
// Today no provider is wired: every order is created PENDING and nothing ever
// confirms payment, so PENDING has to count — otherwise no buyer could ever
// receive what they bought. With Flutterwave connected, drop PENDING from the
// list so access starts only once the payment webhook moves the order to
// PROCESSING (or later).
const NO_ACCESS = ['CANCELLED', 'REFUNDED'];
export function grantsDigitalAccess(order) {
  return !!order && !NO_ACCESS.includes(order.status);
}
