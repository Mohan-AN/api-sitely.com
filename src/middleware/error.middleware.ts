import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { logger } from '../lib/logger';
import { errorResponse } from '../types/common.types';
import BaseException from '../exceptions/base-exception';
import { INTERNAL_ERROR } from '../constants/app-messages';

export async function errorMiddleware(err: Error, c: Context) {
  if (err instanceof BaseException) {
    return c.json(
      {
        ...errorResponse(err.code, err.message),
        ...(err.details ? { details: err.details } : {}),
      },
      err.status as ContentfulStatusCode,
    );
  }

  if (err instanceof HTTPException) {
    return c.json(errorResponse('HTTP_ERROR', err.message), err.status);
  }

  logger.error({ err: err.message, stack: err.stack }, 'Unhandled error');
  return c.json(errorResponse('INTERNAL_ERROR', INTERNAL_ERROR), 500);
}
