import { pgTable, text, varchar, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const places = pgTable('places', (t) => ({
  id: t.serial('id').primaryKey(),
  googlePlaceId: t.varchar('google_place_id', { length: 255 }).notNull().unique(),
  name: t.varchar('name', { length: 500 }).notNull(),
  description: t.text('description'),
  address: t.text('address'),
  latitude: t.numeric('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: t.numeric('longitude', { precision: 10, scale: 7 }).notNull(),
  categories: t.jsonb('categories').$type<string[]>().default([]),
  rating: t.numeric('rating', { precision: 3, scale: 2 }),
  reviewCount: t.integer('review_count').default(0),
  priceLevel: t.integer('price_level'),
  photos: t.jsonb('photos').$type<{ reference: string; url?: string }[]>().default([]),
  openingHours: t.jsonb('opening_hours').$type<{
    weekdayText?: string[];
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  }>(),
  phoneNumber: t.varchar('phone_number', { length: 50 }),
  website: t.text('website'),
  createdAt: t.timestamp('created_at').defaultNow().notNull(),
  updatedAt: t.timestamp('updated_at').defaultNow().notNull(),
}));

export type Place = typeof places.$inferSelect;
export type NewPlace = typeof places.$inferInsert;
