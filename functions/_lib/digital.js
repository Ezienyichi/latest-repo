// Categories, book formats and link-delivered digital products.
//
//   ARTWORK  physical, shipped, certificate etc. (unchanged)
//   MUSIC    digital only — after purchase the buyer gets the listen/stream link
//   BOOK     DIGITAL (read link), PHYSICAL (shipped) or BOTH (buyer picks, each
//            edition has its own price)
//
// The delivery link (Product.digitalAccessUrl) is the thing being sold, so it
// is NEVER part of a public product response — it only reaches a buyer, through
// an order they own (see orders.js), and only while grantsDigitalAccess()
// says the order is in good standing.

export const CATEGORIES = ['ARTWORK', 'MUSIC', 'BOOK'];
export const BOOK_FORMATS = ['DIGITAL', 'PHYSICAL', 'BOTH'];

const HTTP_URL = /^https?:\/\/[^\s]+$/i;
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
function text(v, label, max, required) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return required ? { error: `${label} is required` } : { value: null };
  if (s.length > max) return { error: `${label} must be ${max} characters or fewer` };
  return { value: s };
}
const positive = (n) => typeof n === 'number' && isFinite(n) && n > 0 && n < 1e8;

// Removes the private link from a product before it is sent to the public.
export function stripPrivate(product) {
  if (!product) return product;
  const { digitalAccessUrl, ...rest } = product;
  return rest;
}

// Validates the category-specific part of a product being created/edited and
// returns the values the server derives from it. `next` is the resulting
// product (existing row merged with the incoming fields).
export function checkDigitalProduct(next) {
  const cat = next.category || 'ARTWORK';
  if (!CATEGORIES.includes(cat)) return { error: `Category must be one of ${CATEGORIES.join(', ')}` };

  const link = typeof next.digitalAccessUrl === 'string' ? next.digitalAccessUrl.trim() : '';
  if (link && (link.length > 500 || !HTTP_URL.test(link))) return { error: 'The access link must be a full http(s) URL' };
  const derived = {};

  if (cat === 'ARTWORK') {
    // Nothing digital applies to an artwork — clear stale values on a category change.
    return { derived: { digitalAccessUrl: null, bookFormat: null, digitalPrice: null, physicalPrice: null, creatorName: null, isbn: null, publisher: null, language: null } };
  }

  if (cat === 'MUSIC') {
    const who = text(next.creatorName, 'Artist', 100, true); if (who.error) return who;
    if (!link) return { error: 'A listen / stream link is required for music' };
    return { derived: { creatorName: who.value, digitalAccessUrl: link, bookFormat: null, digitalPrice: null, physicalPrice: null, isbn: null, publisher: null, language: null } };
  }

  // BOOK
  const author = text(next.creatorName, 'Author', 100, true); if (author.error) return author;
  const isbn = text(next.isbn, 'ISBN', 30, false); if (isbn.error) return isbn;
  const publisher = text(next.publisher, 'Publisher', 100, false); if (publisher.error) return publisher;
  const language = text(next.language, 'Language', 40, false); if (language.error) return language;
  const fmt = next.bookFormat;
  if (!BOOK_FORMATS.includes(fmt)) return { error: 'Choose a format: digital, physical or both' };
  const dPrice = num(next.digitalPrice), pPrice = num(next.physicalPrice);
  const wantsDigital = fmt === 'DIGITAL' || fmt === 'BOTH', wantsPhysical = fmt === 'PHYSICAL' || fmt === 'BOTH';
  if (wantsDigital) {
    if (!link) return { error: 'A read link is required for the digital edition' };
    if (!positive(dPrice)) return { error: 'Enter a digital price greater than 0' };
  }
  if (wantsPhysical && !positive(pPrice)) return { error: 'Enter a physical price greater than 0' };
  derived.creatorName = author.value; derived.isbn = isbn.value; derived.publisher = publisher.value; derived.language = language.value;
  derived.bookFormat = fmt;
  derived.digitalAccessUrl = wantsDigital ? link : null;
  derived.digitalPrice = wantsDigital ? dPrice : null;
  derived.physicalPrice = wantsPhysical ? pPrice : null;
  // basePrice mirrors the cheapest edition so listings, sorting and the price
  // filter keep working on the one column they already use.
  derived.basePrice = fmt === 'DIGITAL' ? dPrice : fmt === 'PHYSICAL' ? pPrice : Math.min(dPrice, pPrice);
  return { derived };
}

// Decides what one cart line actually is and what it costs. The client only
// says WHICH edition it wants; the price always comes from the product.
export function resolveOrderLine(product, item) {
  const qty = item.quantity;
  if (!Number.isInteger(qty) || qty < 1 || qty > 100) return { error: 'Quantity must be a whole number between 1 and 100' };

  if (product.category === 'MUSIC') {
    if (!product.digitalAccessUrl) return { error: `"${product.title}" isn't available right now` };
    return { format: 'DIGITAL', quantity: 1, price: Number(product.basePrice), physical: false };
  }

  if (product.category === 'BOOK') {
    const allowed = product.bookFormat === 'BOTH' ? ['DIGITAL', 'PHYSICAL'] : product.bookFormat ? [product.bookFormat] : [];
    if (!allowed.length) return { error: `"${product.title}" isn't available right now` };
    let format = item.format;
    if (!format && allowed.length === 1) format = allowed[0];
    if (!allowed.includes(format)) return { error: `Choose a format for "${product.title}": ${allowed.join(' or ').toLowerCase()}` };
    if (format === 'DIGITAL') {
      if (!product.digitalAccessUrl) return { error: `The digital edition of "${product.title}" isn't available right now` };
      return { format, quantity: 1, price: Number(product.digitalPrice ?? product.basePrice), physical: false };
    }
    return { format, quantity: qty, price: Number(product.physicalPrice ?? product.basePrice), physical: true };
  }

  return { format: null, quantity: qty, price: null, physical: true }; // ARTWORK — priced by the caller (variations)
}
