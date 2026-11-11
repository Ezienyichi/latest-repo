// Auth utilities for Workers: JWT via hono/jwt, password hashing via
// Web Crypto PBKDF2 (bcryptjs does not run on Workers — no native binding).
import { sign, verify } from 'hono/jwt';

const PBKDF2_ITERATIONS = 100000;
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7d, matches prior jsonwebtoken expiresIn

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function deriveBits(password, salt, iterations) {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, 256);
  return new Uint8Array(bits);
}

// Stored format: pbkdf2$<iterations>$<saltHex>$<hashHex>
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveBits(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

export async function verifyPassword(password, stored) {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[1], 10);
  const salt = fromHex(parts[2]);
  const hash = await deriveBits(password, salt, iterations);
  return timingSafeEqual(toHex(hash), parts[3]);
}

export async function makeToken(user, secret) {
  return sign({ userId: user.id, role: user.role, email: user.email, sv: user.sessionVersion ?? 0, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS }, secret, 'HS256');
}

// ADMIN and STAFF tokens are tied to the account's live state: changing the password / login email, deactivating
// the account, or changing its role ends every earlier token. Tokens issued before "sv" existed carry no claim and
// count as version 0. Checked for these two roles only (one indexed read), so other roles' requests cost nothing extra.
const PRIVILEGED = ['ADMIN', 'STAFF'];
async function checkSession(c, decoded) {
  if (!PRIVILEGED.includes(decoded.role)) return { ok: true };
  const prisma = c.get('prisma'); if (!prisma) return { ok: true };
  const u = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { sessionVersion: true, role: true, deactivatedAt: true, mustChangePassword: true } });
  if (!u || u.deactivatedAt || u.role !== decoded.role || (decoded.sv ?? 0) !== u.sessionVersion) return { ok: false };
  return { ok: true, mustChange: u.mustChangePassword };
}
// While a temporary password is still in use, only these calls work (so the person can look themselves up and replace it).
const allowedWhileTemporary = (c) => {
  const m = c.req.method, p = c.req.path;
  return (m === 'GET' && (p === '/api/auth/me' || p === '/api/admin/account')) || (m === 'POST' && p === '/api/admin/account/password');
};

export async function authenticate(c, next) {
  const h = c.req.header('authorization');
  if (!h?.startsWith('Bearer ')) return c.json({ error: 'Authentication required' }, 401);
  try {
    const decoded = await verify(h.slice(7), c.env.JWT_SECRET, 'HS256');
    const sess = await checkSession(c, decoded);
    if (!sess.ok) return c.json({ error: 'Session ended — please sign in again' }, 401);
    // 403 (not 401): the client signs out on a 401, and this person only needs to pick a password.
    if (sess.mustChange && !allowedWhileTemporary(c)) return c.json({ error: 'Please set your own password before continuing', code: 'PASSWORD_CHANGE_REQUIRED' }, 403);
    c.set('userId', decoded.userId);
    c.set('userRole', decoded.role);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
}

export function requireRole(...roles) {
  return async (c, next) => {
    if (!roles.includes(c.get('userRole'))) return c.json({ error: 'Insufficient permissions' }, 403);
    await next();
  };
}

// Marks a route as available to STAFF as well as ADMIN. The /api/admin router refuses STAFF on every route that
// does not carry THIS exact handler (default deny), so a route added later is owner-only until someone opts it in.
export const staffOk = requireRole('ADMIN', 'STAFF');
export async function staffGate(c, next) {
  if (c.get('userRole') !== 'STAFF') return next();
  if (c.req.matchedRoutes.some(r => r.handler === staffOk)) return next();
  return c.json({ error: 'Insufficient permissions' }, 403);
}

export async function optionalAuth(c, next) {
  const h = c.req.header('authorization');
  if (h?.startsWith('Bearer ')) {
    try {
      const decoded = await verify(h.slice(7), c.env.JWT_SECRET, 'HS256');
      if ((await checkSession(c, decoded)).ok) { c.set('userId', decoded.userId); c.set('userRole', decoded.role); }
    } catch { /* ignore invalid token, proceed unauthenticated */ }
  }
  await next();
}
