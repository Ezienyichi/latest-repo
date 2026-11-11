// The five legal pages — slugs and titles match functions/_lib/legal.js.
export const LEGAL_DOCS = [
  { slug: 'terms', title: 'Terms of Use and Sale', short: 'Terms of Sale' },
  { slug: 'privacy', title: 'Privacy Policy', short: 'Privacy Policy' },
  { slug: 'returns', title: 'Shipping, Returns and Buyer Protection', short: 'Shipping & Returns' },
  { slug: 'creator-agreement', title: 'Creator Agreement', short: 'Creator Agreement' },
  { slug: 'partner-agreement', title: 'Charity and Campaign Partner Agreement', short: 'Partner Agreement' },
];
export const legalPath = (slug) => `/legal/${slug}`;
export const legalDoc = (slug) => LEGAL_DOCS.find(d => d.slug === slug) || null;
