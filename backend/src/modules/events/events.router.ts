import { Hono } from 'hono';
import { eventsService } from './events.service.js';

export const eventsRouter = new Hono()
  .post('/', async (c) => {
    // TODO: Implement create event
    // 
    // After creating the event in the database, initialize place syncing:
    // const result = await eventsService.initializeEventPlaceFetching(
    //   event.id,
    //   { lat: event.centerLat, lng: event.centerLng },
    //   event.radiusM
    // );
    // 
    // This will:
    // 1. Compute H3 cells covering the event area
    // 2. Insert cells into grid_cells table
    // 3. Link event to cells in event_cells table
    // 4. Enqueue BullMQ jobs to fetch places from Google for stale cells
    // 5. Worker will process jobs and populate places table
    //
    // The worker runs automatically in the background.
    
    return c.json({ message: 'Create event - not implemented' }, 501);
  })
  .patch('/:id', async (c) => {
    // TODO: Implement modify event
    const id = c.req.param('id');
    return c.json({ message: `Modify event ${id} - not implemented` }, 501);
  });
