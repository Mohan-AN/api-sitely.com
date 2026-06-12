import { eq } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/client';
import { refreshTokens, users } from '../db/schema';
import { successResponse } from '../types/common.types';
import {
  INVALID_CREDENTIALS,
  INVALID_OR_EXPIRED_REFRESH_TOKEN,
  INVALID_REFRESH_TOKEN,
  LOGOUT_SUCCESSFUL,
  USER_NOT_FOUND,
} from '../constants/app-messages';
import { UnauthorizedException } from '../exceptions/http-exceptions';

export async function loginHandler(c: any) {
  const { email, password } = c.req.valid('json');
  const db = getDb(c.env.DB_URL);

  const rows = await db.select().from(users).where(eq(users.email, email));
  const user = rows[0];

  if (!user || !user.isActive) {
    throw new UnauthorizedException(INVALID_CREDENTIALS);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedException(INVALID_CREDENTIALS);
  }

  const payload = { userId: user.userId, email: user.email, name: user.name, role: user.role };
  const accessSecret = new TextEncoder().encode(c.env.JWT_ACCESS_SECRET);
  const refreshSecret = new TextEncoder().encode(c.env.JWT_REFRESH_SECRET);

  const accessToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(accessSecret);

  const refreshToken = await new SignJWT({ userId: user.userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .setExpirationTime('7d')
    .sign(refreshSecret);

  const { payload: refreshPayload } = await jwtVerify(refreshToken, refreshSecret);
  const refreshExpiresAt = new Date((refreshPayload['exp'] as number) * 1000);

  await db.insert(refreshTokens).values({
    userId: user.userId,
    refreshToken,
    expiresAt: refreshExpiresAt,
  });

  return c.json(
    successResponse({
      accessToken,
      refreshToken,
      user: { userId: user.userId, name: user.name, email: user.email, role: user.role, isActive: user.isActive },
    }),
    200,
  );
}

export async function meHandler(c: any) {
  const db = getDb(c.env.DB_URL);
  const userId = c.get('userId');

  const rows = await db.select().from(users).where(eq(users.userId, userId));
  const user = rows[0];
  if (!user) throw new UnauthorizedException(USER_NOT_FOUND);

  return c.json(
    successResponse({ userId: user.userId, name: user.name, email: user.email, role: user.role, isActive: user.isActive }),
  );
}

export async function refreshHandler(c: any) {
  const { refreshToken } = c.req.valid('json');
  const db = getDb(c.env.DB_URL);
  const refreshSecret = new TextEncoder().encode(c.env.JWT_REFRESH_SECRET);

  try {
    const { payload } = await jwtVerify(refreshToken, refreshSecret);
    const userId = payload['userId'] as string;

    const tokenRows = await db.select().from(refreshTokens).where(eq(refreshTokens.refreshToken, refreshToken));
    const tokenRecord = tokenRows[0];
    if (!tokenRecord || tokenRecord.userId !== userId || tokenRecord.expiresAt <= new Date()) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    const rows = await db.select().from(users).where(eq(users.userId, userId));
    const user = rows[0];
    if (!user || !user.isActive) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    const accessSecret = new TextEncoder().encode(c.env.JWT_ACCESS_SECRET);
    const tokenPayload = { userId: user.userId, email: user.email, name: user.name, role: user.role };

    const newAccessToken = await new SignJWT(tokenPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('15m')
      .sign(accessSecret);

    return c.json(successResponse({ accessToken: newAccessToken, refreshToken }));
  } catch (err) {
    if (err instanceof UnauthorizedException) throw err;
    throw new UnauthorizedException(INVALID_OR_EXPIRED_REFRESH_TOKEN);
  }
}

export async function logoutHandler(c: any) {
  const { refreshToken } = c.req.valid('json');
  const db = getDb(c.env.DB_URL);

  await db.delete(refreshTokens).where(eq(refreshTokens.refreshToken, refreshToken));

  return c.json(successResponse({ message: LOGOUT_SUCCESSFUL }));
}
