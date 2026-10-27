// The ONE platform currency (SiteSetting "currency"). Every amount on the
// site renders its symbol through cur(), so changing the setting in admin
// relabels everything consistently. It relabels — it does not convert.
export const CURRENCIES = {
  NGN: { symbol: '₦', name: 'Nigerian Naira' },
  USD: { symbol: '$', name: 'US Dollar' },
  GBP: { symbol: '£', name: 'British Pound' },
  EUR: { symbol: '€', name: 'Euro' },
};
export const DEFAULT_CURRENCY = 'GBP';
const CACHE_KEY = 'ft_currency';

const readCache = () => { try { const v = localStorage.getItem(CACHE_KEY); return CURRENCIES[v] ? v : null; } catch { return null; } };

let code = readCache() || DEFAULT_CURRENCY;

export const hasCachedCurrency = () => !!readCache();
export const currencyCode = () => code;
export const cur = () => CURRENCIES[code].symbol;

export function setCurrency(next) {
  if (!CURRENCIES[next]) return false;
  const changed = next !== code;
  code = next;
  try { localStorage.setItem(CACHE_KEY, next); } catch { /* private mode etc. */ }
  return changed;
}
