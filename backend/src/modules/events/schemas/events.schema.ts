import { pgTable, varchar, text, timestamp, uuid, integer, doublePrecision } from 'drizzle-orm/pg-core';

export const events = pgTable('events', (t) => ({
  id: t.uuid('id').primaryKey().defaultRandom(),
  name: t.varchar('name', { length: 255 }).notNull(),
  description: t.text('description'),
  creatorId: t.varchar('creator_id', { length: 255 }).notNull(),
  centerLat: t.doublePrecision('center_lat').notNull(), // Event center latitude
  centerLng: t.doublePrecision('center_lng').notNull(), // Event center longitude
  radiusM: t.integer('radius_m').notNull(), // Search radius in meters
  startDate: t.timestamp('start_date').notNull(),
  endDate: t.timestamp('end_date'),
  maxParticipants: t.integer('max_participants'),
  createdAt: t.timestamp('created_at').defaultNow().notNull(),
  updatedAt: t.timestamp('updated_at').defaultNow().notNull(),
}));

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
