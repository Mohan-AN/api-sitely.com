import type { StatusCode } from 'hono/utils/http-status';

export default class BaseException extends Error {
  status: StatusCode;
  code: string;
  details: unknown;

  constructor(status: StatusCode, code: string, message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
