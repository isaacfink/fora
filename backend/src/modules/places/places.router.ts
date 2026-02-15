import { Hono } from 'hono';
import { z } from 'zod';
import { placesService } from './places.service.js';
import {
  createPlaceSchema,
  updatePlaceSchema,
  searchSchema,
} from './places.validators.js';

export const placesRouter = new Hono()
  .get('/', async (c) => {
    const limit = Number(c.req.query('limit')) || 50;
    const offset = Number(c.req.query('offset')) || 0;

    const places = await placesService.getAll({ limit, offset });
    return c.json({ data: places, count: places.length });
  })
  .post('/', async (c) => {
    try {
      const body = await c.req.json();
      const validated = createPlaceSchema.parse(body);

      const place = await placesService.create(validated);
      return c.json({ data: place }, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation error', details: error.issues }, 400);
      }
      return c.json({ error: 'Failed to create place' }, 500);
    }
  })
  .post('/search', async (c) => {
    try {
      const body = await c.req.json();
      const validated = searchSchema.parse(body);

      const places = await placesService.search(validated);
      return c.json({ data: places, count: places.length });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation error', details: error.issues }, 400);
      }
      return c.json({ error: 'Search failed' }, 500);
    }
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'));

    if (isNaN(id)) {
      return c.json({ error: 'Invalid ID' }, 400);
    }

    const place = await placesService.getById(id);

    if (!place) {
      return c.json({ error: 'Place not found' }, 404);
    }

    return c.json({ data: place });
  })
  .patch('/:id', async (c) => {
    try {
      const id = Number(c.req.param('id'));

      if (isNaN(id)) {
        return c.json({ error: 'Invalid ID' }, 400);
      }

      const body = await c.req.json();
      const validated = updatePlaceSchema.parse(body);

      const place = await placesService.update(id, validated);

      if (!place) {
        return c.json({ error: 'Place not found' }, 404);
      }

      return c.json({ data: place });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation error', details: error.issues }, 400);
      }
      return c.json({ error: 'Failed to update place' }, 500);
    }
  })
  .delete('/:id', async (c) => {
    const id = Number(c.req.param('id'));

    if (isNaN(id)) {
      return c.json({ error: 'Invalid ID' }, 400);
    }

    const place = await placesService.delete(id);

    if (!place) {
      return c.json({ error: 'Place not found' }, 404);
    }

    return c.json({ data: place });
  });
