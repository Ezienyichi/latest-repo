// The ONE platform currency. A single SiteSetting ("currency") drives every
// amount on the site — prices, splits, campaign targets, rollups — so
// amounts are never mixed across currencies. Changing it relabels amounts;
// it does not convert them.
export const CURRENCIES = {
  NGN: { symbol: '₦', name: 'Nigerian Naira' },
  USD: { symbol: '$', name: 'US Dollar' },
  GBP: { symbol: '£', name: 'British Pound' },
  EUR: { symbol: '€', name: 'Euro' },
};
export const DEFAULT_CURRENCY = 'GBP';

export async function getCurrencySymbol(prisma) {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: 'currency' } });
    return (CURRENCIES[row?.value] || CURRENCIES[DEFAULT_CURRENCY]).symbol;
  } catch { return CURRENCIES[DEFAULT_CURRENCY].symbol; }
}
