import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');
const REQUEST_ID_PATTERN = /^[\w-]{1,64}$/;

/**
 * Tags each request with an X-Request-Id (reusing a well-formed incoming one) and logs one line
 * per response. Query strings are omitted so tokens and filters never reach the logs.
 */
export function requestLogger(request: Request, response: Response, next: NextFunction): void {
  const incoming = request.header('x-request-id');
  const requestId = incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
  const startedAt = process.hrtime.bigint();
  response.setHeader('X-Request-Id', requestId);

  response.on('finish', () => {
    if (request.path === '/health') return;
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const line = `${request.method} ${request.path} ${response.statusCode} ${durationMs.toFixed(1)}ms id=${requestId}`;
    if (response.statusCode >= 500) logger.error(line);
    else if (response.statusCode >= 400) logger.warn(line);
    else logger.log(line);
  });
  next();
}
