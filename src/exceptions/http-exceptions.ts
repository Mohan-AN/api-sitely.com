import {
  BAD_REQUEST,
  CONFLICT,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  UNAUTHORIZED,
  UNPROCESSABLE_ENTITY,
} from '../constants/http-status-codes';
import BaseException from './base-exception';

export class BadRequestException extends BaseException {
  constructor(message = 'Bad request', details?: unknown) {
    super(BAD_REQUEST, 'BAD_REQUEST', message, details);
  }
}

export class UnauthorizedException extends BaseException {
  constructor(message = 'Unauthorized', details?: unknown) {
    super(UNAUTHORIZED, 'UNAUTHORIZED', message, details);
  }
}

export class ForbiddenException extends BaseException {
  constructor(message = 'Forbidden', details?: unknown) {
    super(FORBIDDEN, 'FORBIDDEN', message, details);
  }
}

export class NotFoundException extends BaseException {
  constructor(message = 'Not found', details?: unknown) {
    super(NOT_FOUND, 'NOT_FOUND', message, details);
  }
}

export class ConflictException extends BaseException {
  constructor(message = 'Conflict', details?: unknown) {
    super(CONFLICT, 'CONFLICT', message, details);
  }
}

export class UnprocessableEntityException extends BaseException {
  constructor(message = 'Validation failed', details?: unknown) {
    super(UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR', message, details);
  }
}

export class InternalServerErrorException extends BaseException {
  constructor(message = 'Internal server error', details?: unknown) {
    super(INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR', message, details);
  }
}
