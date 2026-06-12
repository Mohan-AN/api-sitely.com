import { cors } from 'hono/cors';
import { apiReference } from '@scalar/hono-api-reference';
import { createApp } from './factory';
import { errorMiddleware } from './middleware/error.middleware';
import authRouter from './routes/auth.routes';
import clientsRouter from './routes/clients.routes';
import websitesRouter from './routes/websites.routes';
import dashboardRouter from './routes/dashboard.routes';
import settingsRouter from './routes/settings.routes';

const app = createApp();

app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
  }),
);

app.get('/health', (c) => c.json({ status: 'ok', env: c.env.ENVIRONMENT }));

app.route('/auth', authRouter);
app.route('/clients', clientsRouter);
app.route('/websites', websitesRouter);
app.route('/dashboard', dashboardRouter);
app.route('/settings', settingsRouter);

app.doc('/json', (c) => {
  const version = c.env.API_VERSION ;

  return {
    openapi: '3.1.0',
    info: {
      title: 'WBMS API',
      version: '1.0.0',
      description: 'Website Business Management System - Phase 1',
    },
    servers: [
      { url: `http://localhost:8787/${version}`, description: 'Local' },
      { url: `https://wbms-api-staging.workers.dev/${version}`, description: 'Staging' },
      { url: `https://wbms-api-prod.workers.dev/${version}`, description: 'Production' },
    ],
  };
});

app.get(
  '/docs',
  apiReference({
    theme: 'default',
    spec: { url: './json' },
  }),
);

app.onError(errorMiddleware);

export default app;
