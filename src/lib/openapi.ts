import { OpenAPIHono } from '@hono/zod-openapi';

export function createOpenAPIApp() {
  return new OpenAPIHono();
}

export const openAPIConfig = {
  openapi: '3.1.0',
  info: {
    title: 'WBMS API',
    version: '1.0.0',
    description: 'Website Business Management System — Phase 1',
  },
  servers: [
    { url: 'http://localhost:8787', description: 'Local' },
    { url: 'https://wbms-api-staging.workers.dev', description: 'Staging' },
    { url: 'https://wbms-api-prod.workers.dev', description: 'Production' },
  ],
};
