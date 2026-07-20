import { Hono } from 'hono';
import { authenticate } from '../auth.js';
import { hashPassword, verifyPassword, makeToken } from '../auth.js';
import { vCode } from '../helpers.js';

const auth = new Hono();

auth.post('/register', async (c) => {
  const prisma = c.get('prisma');
  try {
    const { email, password, firstName, lastName, role, phone } = await c.req.json();
    if (!email || !password) return c.json({ error: 'Email and password required' }, 400);
    if (password.length < 8) return c.json({ error: 'Password must be 8+ characters' }, 400);
    if (await prisma.user.findUnique({ where: { email } })) return c.json({ error: 'Email already registered' }, 409);
    const validRole = ['BUYER', 'ARTIST', 'CHARITY'].includes(role) ? role : 'BUYER';
    const verificationCode = vCode();
    const user = await prisma.user.create({ data: { email, passwordHash: await hashPassword(password), firstName, lastName, phone, role: validRole, verificationCode } });
    return c.json({
      token: await makeToken(user, c.env.JWT_SECRET),
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, emailVerified: null },
      verificationCode: c.env.NODE_ENV === 'development' ? verificationCode : undefined,
      message: 'Check your email for the verification code.',
    }, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Registration failed' }, 500); }
});

auth.post('/login', async (c) => {
  const prisma = c.get('prisma');
  try {
    const { email, password } = await c.req.json();
    const user = await prisma.user.findUnique({ where: { email }, include: { artistProfile: true, charityProfile: true } });
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) return c.json({ error: 'Invalid credentials' }, 401);
    return c.json({
      token: await makeToken(user, c.env.JWT_SECRET),
      user: {
        id: user.id, email: user.email, role: user.role,
        firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        hasProfile: !!(user.artistProfile || user.charityProfile),
        artistProfile: user.artistProfile ? { id: user.artistProfile.id, displayName: user.artistProfile.displayName, verified: user.artistProfile.verified } : null,
        charityProfile: user.charityProfile ? { id: user.charityProfile.id, name: user.charityProfile.name, verified: user.charityProfile.verified } : null,
      },
    });
  } catch (e) { console.error(e); return c.json({ error: 'Login failed' }, 500); }
});

auth.post('/verify-email', authenticate, async (c) => {
  const prisma = c.get('prisma');
  try {
    const user = await prisma.user.findUnique({ where: { id: c.get('userId') } });
    if (!user) return c.json({ error: 'Not found' }, 404);
    if (user.emailVerified) return c.json({ message: 'Already verified' });
    const { code } = await c.req.json();
    if (user.verificationCode !== code) return c.json({ error: 'Invalid code' }, 400);
    await prisma.user.update({ where: { id: c.get('userId') }, data: { emailVerified: new Date(), verificationCode: null } });
    return c.json({ message: 'Email verified' });
  } catch (e) { return c.json({ error: 'Verification failed' }, 500); }
});

auth.get('/me', authenticate, async (c) => {
  const prisma = c.get('prisma');
  try {
    const user = await prisma.user.findUnique({ where: { id: c.get('userId') }, include: { artistProfile: true, charityProfile: true } });
    if (!user) return c.json({ error: 'Not found' }, 404);
    const { passwordHash, verificationCode, ...safe } = user;
    return c.json(safe);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

auth.patch('/me', authenticate, async (c) => {
  const prisma = c.get('prisma');
  try {
    const { firstName, lastName, phone, avatarUrl } = await c.req.json();
    const user = await prisma.user.update({ where: { id: c.get('userId') }, data: { firstName, lastName, phone, avatarUrl } });
    return c.json(user);
  } catch (e) { return c.json({ error: 'Update failed' }, 500); }
});

auth.post('/setup/artist', authenticate, async (c) => {
  const prisma = c.get('prisma');
  try {
    const { displayName, artistStatement, biography, location, socialLinks, sdgIds } = await c.req.json();
    if (!displayName) return c.json({ error: 'Display name required' }, 400);
    if (await prisma.artistProfile.findUnique({ where: { userId: c.get('userId') } })) return c.json({ error: 'Profile exists' }, 409);
    await prisma.user.update({ where: { id: c.get('userId') }, data: { role: 'ARTIST' } });
    const profile = await prisma.artistProfile.create({ data: { userId: c.get('userId'), displayName, artistStatement, biography, location, socialLinks: socialLinks || {}, sdgIds: sdgIds || [] } });
    return c.json({ profile, message: 'Artist profile created.' }, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Setup failed' }, 500); }
});

auth.post('/setup/charity', authenticate, async (c) => {
  const prisma = c.get('prisma');
  try {
    const { name, mission, registrationNo, sdgIds, websiteUrl, target } = await c.req.json();
    if (!name || !registrationNo) return c.json({ error: 'Name and registration number required' }, 400);
    if (await prisma.charityProfile.findUnique({ where: { userId: c.get('userId') } })) return c.json({ error: 'Profile exists' }, 409);
    await prisma.user.update({ where: { id: c.get('userId') }, data: { role: 'CHARITY' } });
    const profile = await prisma.charityProfile.create({ data: { userId: c.get('userId'), name, mission, registrationNo, sdgIds: sdgIds || [], websiteUrl, target: target || 50000 } });
    return c.json({ profile, message: 'Charity profile created.' }, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Setup failed' }, 500); }
});

auth.post('/forgot-password', async (c) => {
  return c.json({ message: 'If that email exists, a reset code has been sent.' });
});

auth.post('/reset-password', async (c) => {
  const prisma = c.get('prisma');
  try {
    const { email, code, newPassword } = await c.req.json();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.verificationCode !== code) return c.json({ error: 'Invalid code' }, 400);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword), verificationCode: null } });
    return c.json({ message: 'Password reset successful' });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default auth;
