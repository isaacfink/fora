import { pgTable, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { events } from '../../events/schemas/events.schema.js';
import { gridCells } from './grid-cells.schema.js';

export const eventCells = pgTable(
	'event_cells',
	(t) => ({
		eventId: t.text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
		cellId: t.text('cell_id').notNull().references(() => gridCells.id, { onDelete: 'cascade' }),
		createdAt: t.timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	}),
	(table) => [
		primaryKey({ columns: [table.eventId, table.cellId] })
	]
);

export type EventCell = typeof eventCells.$inferSelect;
export type NewEventCell = typeof eventCells.$inferInsert;
