import { eq, sql, and, or, ilike } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import { places, type NewPlace, type Place } from './schemas/places.schema.js';
import type { CreatePlaceInput, UpdatePlaceInput, SearchPlacesInput } from './places.validators.js';

export const placesService = {
  async getAll(options: { limit?: number; offset?: number } = {}) {
    const { limit = 50, offset = 0 } = options;
    return db.select().from(places).limit(limit).offset(offset);
  },

  async getById(id: number) {
    const result = await db.select().from(places).where(eq(places.id, id));
    return result[0] || null;
  },

  async getByGooglePlaceId(googlePlaceId: string) {
    const result = await db
      .select()
      .from(places)
      .where(eq(places.googlePlaceId, googlePlaceId));
    return result[0] || null;
  },

  async create(place: CreatePlaceInput) {
    const result = await db.insert(places).values(place).returning();
    return result[0];
  },

  async update(id: number, data: UpdatePlaceInput) {
    const result = await db
      .update(places)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(places.id, id))
      .returning();
    return result[0] || null;
  },

  async delete(id: number) {
    const result = await db.delete(places).where(eq(places.id, id)).returning();
    return result[0] || null;
  },

  async search(options: SearchPlacesInput) {
    const {
      query,
      categories,
      minRating,
      maxPriceLevel,
      latitude,
      longitude,
      radiusKm,
      limit = 50,
      offset = 0,
    } = options;

    const conditions = [];

    if (query) {
      conditions.push(
        or(
          ilike(places.name, `%${query}%`),
          ilike(places.address, `%${query}%`)
        )
      );
    }

    if (categories && categories.length > 0) {
      conditions.push(
        sql`${places.categories}::jsonb ?| array[${sql.join(
          categories.map((c) => sql`${c}`),
          sql`, `
        )}]`
      );
    }

    if (minRating !== undefined) {
      conditions.push(sql`${places.rating} >= ${minRating}`);
    }

    if (maxPriceLevel !== undefined) {
      conditions.push(sql`${places.priceLevel} <= ${maxPriceLevel}`);
    }

    let query_sql = db.select().from(places);

    if (conditions.length > 0) {
      query_sql = query_sql.where(and(...conditions)) as typeof query_sql;
    }

    // If location-based search, calculate distance and filter
    if (latitude !== undefined && longitude !== undefined && radiusKm) {
      query_sql = query_sql.where(
        sql`(
          6371 * acos(
            cos(radians(${latitude}))
            * cos(radians(${places.latitude}::float))
            * cos(radians(${places.longitude}::float) - radians(${longitude}))
            + sin(radians(${latitude}))
            * sin(radians(${places.latitude}::float))
          )
        ) <= ${radiusKm}`
      ) as typeof query_sql;
    }

    return query_sql.limit(limit).offset(offset);
  },
};
