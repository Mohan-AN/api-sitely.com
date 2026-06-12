import { OpenAPIHono } from '@hono/zod-openapi';
import { errorResponse } from './types/common.types';
import type { AppBindings } from './types/app.types';

export function createApp() {
  return new OpenAPIHono<AppBindings>({
    defaultHook: (result, c) => {
      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.length ? String(issue.path.at(-1)) : '_root';
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }

        return c.json(
          {
            ...errorResponse('VALIDATION_ERROR', 'Validation failed'),
            errors,
          },
          422,
        );
      }
    },
  });
}
