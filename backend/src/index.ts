import { Hono } from 'hono';
import { config } from './lib/config.js';
import { authRouter } from './modules/auth/auth.router.js';
import { placesRouter } from './modules/places/places.router.js';

const app = new Hono();

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.route('/api/auth', authRouter);
app.route('/api/places', placesRouter);

const port = config.PORT;

console.log(`Fora backend starting on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
