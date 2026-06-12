import { createRoute, z } from '@hono/zod-openapi';
import { createApp } from '../factory';
import { loginSchema, logoutSchema, refreshSchema } from '../validations/auth.validation';
import { authMiddleware } from '../middleware/auth.middleware';
import { bearerAuth, commonErrorResponses, zSuccessResponse } from '../lib/openapi-schemas';
import { loginHandler, logoutHandler, meHandler, refreshHandler } from '../handlers/auth.handlers';

const auth = createApp();

const zUser = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  isActive: z.boolean(),
});

const zTokens = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

(auth as any).openapi(
  createRoute({
    method: 'post',
    path: '/login',
    tags: ['Auth'],
    summary: 'Login',
    request: {
      body: { required: true, content: { 'application/json': { schema: loginSchema } } },
    },
    responses: {
      200: {
        description: 'Login successful',
        content: { 'application/json': { schema: zSuccessResponse(zTokens.extend({ user: zUser })) } },
      },
      401: commonErrorResponses[401],
      422: commonErrorResponses[422],
    },
  }),
  loginHandler,
);

(auth as any).openapi(
  createRoute({
    method: 'get',
    path: '/me',
    tags: ['Auth'],
    summary: 'Get current user',
    middleware: [authMiddleware] as const,
    security: [bearerAuth],
    responses: {
      200: { description: 'Current user', content: { 'application/json': { schema: zSuccessResponse(zUser) } } },
      401: commonErrorResponses[401],
    },
  }),
  meHandler,
);

(auth as any).openapi(
  createRoute({
    method: 'post',
    path: '/refresh',
    tags: ['Auth'],
    summary: 'Refresh access token',
    description: 'Validates the refresh token and returns a new access token with the same refresh token.',
    request: {
      body: { required: true, content: { 'application/json': { schema: refreshSchema } } },
    },
    responses: {
      200: { description: 'New token pair', content: { 'application/json': { schema: zSuccessResponse(zTokens) } } },
      401: commonErrorResponses[401],
      422: commonErrorResponses[422],
    },
  }),
  refreshHandler,
);

(auth as any).openapi(
  createRoute({
    method: 'post',
    path: '/logout',
    tags: ['Auth'],
    summary: 'Logout',
    description: 'Revokes the submitted refresh token.',
    request: {
      body: { required: true, content: { 'application/json': { schema: logoutSchema } } },
    },
    responses: {
      200: {
        description: 'Logout successful',
        content: { 'application/json': { schema: zSuccessResponse(z.object({ message: z.string() })) } },
      },
      422: commonErrorResponses[422],
    },
  }),
  logoutHandler,
);

export default auth;
