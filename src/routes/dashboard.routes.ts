import { createRoute, z } from '@hono/zod-openapi';
import { createApp } from '../factory';
import { authMiddleware } from '../middleware/auth.middleware';
import { bearerAuth, commonErrorResponses, zSuccessResponse } from '../lib/openapi-schemas';
import { getDashboardHandler } from '../handlers/dashboard.handlers';

const dashboardRouter = createApp();

(dashboardRouter as any).openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Dashboard'],
    summary: 'Dashboard data',
    middleware: [authMiddleware] as const,
    security: [bearerAuth],
    responses: {
      200: { description: 'Full dashboard', content: { 'application/json': { schema: zSuccessResponse(z.any()) } } },
      401: commonErrorResponses[401],
    },
  }),
  getDashboardHandler,
);

export default dashboardRouter;
