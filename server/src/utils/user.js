import { prisma } from '../prisma.js';
import { hashPassword } from './password.js';

// Finds a user by email, creating one with the provided default role if missing.
export async function findOrCreateUserByEmail(email, defaultRole = 'student') {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();
  let user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: normalized,
        passwordHash: hashPassword(normalized + Date.now()),
        role: defaultRole || 'student'
      }
    });
  }
  return user;
}
