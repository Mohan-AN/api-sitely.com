import { and, eq, gt, isNull } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/client';
import { passwordResetTokens, refreshTokens, users } from '../db/schema';
import { successResponse } from '../types/common.types';
import {
  EMAIL_NOT_FOUND,
  INVALID_CREDENTIALS,
  INVALID_OR_EXPIRED_REFRESH_TOKEN,
  INVALID_OR_EXPIRED_RESET_TOKEN,
  INVALID_REFRESH_TOKEN,
  LOGOUT_SUCCESSFUL,
  PASSWORD_RESET_REQUESTED,
  PASSWORD_RESET_SUCCESSFUL,
  PASSWORD_UPDATED_SUCCESSFULLY,
  USER_NOT_FOUND,
} from '../constants/app-messages';
import { NotFoundException, UnauthorizedException } from '../exceptions/http-exceptions';

const RESET_TOKEN_TTL_MINUTES = 30;
const DEFAULT_RESET_OTP = '1234';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function getResetOtp(): string {
  return DEFAULT_RESET_OTP;
}

function getOtpHashInput(email: string, otp: string): string {
  return `${normalizeEmail(email)}:${otp}`;
}

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

export async function forgotPasswordHandler(c: any) {
  const { email } = c.req.valid('json');
  const normalizedEmail = normalizeEmail(email);
  const db = getDb(c.env.DB_URL);

  const rows = await db.select().from(users).where(eq(users.email, normalizedEmail));
  const user = rows[0];

  if (!user || !user.isActive) {
    throw new NotFoundException(EMAIL_NOT_FOUND);
  }

  const otp = getResetOtp();
  const tokenHash = await sha256Hex(getOtpHashInput(normalizedEmail, otp));
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.userId));
  await db.insert(passwordResetTokens).values({
    userId: user.userId,
    tokenHash,
    expiresAt,
  });

  const response: { message: string; otp?: string } = { message: PASSWORD_RESET_REQUESTED };
  if (c.env.ENVIRONMENT !== 'production') {
    response.otp = otp;
  }

  return c.json(successResponse(response));
}

export async function resetPasswordHandler(c: any) {
  const { email, otp, newPassword } = c.req.valid('json');
  const normalizedEmail = normalizeEmail(email);
  const db = getDb(c.env.DB_URL);

  const userRows = await db.select().from(users).where(eq(users.email, normalizedEmail));
  const user = userRows[0];
  if (!user || !user.isActive) {
    throw new UnauthorizedException(INVALID_OR_EXPIRED_RESET_TOKEN);
  }

  const tokenHash = await sha256Hex(getOtpHashInput(normalizedEmail, otp));

  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.userId, user.userId),
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    );

  const resetToken = rows[0];
  if (!resetToken) {
    throw new UnauthorizedException(INVALID_OR_EXPIRED_RESET_TOKEN);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db.update(users).set({ passwordHash }).where(eq(users.userId, user.userId));
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.tokenId, resetToken.tokenId));
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.userId));

  return c.json(successResponse({ message: PASSWORD_RESET_SUCCESSFUL }));
}

export async function updatePasswordHandler(c: any) {
  const { currentPassword, newPassword } = c.req.valid('json');
  const db = getDb(c.env.DB_URL);
  const userId = c.get('userId');

  const rows = await db.select().from(users).where(eq(users.userId, userId));
  const user = rows[0];
  if (!user || !user.isActive) throw new UnauthorizedException(USER_NOT_FOUND);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedException(INVALID_CREDENTIALS);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.userId, userId));
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));

  return c.json(successResponse({ message: PASSWORD_UPDATED_SUCCESSFULLY }));
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
