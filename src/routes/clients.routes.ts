import { createRoute, z } from '@hono/zod-openapi';
import { createApp } from '../factory';
import { authMiddleware } from '../middleware/auth.middleware';
import { createClientSchema, updateClientSchema, clientListQuerySchema } from '../validations/clients.validation';
import { bearerAuth, commonErrorResponses, zPaginatedResponse, zSuccessResponse } from '../lib/openapi-schemas';
import { createClientHandler, getClientHandler, listClientsHandler, updateClientHandler } from '../handlers/clients.handlers';

const clientsRouter = createApp();

const zClient = z.object({
  clientId: z.string(),
  name: z.string(),
  company: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  city: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const zClientWithCount = zClient.extend({
  websiteCount: z.number(),
});

const zClientDetail = zClient.extend({
  websites: z.array(z.object({
    websiteId: z.string(),
    projectName: z.string(),
    url: z.string().nullable(),
    websiteStatus: z.string(),
    maintenanceStatus: z.string(),
  })),
});

(clientsRouter as any).openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Clients'],
    summary: 'List clients',
    middleware: [authMiddleware] as const,
    security: [bearerAuth],
    request: { query: clientListQuerySchema },
    responses: {
      200: { description: 'Client list', content: { 'application/json': { schema: zPaginatedResponse(zClientWithCount) } } },
      401: commonErrorResponses[401],
      422: commonErrorResponses[422],
    },
  }),
  listClientsHandler,
);

(clientsRouter as any).openapi(
  createRoute({
    method: 'post',
    path: '/',
    tags: ['Clients'],
    summary: 'Create client',
    middleware: [authMiddleware] as const,
    security: [bearerAuth],
    request: { body: { required: true, content: { 'application/json': { schema: createClientSchema } } } },
    responses: {
      201: { description: 'Created', content: { 'application/json': { schema: zSuccessResponse(zClient) } } },
      401: commonErrorResponses[401],
      422: commonErrorResponses[422],
    },
  }),
  createClientHandler,
);

(clientsRouter as any).openapi(
  createRoute({
    method: 'get',
    path: '/:id',
    tags: ['Clients'],
    summary: 'Get client',
    middleware: [authMiddleware] as const,
    security: [bearerAuth],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: { description: 'Client detail', content: { 'application/json': { schema: zSuccessResponse(zClientDetail) } } },
      401: commonErrorResponses[401],
      404: commonErrorResponses[404],
    },
  }),
  getClientHandler,
);

(clientsRouter as any).openapi(
  createRoute({
    method: 'put',
    path: '/:id',
    tags: ['Clients'],
    summary: 'Update client',
    middleware: [authMiddleware] as const,
    security: [bearerAuth],
    request: {
      params: z.object({ id: z.string() }),
      body: { required: true, content: { 'application/json': { schema: updateClientSchema } } },
    },
    responses: {
      200: { description: 'Updated', content: { 'application/json': { schema: zSuccessResponse(zClient) } } },
      401: commonErrorResponses[401],
      404: commonErrorResponses[404],
      422: commonErrorResponses[422],
    },
  }),
  updateClientHandler,
);

export default clientsRouter;
