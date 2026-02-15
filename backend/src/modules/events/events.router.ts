import { Hono } from 'hono';
import { eventsService } from './events.service.js';

export const eventsRouter = new Hono()
  .post('/', async (c) => {
    // TODO: Implement create event
    return c.json({ message: 'Create event - not implemented' }, 501);
  })
  .patch('/:id', async (c) => {
    // TODO: Implement modify event
    const id = c.req.param('id');
    return c.json({ message: `Modify event ${id} - not implemented` }, 501);
  });
