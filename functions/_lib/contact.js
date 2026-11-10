// Contact-detail rules shared by the admin validators.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// International phone format: a leading "+", a country code that doesn't start
// with 0, 7–15 digits in total (E.164). Spaces, dashes, dots and brackets are
// allowed for readability and ignored when checking — "+234 801 234 5678" and
// "+2348012345678" are both fine; "0801 234 5678" (no country code) is not.
export function normalizePhone(v) {
  if (typeof v !== 'string') return null;
  const compact = v.trim().replace(/[\s().-]/g, '');
  return /^\+[1-9]\d{6,14}$/.test(compact) ? compact : null;
}
