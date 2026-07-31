const LABELS = { ORIGINAL: 'Original', PRINT: 'Print', EDITION: 'Edition' };

// Small badge indicating whether a product is a one-of-a-kind ORIGINAL vs a
// reproduced PRINT/EDITION — used everywhere a product image or detail page
// renders. Renders nothing if editionType is absent (e.g. very old rows).
export default function EditionBadge({ editionType, style }) {
  const label = LABELS[editionType];
  if (!label) return null;
  return (
    <span className={`badge ${editionType === 'ORIGINAL' ? 'b-gold' : 'b-muted'}`} style={style}>{label}</span>
  );
}

// Originals are appraised, not price-tagged the way a print is — the number
// shown is labelled "Estimated Value" and prefers the estimatedValue field
// (falling back to basePrice if an admin hasn't set one yet). Prints/
// editions just show the plain price, unlabelled, as before.
export function priceLabel(product) {
  return product?.editionType === 'ORIGINAL' ? 'Estimated Value' : null;
}

export function priceAmount(product) {
  if (product?.editionType === 'ORIGINAL' && product?.estimatedValue != null) return Number(product.estimatedValue);
  return Number(product?.basePrice ?? product?.price ?? 0);
}
