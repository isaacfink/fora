import pino from 'pino';
import { config } from './config.js';
import type { Context, Next } from 'hono';
import { v4 as uuidv4 } from 'uuid';

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
    logger: pino.Logger;
  }
}

export const logger = pino({
  level: config.NODE_ENV === 'development' ? 'debug' : 'info',
  transport:
    config.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export const loggerMiddleware = async (c: Context, next: Next) => {
  const requestId = uuidv4();
  const start = Date.now();

  c.set('requestId', requestId);
  c.set('logger', logger.child({ requestId }));

  const requestLogger = c.get('logger');

  requestLogger.info({
    type: 'request',
    method: c.req.method,
    path: c.req.path,
    url: c.req.url,
  });

  await next();

  const duration = Date.now() - start;

  requestLogger.info({
    type: 'response',
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
  });
};
