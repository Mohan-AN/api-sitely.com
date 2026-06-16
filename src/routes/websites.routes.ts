import { createRoute, z } from '@hono/zod-openapi';
import { createApp } from '../factory';
import { authMiddleware } from '../middleware/auth.middleware';
import { createWebsiteSchema, updateWebsiteSchema, websiteListQuerySchema } from '../validations/websites.validation';
import { bearerAuth, commonErrorResponses, zPaginatedResponse, zSuccessResponse } from '../lib/openapi-schemas';
import {
  createWebsiteHandler,
  getWebsiteActivityHandler,
  getWebsiteHandler,
  getWebsiteStatsHandler,
  listWebsitesHandler,
  updateWebsiteHandler,
} from '../handlers/websites.handlers';

const websitesRouter = createApp();

const zWebsite = z.object({
  websiteId: z.string(),
  clientId: z.string(),
  projectName: z.string(),
  url: z.string().nullable(),
  siteType: z.string(),
  platform: z.string(),
  websiteStatus: z.string(),
  maintenanceStatus: z.string(),
  startDate: z.string().nullable(),
  hostedDate: z.string().nullable(),
  lastInvoiceSent: z.string().nullable(),
  lastPaymentReceived: z.string().nullable(),
  renewalDate: z.string().nullable(),
  remarks: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  clientName: z.string().optional(),
  isOverdue: z.boolean().optional(),
});

(websitesRouter as any).openapi(
  createRoute({
    method: 'get',
    path: '/stats',
    tags: ['Websites'],
    summary: 'Website stats',
    middleware: [authMiddleware] as const,
    security: [bearerAuth],
    responses: {
      200: {
        description: 'Website stats',
        content: {
          'application/json': {
            schema: zSuccessResponse(z.object({
              websites: z.number(),
              clients: z.number(),
              live: z.number(),
              expired: z.number(),
              dueSoon: z.number(),
            })),
          },
        },
      },
      401: commonErrorResponses[401],
    },
  }),
  getWebsiteStatsHandler,
);

(websitesRouter as any).openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Websites'],
    summary: 'List websites',
    middleware: [authMiddleware] as const,
    security: [bearerAuth],
    request: { query: websiteListQuerySchema },
    responses: {
      200: { description: 'Website list', content: { 'application/json': { schema: zPaginatedResponse(zWebsite) } } },
      401: commonErrorResponses[401],
      422: commonErrorResponses[422],
    },
  }),
  listWebsitesHandler,
);

(websitesRouter as any).openapi(
  createRoute({
    method: 'post',
    path: '/',
    tags: ['Websites'],
    summary: 'Create website',
    middleware: [authMiddleware] as const,
    security: [bearerAuth],
    request: { body: { required: true, content: { 'application/json': { schema: createWebsiteSchema } } } },
    responses: {
      201: { description: 'Created', content: { 'application/json': { schema: zSuccessResponse(zWebsite) } } },
      401: commonErrorResponses[401],
      404: commonErrorResponses[404],
      422: commonErrorResponses[422],
    },
  }),
  createWebsiteHandler,
);

const zWebsiteDetail = zWebsite.extend({
  clientName: z.string(),
  isOverdue: z.boolean(),
  allowedActions: z.array(z.string()),
});

(websitesRouter as any).openapi(
  createRoute({
    method: 'get',
    path: '/:id',
    tags: ['Websites'],
    summary: 'Get website',
    middleware: [authMiddleware] as const,
    security: [bearerAuth],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: { description: 'Website detail', content: { 'application/json': { schema: zSuccessResponse(zWebsiteDetail) } } },
      401: commonErrorResponses[401],
      404: commonErrorResponses[404],
    },
  }),
  getWebsiteHandler,
);

(websitesRouter as any).openapi(
  createRoute({
    method: 'get',
    path: '/:id/activity',
    tags: ['Websites'],
    summary: 'Get website activity',
    middleware: [authMiddleware] as const,
    security: [bearerAuth],
    request: {
      params: z.object({ id: z.string() }),
      query: z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
      }),
    },
    responses: {
      200: {
        description: 'Website activity',
        content: {
          'application/json': {
            schema: zPaginatedResponse(z.object({
              logId: z.string(),
              action: z.string(),
              description: z.string(),
              oldValue: z.unknown().nullable(),
              newValue: z.unknown().nullable(),
              createdAt: z.string(),
              userName: z.string(),
            })),
          },
        },
      },
      401: commonErrorResponses[401],
      404: commonErrorResponses[404],
      422: commonErrorResponses[422],
    },
  }),
  getWebsiteActivityHandler,
);

(websitesRouter as any).openapi(
  createRoute({
    method: 'put',
    path: '/:id',
    tags: ['Websites'],
    summary: 'Update website',
    middleware: [authMiddleware] as const,
    security: [bearerAuth],
    request: {
      params: z.object({ id: z.string() }),
      body: { required: true, content: { 'application/json': { schema: updateWebsiteSchema } } },
    },
    responses: {
      200: { description: 'Updated', content: { 'application/json': { schema: zSuccessResponse(zWebsite) } } },
      401: commonErrorResponses[401],
      404: commonErrorResponses[404],
      409: commonErrorResponses[409],
      422: commonErrorResponses[422],
    },
  }),
  updateWebsiteHandler,
);

export default websitesRouter;
