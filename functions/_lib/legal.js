// The site's legal pages. Each has a fixed slug and title; the TEXT is versioned
// content in the LegalDocument table (admin → Legal). A publish always inserts
// a new version — existing versions are never changed — so the exact wording a
// buyer, creator or charity agreed to can be shown again at any time.
export const LEGAL_DOCS = [
  { slug: 'terms', title: 'Terms of Use and Sale', short: 'Terms of Sale' },
  { slug: 'privacy', title: 'Privacy Policy', short: 'Privacy Policy' },
  { slug: 'returns', title: 'Shipping, Returns and Buyer Protection', short: 'Shipping & Returns' },
  { slug: 'creator-agreement', title: 'Creator Agreement', short: 'Creator Agreement' },
  { slug: 'partner-agreement', title: 'Charity and Campaign Partner Agreement', short: 'Partner Agreement' },
];

export const legalDoc = (slug) => LEGAL_DOCS.find(d => d.slug === slug) || null;

export async function latestVersion(prisma, slug) {
  return prisma.legalDocument.findFirst({ where: { slug }, orderBy: { version: 'desc' } });
}

// { terms: 2, privacy: 1, … } — only documents that have been published.
export async function currentVersions(prisma, slugs = LEGAL_DOCS.map(d => d.slug)) {
  const rows = await prisma.legalDocument.groupBy({ by: ['slug'], where: { slug: { in: slugs } }, _max: { version: true } });
  return Object.fromEntries(rows.map(r => [r.slug, r._max.version]));
}
