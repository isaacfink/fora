import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from './config.js';
import * as placesSchema from '../modules/places/schemas/places.schema.js';
import * as eventsSchema from '../modules/events/schemas/events.schema.js';
import * as syncPlacesSchema from '../modules/sync-places/schemas/index.js';

const client = postgres(config.DATABASE_URL);

export const db = drizzle(client, {
  schema: {
    ...placesSchema,
    ...eventsSchema,
    ...syncPlacesSchema,
  },
});
