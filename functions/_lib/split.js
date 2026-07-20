// Charity/artist/platform payment split, sourced from SiteSetting so an
// admin panel can change rates without a redeploy. The hardcoded values
// below are used ONLY when the corresponding SiteSetting row is missing —
// they are a fallback, not the source of truth.
const FALLBACK_CHARITY_PCT = 0.10;
const FALLBACK_PLATFORM_PCT = 0.10;

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function readPct(prisma, key, fallback) {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  if (!row) return fallback;
  const v = row.value;
  return typeof v === 'number' ? v : fallback;
}

export async function getSplitRates(prisma) {
  const [charityPct, platformPct] = await Promise.all([
    readPct(prisma, 'charity_pct', FALLBACK_CHARITY_PCT),
    readPct(prisma, 'platform_pct', FALLBACK_PLATFORM_PCT),
  ]);
  return { charityPct, platformPct };
}

// amount is a line total or order subtotal in major currency units.
// Artist amount is always the remainder (amount - charity - platform),
// never a separate multiplier, so rounding never leaves an orphaned
// fraction unaccounted for across the three legs.
export function computeSplit(amount, { charityPct, platformPct }) {
  const charityAmt = round2(amount * charityPct);
  const platformAmt = round2(amount * platformPct);
  const artistAmt = round2(amount - charityAmt - platformAmt);
  return { charityAmt, platformAmt, artistAmt };
}
