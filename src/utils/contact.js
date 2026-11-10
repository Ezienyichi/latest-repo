// Turns the admin-entered contact settings into links. The phone rule mirrors
// the server's (functions/_lib/contact.js): international format, "+", country
// code not starting with 0, 7–15 digits; spaces/dashes/brackets are ignored.
export function normalizePhone(v) {
  if (typeof v !== 'string') return null;
  const compact = v.trim().replace(/[\s().-]/g, '');
  return /^\+[1-9]\d{6,14}$/.test(compact) ? compact : null;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const mailHref = (email) => (email ? `mailto:${email}` : null);

// tel: needs only "+" and digits. An older value that isn't strictly valid still
// gets a best-effort link rather than disappearing.
export function telHref(phone) {
  if (!phone) return null;
  const n = normalizePhone(phone) || phone.replace(/[^\d+]/g, '');
  return n ? `tel:${n}` : null;
}

// wa.me wants the number as digits only, no "+".
export function waHref(number, text) {
  const n = normalizePhone(number);
  if (!n) return null;
  return `https://wa.me/${n.slice(1)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
