// "This visitor has already subscribed" flag, shared by the popup and the
// homepage form. Written to localStorage AND a cookie (either can be blocked
// independently), and every access is guarded: when neither works, the
// module-level fallback below still holds for the current page session, so
// behaviour degrades to session-only rather than breaking.
const KEY = 'ft_newsletter_subscribed';
const ONE_YEAR_S = 60 * 60 * 24 * 365;

let subscribedThisSession = false;

function readLocal() { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } }
function readCookie() { try { return document.cookie.split('; ').some(c => c === `${KEY}=1`); } catch { return false; } }

export function isSubscribed() {
  return subscribedThisSession || readLocal() || readCookie();
}

export function markSubscribed() {
  subscribedThisSession = true;
  try { localStorage.setItem(KEY, '1'); } catch { /* blocked / private mode */ }
  try { document.cookie = `${KEY}=1; max-age=${ONE_YEAR_S}; path=/; SameSite=Lax`; } catch { /* blocked */ }
}
