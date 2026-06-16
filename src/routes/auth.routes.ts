import { createRoute, z } from '@hono/zod-openapi';
import { createApp } from '../factory';
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  resetPasswordSchema,
  updatePasswordSchema,
} from '../validations/auth.validation';
import { authMiddleware } from '../middleware/auth.middleware';
import { bearerAuth, commonErrorResponses, zSuccessResponse } from '../lib/openapi-schemas';
import {
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  resetPasswordHandler,
  updatePasswordHandler,
} from '../handlers/auth.handlers';

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

const zMessage = z.object({
  message: z.string(),
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
    method: 'post',
    path: '/forgot-password',
    tags: ['Auth'],
    summary: 'Request password reset',
    description: 'Generates a short-lived 4 digit password reset OTP. In non-production environments, the OTP is returned for testing.',
    request: {
      body: { required: true, content: { 'application/json': { schema: forgotPasswordSchema } } },
    },
    responses: {
      200: {
        description: 'Password reset requested',
        content: { 'application/json': { schema: zSuccessResponse(zMessage.extend({ otp: z.string().optional() })) } },
      },
      404: commonErrorResponses[404],
      422: commonErrorResponses[422],
    },
  }),
  forgotPasswordHandler,
);

(auth as any).openapi(
  createRoute({
    method: 'post',
    path: '/reset-password',
    tags: ['Auth'],
    summary: 'Reset password',
    request: {
      body: { required: true, content: { 'application/json': { schema: resetPasswordSchema } } },
    },
    responses: {
      200: {
        description: 'Password reset successful',
        content: { 'application/json': { schema: zSuccessResponse(zMessage) } },
      },
      401: commonErrorResponses[401],
      422: commonErrorResponses[422],
    },
  }),
  resetPasswordHandler,
);

(auth as any).openapi(
  createRoute({
    method: 'put',
    path: '/password',
    tags: ['Auth'],
    summary: 'Update password',
    middleware: [authMiddleware] as const,
    security: [bearerAuth],
    request: {
      body: { required: true, content: { 'application/json': { schema: updatePasswordSchema } } },
    },
    responses: {
      200: {
        description: 'Password updated',
        content: { 'application/json': { schema: zSuccessResponse(zMessage) } },
      },
      401: commonErrorResponses[401],
      422: commonErrorResponses[422],
    },
  }),
  updatePasswordHandler,
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
