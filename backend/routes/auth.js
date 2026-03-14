import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const token = (u) => jwt.sign({ userId: u.id, role: u.role, email: u.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
const vCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Register (all roles)
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, phone } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be 8+ characters' });
    if (await prisma.user.findUnique({ where: { email } })) return res.status(409).json({ error: 'Email already registered' });

    const validRole = ['BUYER','ARTIST','CHARITY'].includes(role) ? role : 'BUYER';
    const verificationCode = vCode();
    const user = await prisma.user.create({
      data: { email, passwordHash: await bcrypt.hash(password, 12), firstName, lastName, phone, role: validRole, verificationCode }
    });

    res.status(201).json({
      token: token(user),
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, emailVerified: null },
      verificationCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined,
      message: 'Check your email for the verification code.'
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Registration failed' }); }
});

// Verify email
router.post('/verify-email', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'Not found' });
    if (user.emailVerified) return res.json({ message: 'Already verified' });
    if (user.verificationCode !== req.body.code) return res.status(400).json({ error: 'Invalid code' });
    await prisma.user.update({ where: { id: req.userId }, data: { emailVerified: new Date(), verificationCode: null } });
    res.json({ message: 'Email verified' });
  } catch (e) { res.status(500).json({ error: 'Verification failed' }); }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email }, include: { artistProfile: true, charityProfile: true } });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ error: 'Invalid credentials' });

    res.json({
      token: token(user),
      user: {
        id: user.id, email: user.email, role: user.role,
        firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        hasProfile: !!(user.artistProfile || user.charityProfile),
        artistProfile: user.artistProfile ? { id: user.artistProfile.id, displayName: user.artistProfile.displayName, verified: user.artistProfile.verified } : null,
        charityProfile: user.charityProfile ? { id: user.charityProfile.id, name: user.charityProfile.name, verified: user.charityProfile.verified } : null,
      }
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Login failed' }); }
});

// Setup artist profile
router.post('/setup/artist', authenticate, async (req, res) => {
  try {
    const { displayName, artistStatement, biography, location, socialLinks, sdgIds } = req.body;
    if (!displayName) return res.status(400).json({ error: 'Display name required' });
    if (await prisma.artistProfile.findUnique({ where: { userId: req.userId } }))
      return res.status(409).json({ error: 'Profile exists' });

    await prisma.user.update({ where: { id: req.userId }, data: { role: 'ARTIST' } });
    const profile = await prisma.artistProfile.create({
      data: { userId: req.userId, displayName, artistStatement, biography, location, socialLinks: socialLinks || {}, sdgIds: sdgIds || [] }
    });
    res.status(201).json({ profile, message: 'Artist profile created. Pending verification.' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Setup failed' }); }
});

// Setup charity profile
router.post('/setup/charity', authenticate, async (req, res) => {
  try {
    const { name, mission, registrationNo, sdgIds, websiteUrl, target } = req.body;
    if (!name || !registrationNo) return res.status(400).json({ error: 'Name and registration number required' });
    if (await prisma.charityProfile.findUnique({ where: { userId: req.userId } }))
      return res.status(409).json({ error: 'Profile exists' });

    await prisma.user.update({ where: { id: req.userId }, data: { role: 'CHARITY' } });
    const profile = await prisma.charityProfile.create({
      data: { userId: req.userId, name, mission, registrationNo, sdgIds: sdgIds || [], websiteUrl, target: target || 50000 }
    });
    res.status(201).json({ profile, message: 'Charity profile created. Pending verification.' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Setup failed' }); }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { artistProfile: true, charityProfile: true }
    });
    if (!user) return res.status(404).json({ error: 'Not found' });
    const { passwordHash, verificationCode, ...safe } = user;
    res.json(safe);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Update user
router.patch('/me', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, phone, avatarUrl } = req.body;
    const user = await prisma.user.update({ where: { id: req.userId }, data: { firstName, lastName, phone, avatarUrl } });
    res.json(user);
  } catch (e) { res.status(500).json({ error: 'Update failed' }); }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (user) {
      const code = vCode();
      await prisma.user.update({ where: { id: user.id }, data: { verificationCode: code } });
      // TODO: Send email
    }
    res.json({ message: 'If that email exists, a reset code has been sent.' });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.verificationCode !== code) return res.status(400).json({ error: 'Invalid code' });
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12), verificationCode: null } });
    res.json({ message: 'Password reset successful' });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
