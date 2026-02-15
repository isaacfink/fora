import { Hono } from 'hono';
import { auth } from './auth.service.js';

export const authRouter = new Hono();

authRouter.on(['GET', 'POST'], '/*', (c) => {
  return auth.handler(c.req.raw);
});
