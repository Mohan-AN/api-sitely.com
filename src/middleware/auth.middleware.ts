import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import { errorResponse } from '../types/common.types';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(errorResponse('UNAUTHORIZED', 'Missing or invalid authorization header'), 401);
  }

  const token = authHeader.slice(7);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const secret = (c.env as any)?.JWT_ACCESS_SECRET as string | undefined;

  if (!secret) {
    return c.json(errorResponse('INTERNAL_ERROR', 'Auth not configured'), 500);
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    c.set('userId', payload['userId'] as string);
    c.set('userRole', payload['role'] as string);
    c.set('userName', payload['name'] as string);
    await next();
  } catch {
    return c.json(errorResponse('UNAUTHORIZED', 'Invalid or expired token'), 401);
  }
}
