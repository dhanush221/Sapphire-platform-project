import express from 'express';
import { prisma } from '../prisma.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { createSession, deleteSession } from '../utils/sessionStore.js';
import { clearSessionCookie, setSessionCookie } from '../utils/http.js';
import { validateBody } from '../middleware/validate.js';
import { z } from 'zod';
import crypto from 'crypto';
import { sendMail } from '../utils/mailer.js';
import { consumeResetToken, saveResetToken } from '../utils/resetTokens.js';

const router = express.Router();
const roleEnum = z.enum(['student', 'supervisor']);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  name: z.string().trim().optional(),
  role: roleEnum.optional().default('student')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.')
});

const forgotSchema = z.object({
  email: z.string().email()
});

const resetSchema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters.')
});

const RESET_URL_BASE = process.env.RESET_URL_BASE || 'http://localhost:5173/reset-password';
const RESET_EXP_MINUTES_RAW = Number(process.env.RESET_TOKEN_MINUTES || 60);
const RESET_EXP_MINUTES = Number.isFinite(RESET_EXP_MINUTES_RAW) && RESET_EXP_MINUTES_RAW > 0 ? RESET_EXP_MINUTES_RAW : 60;

router.post('/register', validateBody(registerSchema), async (req, res) => {
  try {
    const { email, password, name, role } = req.validatedBody;
    const normalized = email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (existing) return res.status(409).json({ error: 'Account already exists for that email.' });

    const user = await prisma.user.create({
      data: {
        email: normalized,
        passwordHash: hashPassword(password),
        name: name?.trim() || null,
        role: role || 'student'
      }
    });

    const { token, expiresAt } = await createSession(user.id);
    setSessionCookie(res, token, expiresAt);
    return res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('POST /api/auth/register failed:', err);
    return res.status(500).json({ error: 'Unable to register right now.' });
  }
});

router.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.validatedBody;
    const normalized = email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const { token, expiresAt } = await createSession(user.id);
    setSessionCookie(res, token, expiresAt);
    return res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('POST /api/auth/login failed:', err);
    return res.status(500).json({ error: 'Unable to login right now.' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const token = req.sessionToken || req.get('authorization')?.replace(/bearer\s+/i, '');
    if (token) await deleteSession(token.trim());
    clearSessionCookie(res);
    return res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/logout failed:', err);
    return res.status(500).json({ error: 'Unable to logout right now.' });
  }
});

router.get('/me', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  return res.json({ user: req.user });
});

router.post('/forgot-password', validateBody(forgotSchema), async (req, res) => {
  try {
    const email = req.validatedBody.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({ ok: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_EXP_MINUTES * 60 * 1000);

    await saveResetToken({ userId: user.id, tokenHash, expiresAt });

    const resetLink = `${RESET_URL_BASE}?token=${encodeURIComponent(token)}`;
    try {
      await sendMail({
        to: email,
        subject: 'Reset your Sapphire password',
        html: `<p>You requested to reset your Sapphire password.</p>
               <p><a href="${resetLink}">Click here to reset your password</a> (valid for ${RESET_EXP_MINUTES} minutes).</p>
               <p>If you did not request this, you can ignore this email.</p>`
      });
    } catch (mailErr) {
      console.error('Failed to send reset email:', mailErr);
      return res.status(500).json({ error: 'Could not send reset email. Check email configuration.' });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/forgot-password failed:', err);
    return res.status(500).json({ error: 'Unable to start password reset.' });
  }
});

router.post('/reset-password', validateBody(resetSchema), async (req, res) => {
  try {
    const { token, password } = req.validatedBody;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const reset = await consumeResetToken(tokenHash);
    if (!reset) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }
    const user = await prisma.user.findUnique({ where: { id: reset.userId } });
    if (!user) return res.status(404).json({ error: 'User not found for this token.' });

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(password) }
    });

    const { token: sessionToken, expiresAt } = await createSession(user.id);
    setSessionCookie(res, sessionToken, expiresAt);
    return res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('POST /api/auth/reset-password failed:', err);
    return res.status(500).json({ error: 'Unable to reset password.' });
  }
});

export default router;
