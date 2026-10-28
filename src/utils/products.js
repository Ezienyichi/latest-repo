// Category / delivery helpers shared by the product page, cart, checkout and listings.

export const CATEGORY_LABEL = { ARTWORK: 'Artwork', MUSIC: 'Music', BOOK: 'Book' };
export const BOOK_FORMAT_LABEL = { DIGITAL: 'Digital', PHYSICAL: 'Physical', BOTH: 'Digital + Physical' };

// How a purchase is delivered: 'DIGITAL' (a link, no shipping) or 'PHYSICAL'
// (shipped). Music is always digital, artwork always physical; a book is
// whichever edition the buyer picked.
export function deliveryFor(category, format) {
  if (category === 'MUSIC') return 'DIGITAL';
  if (category === 'BOOK') return format === 'DIGITAL' ? 'DIGITAL' : 'PHYSICAL';
  return 'PHYSICAL';
}

// The edition a book opens on: digital when it's sold, otherwise physical.
export const defaultBookFormat = (product) => (product?.bookFormat === 'PHYSICAL' ? 'PHYSICAL' : 'DIGITAL');

// Price of the chosen edition (books carry one price per edition).
export function priceFor(product, format) {
  if (product?.category === 'BOOK') {
    const v = format === 'DIGITAL' ? product.digitalPrice : product.physicalPrice;
    if (v != null) return Number(v);
  }
  return Number(product?.basePrice ?? 0);
}

// Listing price: a book sold in both editions shows "From" the cheaper one.
export function listingPrice(product) {
  return { from: product?.category === 'BOOK' && product?.bookFormat === 'BOTH', amount: Number(product?.basePrice ?? 0) };
}
