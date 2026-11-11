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

// Admin tokens are tied to the account's sessionVersion: changing the password / login email bumps it and
// every earlier token stops working. Tokens issued before this existed carry no "sv" and count as version 0.
// Checked for ADMIN only (one indexed read), so the other roles' requests cost nothing extra.
async function sessionEnded(c, decoded) {
  if (decoded.role !== 'ADMIN') return false;
  const prisma = c.get('prisma'); if (!prisma) return false;
  const u = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { sessionVersion: true } });
  return !u || (decoded.sv ?? 0) !== u.sessionVersion;
}

export async function authenticate(c, next) {
  const h = c.req.header('authorization');
  if (!h?.startsWith('Bearer ')) return c.json({ error: 'Authentication required' }, 401);
  try {
    const decoded = await verify(h.slice(7), c.env.JWT_SECRET, 'HS256');
    if (await sessionEnded(c, decoded)) return c.json({ error: 'Session ended — please sign in again' }, 401);
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

export async function optionalAuth(c, next) {
  const h = c.req.header('authorization');
  if (h?.startsWith('Bearer ')) {
    try {
      const decoded = await verify(h.slice(7), c.env.JWT_SECRET, 'HS256');
      if (!(await sessionEnded(c, decoded))) { c.set('userId', decoded.userId); c.set('userRole', decoded.role); }
    } catch { /* ignore invalid token, proceed unauthenticated */ }
  }
  await next();
}
