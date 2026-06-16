import app from './app';
import type { AppBindings } from './types/app.types';

function stripApiVersion(request: Request, version: string) {
  const url = new URL(request.url);
  const normalizedVersion = version.replace(/^\/+|\/+$/g, '');
  const prefix = `/${normalizedVersion}`;

  if (url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)) {
    url.pathname = url.pathname.slice(prefix.length) || '/';
    return new Request(url.toString(), request);
  }

  return null;
}

export default {
  fetch(request: Request, env: AppBindings['Bindings'], ctx: ExecutionContext) {
    const versionedRequest = stripApiVersion(request, env.API_VERSION);
    if (!versionedRequest) {
      return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return app.fetch(versionedRequest, env, ctx);
  },
};
