import { Fragment, useEffect, useState } from 'react';
import api from '../utils/api';
import { currencyCode, setCurrency, hasCachedCurrency } from '../utils/currency';

// Loads the platform currency once and re-keys the tree whenever it changes,
// so every price re-renders with the new symbol. With no cached value (first
// ever visit) rendering waits briefly for the setting rather than flashing
// the wrong symbol.
export default function CurrencyProvider({ children }) {
  const [code, setCode] = useState(currencyCode());
  const [ready, setReady] = useState(hasCachedCurrency());

  useEffect(() => {
    let alive = true;
    const done = () => alive && setReady(true);
    const t = setTimeout(done, 2000);
    api.getPublicSettings()
      .then((s) => { if (alive && s?.currency && setCurrency(s.currency)) setCode(currencyCode()); })
      .catch(() => {})
      .finally(() => { clearTimeout(t); done(); });
    // Admin saving the setting in this tab: relabel immediately.
    const onChange = () => alive && setCode(currencyCode());
    window.addEventListener('ft-currency-changed', onChange);
    return () => { alive = false; clearTimeout(t); window.removeEventListener('ft-currency-changed', onChange); };
  }, []);

  if (!ready) return null;
  return <Fragment key={code}>{children}</Fragment>;
}
