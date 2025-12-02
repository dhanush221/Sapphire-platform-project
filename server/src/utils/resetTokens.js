import { prisma } from '../prisma.js';

export async function saveResetToken({ userId, tokenHash, expiresAt }) {
  // Remove existing tokens for this user, then create the new one
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      createdAt: new Date()
    }
  });
}

export async function consumeResetToken(tokenHash) {
  const now = new Date();
  const token = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now }
    }
  });
  if (!token) return null;
  await prisma.passwordResetToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() }
  });
  return token;
}
