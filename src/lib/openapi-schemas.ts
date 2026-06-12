import { z } from '@hono/zod-openapi';

export const bearerAuth: Record<string, string[]> = { bearerAuth: [] };

export const zSuccessResponse = (dataSchema: z.ZodTypeAny) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export const zErrorResponse = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const zPagination = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const zPaginatedResponse = (itemSchema: z.ZodTypeAny) =>
  zSuccessResponse(
    z.object({
      items: z.array(itemSchema),
      pagination: zPagination,
    }),
  );

export const commonErrorResponses = {
  401: {
    description: 'Unauthorized',
    content: { 'application/json': { schema: zErrorResponse } },
  },
  404: {
    description: 'Not found',
    content: { 'application/json': { schema: zErrorResponse } },
  },
  409: {
    description: 'Conflict',
    content: { 'application/json': { schema: zErrorResponse } },
  },
  422: {
    description: 'Validation error',
    content: { 'application/json': { schema: zErrorResponse } },
  },
  500: {
    description: 'Internal server error',
    content: { 'application/json': { schema: zErrorResponse } },
  },
} as const;
