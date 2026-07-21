// KV-backed rate limiter. Approximate under concurrent requests (read then
// write, no atomic increment) — acceptable here since this guards against
// abuse (unlimited signed-URL minting), not billing-grade accounting.
// Cloudflare's own Rate Limiting binding carries the same caveat and isn't
// confirmed supported on Pages Functions, so KV is the more portable choice.
export async function checkRateLimit(kv, key, limit, windowSeconds) {
  if (!kv) {
    // Binding not wired yet (e.g. local dev before KV namespace exists).
    // Fail open but loudly — this must not be silently unlimited in prod.
    console.warn('RATE_LIMIT_KV binding missing — rate limiting is disabled');
    return true;
  }
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= limit) return false;
  await kv.put(key, String(count + 1), { expirationTtl: windowSeconds });
  return true;
}
