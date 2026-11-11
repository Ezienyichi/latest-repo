import { Hono } from 'hono';
import { hashPassword } from '../auth.js';
import { writeAuditLog } from '../audit.js';
import { EMAIL_RE } from '../contact.js';

// OWNER ONLY (no `staffOk` on any route here, so the /api/admin gate refuses STAFF): creating and
// deactivating staff logins, and reading the audit log. Mounted at /api/admin.
const staff = new Hono();

// A temporary password for a new / reset staff login. Shown to the owner once, stored only as a PBKDF2 hash.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';   // no look-alike characters
export function temporaryPassword(length = 16) {
  const out = [];
  while (out.length < length) {
    const b = crypto.getRandomValues(new Uint8Array(32));
    for (const x of b) { if (x < 224 && out.length < length) out.push(ALPHABET[x % ALPHABET.length]); }   // 224 = 4×56: no modulo bias
  }
  return out.join('');
}

const pub = (u) => ({ id: u.id, email: u.email, role: u.role, firstName: u.firstName, lastName: u.lastName, deactivatedAt: u.deactivatedAt, mustChangePassword: u.mustChangePassword, createdAt: u.createdAt });
const nameOk = (v) => typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= 60;

// Create a staff login: name + email in, a one-time temporary password out. They must replace it on first login.
staff.post('/users/staff', async (c) => {
  const prisma = c.get('prisma');
  try {
    const b = await c.req.json().catch(() => ({}));
    if (!nameOk(b.firstName)) return c.json({ error: 'First name is required' }, 400);
    if (b.lastName !== undefined && b.lastName !== '' && !nameOk(b.lastName)) return c.json({ error: 'Last name is too long' }, 400);
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) return c.json({ error: 'Enter a valid email address' }, 400);
    if (await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } })) return c.json({ error: 'An account with that email already exists' }, 409);
    const temp = temporaryPassword();
    let user;
    try {
      user = await prisma.user.create({ data: { email, firstName: b.firstName.trim(), lastName: (b.lastName || '').trim() || null, role: 'STAFF', passwordHash: await hashPassword(temp), mustChangePassword: true, emailVerified: new Date() } });
    } catch (e) { if (e.code === 'P2002') return c.json({ error: 'An account with that email already exists' }, 409); throw e; }
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'staff.create', targetType: 'User', targetId: user.id, before: null, after: { email: user.email, name: [user.firstName, user.lastName].filter(Boolean).join(' '), role: 'STAFF' } });
    return c.json({ user: pub(user), temporaryPassword: temp }, 201);
  } catch (e) { console.error('staff create failed:', e.message); return c.json({ error: 'Could not create the staff login' }, 500); }
});

async function staffTarget(c) {
  const u = await c.get('prisma').user.findUnique({ where: { id: c.req.param('id') } });
  if (!u) return { res: c.json({ error: 'Not found' }, 404) };
  if (u.role !== 'STAFF') return { res: c.json({ error: 'That account is not a staff login' }, 400) };
  return { u };
}

// Deactivate: takes effect on the very next request from any of her devices (sessionVersion bump + deactivatedAt,
// both checked by the auth middleware), and login is refused.
staff.post('/users/:id/deactivate', async (c) => {
  const prisma = c.get('prisma');
  try {
    const t = await staffTarget(c); if (t.res) return t.res;
    if (t.u.deactivatedAt) return c.json({ error: 'Already deactivated' }, 409);
    const user = await prisma.user.update({ where: { id: t.u.id }, data: { deactivatedAt: new Date(), sessionVersion: { increment: 1 } } });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'staff.deactivate', targetType: 'User', targetId: user.id, before: { active: true }, after: { active: false, signedOutEverywhere: true } });
    return c.json({ user: pub(user) });
  } catch (e) { console.error(e.message); return c.json({ error: 'Could not deactivate' }, 500); }
});

// Reactivate (comes back with a NEW temporary password; old sessions stay dead) and reset a forgotten password: same shape.
for (const [path, action, needsInactive] of [['reactivate', 'staff.reactivate', true], ['reset-password', 'staff.reset_password', false]]) {
  staff.post(`/users/:id/${path}`, async (c) => {
    const prisma = c.get('prisma');
    try {
      const t = await staffTarget(c); if (t.res) return t.res;
      if (needsInactive && !t.u.deactivatedAt) return c.json({ error: 'That login is not deactivated' }, 409);
      if (!needsInactive && t.u.deactivatedAt) return c.json({ error: 'Reactivate the login first' }, 409);
      const temp = temporaryPassword();
      const user = await prisma.user.update({ where: { id: t.u.id }, data: { deactivatedAt: null, passwordHash: await hashPassword(temp), mustChangePassword: true, sessionVersion: { increment: 1 } } });
      await writeAuditLog(prisma, { adminId: c.get('userId'), action, targetType: 'User', targetId: user.id, before: null, after: { temporaryPasswordIssued: true, signedOutEverywhere: true } });
      return c.json({ user: pub(user), temporaryPassword: temp });
    } catch (e) { console.error(e.message); return c.json({ error: 'Failed' }, 500); }
  });
}

// The audit log: who did what, newest first. Each row names the person (not just an id).
staff.get('/audit-log', async (c) => {
  const prisma = c.get('prisma');
  try {
    const q = c.req.query();
    const page = Math.max(1, parseInt(q.page, 10) || 1), limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 50));
    const where = {};
    if (q.adminId) where.adminId = q.adminId;
    if (q.action) where.action = { startsWith: q.action };
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { admin: { select: { id: true, email: true, firstName: true, lastName: true, role: true } } } }),
      prisma.auditLog.count({ where }),
    ]);
    return c.json({ items: rows, total, page, pages: Math.ceil(total / limit) });
  } catch (e) { console.error(e.message); return c.json({ error: 'Failed' }, 500); }
});

export default staff;
