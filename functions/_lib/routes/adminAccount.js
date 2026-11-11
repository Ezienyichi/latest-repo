import { Hono } from 'hono';
import { hashPassword, verifyPassword, makeToken } from '../auth.js';
import { writeAuditLog } from '../audit.js';
import { checkRateLimit } from '../rateLimit.js';
import { EMAIL_RE } from '../contact.js';

// The logged-in admin's own account: change password, change login email. Mounted under /api/admin/account
// (behind authenticate + requireRole('ADMIN')). Both changes need the CURRENT password again, end every
// other session (sessionVersion bump → older tokens stop working) and return a fresh token so the browser
// making the change stays signed in.
const account = new Hono();

export const MIN_PASSWORD = 12;
const MAX_PASSWORD = 200;
const ATTEMPT_LIMIT = 8, ATTEMPT_WINDOW = 900;      // current-password guesses per admin per 15 min (a stolen session can't brute-force it)
const RESERVED_TLD = /\.(local|localhost|invalid|test|example)$/i;

const view = (u) => ({ id: u.id, email: u.email, role: u.role, firstName: u.firstName, lastName: u.lastName });

async function loadAndVerify(c, currentPassword) {
  const prisma = c.get('prisma'), id = c.get('userId');
  const ok = await checkRateLimit(c.env.RATE_LIMIT_KV, `account:${id}`, ATTEMPT_LIMIT, ATTEMPT_WINDOW);
  if (!ok) return { res: c.json({ error: 'Too many attempts — please wait 15 minutes and try again' }, 429) };
  if (typeof currentPassword !== 'string' || !currentPassword) return { res: c.json({ error: 'Enter your current password' }, 400) };
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== 'ADMIN' || user.deactivatedAt) return { res: c.json({ error: 'Account unavailable' }, 403) };
  // 400, not 401: the client treats any 401 as "session expired" and signs the admin out.
  if (!user.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) return { res: c.json({ error: 'Current password is incorrect' }, 400) };
  return { user };
}

account.get('/', async (c) => {
  const user = await c.get('prisma').user.findUnique({ where: { id: c.get('userId') } });
  return user ? c.json(view(user)) : c.json({ error: 'Not found' }, 404);
});

account.post('/password', async (c) => {
  const prisma = c.get('prisma');
  try {
    const { currentPassword, newPassword, confirmPassword } = await c.req.json().catch(() => ({}));
    const v = await loadAndVerify(c, currentPassword); if (v.res) return v.res;
    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD) return c.json({ error: `New password must be at least ${MIN_PASSWORD} characters` }, 400);
    if (newPassword.length > MAX_PASSWORD) return c.json({ error: `New password must be at most ${MAX_PASSWORD} characters` }, 400);
    if (newPassword !== confirmPassword) return c.json({ error: 'New password and confirmation do not match' }, 400);
    if (newPassword === currentPassword) return c.json({ error: 'New password must be different from the current one' }, 400);

    const passwordHash = await hashPassword(newPassword);
    const updated = await prisma.user.update({ where: { id: v.user.id }, data: { passwordHash, sessionVersion: { increment: 1 } } });
    // Neither password (nor the hash) is ever written to the log.
    await writeAuditLog(prisma, { adminId: v.user.id, action: 'account.password_change', targetType: 'User', targetId: v.user.id, before: null, after: { otherSessionsEnded: true } });
    return c.json({ ok: true, token: await makeToken(updated, c.env.JWT_SECRET), user: view(updated) });
  } catch (e) { console.error('password change failed:', e.message); return c.json({ error: 'Could not change the password' }, 500); }
});

account.post('/email', async (c) => {
  const prisma = c.get('prisma');
  try {
    const { currentPassword, newEmail } = await c.req.json().catch(() => ({}));
    const v = await loadAndVerify(c, currentPassword); if (v.res) return v.res;
    const email = typeof newEmail === 'string' ? newEmail.trim().toLowerCase() : '';
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) return c.json({ error: 'Enter a valid email address' }, 400);
    if (RESERVED_TLD.test(email)) return c.json({ error: 'Use a real email address you can receive mail at' }, 400);
    if (email === v.user.email.toLowerCase()) return c.json({ error: 'That is already your login email' }, 400);
    const taken = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, NOT: { id: v.user.id } }, select: { id: true } });
    if (taken) return c.json({ error: 'Another account already uses that email' }, 409);

    let updated;
    try { updated = await prisma.user.update({ where: { id: v.user.id }, data: { email, sessionVersion: { increment: 1 } } }); }
    catch (e) { if (e.code === 'P2002') return c.json({ error: 'Another account already uses that email' }, 409); throw e; }
    await writeAuditLog(prisma, { adminId: v.user.id, action: 'account.email_change', targetType: 'User', targetId: v.user.id, before: { email: v.user.email }, after: { email, otherSessionsEnded: true } });
    return c.json({ ok: true, token: await makeToken(updated, c.env.JWT_SECRET), user: view(updated) });
  } catch (e) { console.error('email change failed:', e.message); return c.json({ error: 'Could not change the email' }, 500); }
});

export default account;
