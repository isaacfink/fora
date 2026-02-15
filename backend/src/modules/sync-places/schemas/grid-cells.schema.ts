import { pgTable, text, integer, doublePrecision, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const gridCells = pgTable(
	'grid_cells',
	(t) => ({
		id: t.text('id').primaryKey(), // H3 index as string
		level: t.integer('level').notNull(), // H3 resolution level
		centerLat: t.doublePrecision('center_lat').notNull(),
		centerLng: t.doublePrecision('center_lng').notNull(),
		queryRadiusM: t.integer('query_radius_m').notNull(), // circle radius for Google Places query
		lastFetchedAt: t.timestamp('last_fetched_at', { withTimezone: true }),
		resultCountLastFetch: t.integer('result_count_last_fetch'),
		hitCapLastFetch: t.boolean('hit_cap_last_fetch'), // true if result count == 20
		createdAt: t.timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: t.timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	}),
	(table) => [
		index('grid_cells_last_fetched_at_idx').on(table.lastFetchedAt),
		index('grid_cells_level_idx').on(table.level),
	]
);

export type GridCell = typeof gridCells.$inferSelect;
export type NewGridCell = typeof gridCells.$inferInsert;
