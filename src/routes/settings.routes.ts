import { createRoute, z } from '@hono/zod-openapi';
import { createApp } from '../factory';
import { authMiddleware } from '../middleware/auth.middleware';
import { updateSettingSchema } from '../validations/settings.validation';
import { bearerAuth, commonErrorResponses, zSuccessResponse } from '../lib/openapi-schemas';
import { getSettingsHandler, updateSettingHandler } from '../handlers/settings.handlers';

const settingsRouter = createApp();

(settingsRouter as any).openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Settings'],
    summary: 'Get all settings',
    middleware: [authMiddleware] as const,
    security: [bearerAuth],
    responses: {
      200: { description: 'Settings', content: { 'application/json': { schema: zSuccessResponse(z.record(z.string())) } } },
      401: commonErrorResponses[401],
    },
  }),
  getSettingsHandler,
);

(settingsRouter as any).openapi(
  createRoute({
    method: 'put',
    path: '/:key',
    tags: ['Settings'],
    summary: 'Update setting',
    middleware: [authMiddleware] as const,
    security: [bearerAuth],
    request: {
      params: z.object({ key: z.string() }),
      body: { required: true, content: { 'application/json': { schema: updateSettingSchema } } },
    },
    responses: {
      200: {
        description: 'Updated',
        content: { 'application/json': { schema: zSuccessResponse(z.object({ key: z.string(), value: z.string() })) } },
      },
      401: commonErrorResponses[401],
      404: commonErrorResponses[404],
      422: commonErrorResponses[422],
    },
  }),
  updateSettingHandler,
);

export default settingsRouter;
