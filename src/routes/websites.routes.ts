import { createRoute, z } from '@hono/zod-openapi';
import { createApp } from '../factory';
import { authMiddleware } from '../middleware/auth.middleware';
import { createWebsiteSchema, updateWebsiteSchema, websiteListQuerySchema } from '../validations/websites.validation';
import { bearerAuth, commonErrorResponses, zPaginatedResponse, zSuccessResponse } from '../lib/openapi-schemas';
import {
  createWebsiteHandler,
  getWebsiteHandler,
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
  serviceType: z.string(),
  websiteStatus: z.string(),
  maintenanceStatus: z.string(),
  startDate: z.string().nullable(),
  hostedDate: z.string().nullable(),
  lastInvoiceSent: z.string().nullable(),
  lastPaymentReceived: z.string().nullable(),
  renewalDate: z.string().nullable(),
  handoverDate: z.string().nullable(),
  transferCompleted: z.boolean(),
  serviceTypeChangedAt: z.string().nullable().optional(),
  remarks: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

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
      200: { description: 'Website detail', content: { 'application/json': { schema: zSuccessResponse(zWebsite) } } },
      401: commonErrorResponses[401],
      404: commonErrorResponses[404],
    },
  }),
  getWebsiteHandler,
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
