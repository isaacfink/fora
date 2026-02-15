import { cellToBoundary, gridDisk, latLngToCell } from 'h3-js';
import { Client } from '@googlemaps/google-maps-services-js';
import { db } from '../../lib/db.js';
import { gridCells, eventCells, type GridCell } from './schemas/index.js';
import { places } from '../places/schemas/places.schema.js';
import { eq, inArray, or, and, isNull, lt } from 'drizzle-orm';
import { syncPlacesRefreshQueue } from './sync-places.queue.js';
import { logger } from '../../lib/logger.js';
import { config } from '../../lib/config.js';
import type { GridCellDescriptor, NearbySearchRequest } from './sync-places.types.js';

const googleClient = new Client({});

// Default H3 resolution level 10 (~1.5km hexagons)
export const DEFAULT_H3_LEVEL = 10;

// Default staleness threshold: 12 hours
export const DEFAULT_STALE_AFTER_MS = 12 * 60 * 60 * 1000;

// Approximate radius in meters to query Google Places for a single H3 cell at level 10
// H3 level 10 hexagons have ~0.7km edge length, so we use ~1km radius to cover the hex
export const CELL_QUERY_RADIUS_M = 1000;

/**
 * Get all H3 cells covering a circular area
 * Uses gridDisk to get hexagons within the specified radius
 */
export function getCoveringCells(
	center: { lat: number; lng: number },
	radiusM: number,
	level: number = DEFAULT_H3_LEVEL
): GridCellDescriptor[] {
	// Convert center to H3 cell
	const centerCell = latLngToCell(center.lat, center.lng, level);

	// Calculate k-ring radius (how many rings of hexagons we need)
	// H3 level 10: ~1.5km average hexagon diameter
	// This is approximate but works well in practice
	const avgHexDiameterM = getAvgHexDiameterM(level);
	const kRings = Math.ceil(radiusM / avgHexDiameterM);

	// Get all cells within k rings
	const cells = gridDisk(centerCell, kRings);

	// Convert to descriptors with center lat/lng
	return cells.map((cellId) => {
		const boundary = cellToBoundary(cellId, true); // true = [lat, lng] format
		
		// Calculate centroid (average of boundary points)
		const centerLat = boundary.reduce((sum, coord) => sum + coord[0], 0) / boundary.length;
		const centerLng = boundary.reduce((sum, coord) => sum + coord[1], 0) / boundary.length;

		return {
			cellId,
			level,
			centerLat,
			centerLng,
			queryRadiusM: CELL_QUERY_RADIUS_M,
		};
	});
}

/**
 * Get approximate hexagon diameter in meters for a given H3 resolution
 * Based on H3 documentation: https://h3geo.org/docs/core-library/restable
 */
function getAvgHexDiameterM(level: number): number {
	const diameters: Record<number, number> = {
		7: 5161, // ~5.2km
		8: 1953, // ~2km
		9: 738,  // ~740m
		10: 278, // ~280m (~1.5km from edge to edge)
		11: 105, // ~105m
		12: 40,  // ~40m
	};
	return diameters[level] || 1000; // default 1km if level not in table
}

/**
 * Insert or update cells in the database
 * Only inserts new cells, doesn't update existing ones (to avoid thrashing)
 */
export async function upsertCells(cells: GridCellDescriptor[]): Promise<void> {
	if (cells.length === 0) return;

	// Find which cells already exist
	const cellIds = cells.map((c) => c.cellId);
	const existingCells = await db
		.select({ id: gridCells.id })
		.from(gridCells)
		.where(inArray(gridCells.id, cellIds));

	const existingIds = new Set(existingCells.map((c) => c.id));

	// Only insert new cells
	const newCells = cells.filter((c) => !existingIds.has(c.cellId));

	if (newCells.length > 0) {
		await db.insert(gridCells).values(
			newCells.map((cell) => ({
				id: cell.cellId,
				level: cell.level,
				centerLat: cell.centerLat,
				centerLng: cell.centerLng,
				queryRadiusM: cell.queryRadiusM,
				lastFetchedAt: null,
				resultCountLastFetch: null,
				hitCapLastFetch: null,
			}))
		);
	}
}

/**
 * Get cells that need refresh (stale or never fetched)
 */
export async function getCellsNeedingRefresh(
	cells: GridCellDescriptor[],
	staleAfterMs: number = DEFAULT_STALE_AFTER_MS,
	now: Date = new Date()
): Promise<GridCellDescriptor[]> {
	if (cells.length === 0) return [];

	const cellIds = cells.map((c) => c.cellId);
	const staleThreshold = new Date(now.getTime() - staleAfterMs);

	// Query cells that are in our list AND (never fetched OR stale)
	const staleCells = await db
		.select()
		.from(gridCells)
		.where(
			and(
				inArray(gridCells.id, cellIds),
				or(
					isNull(gridCells.lastFetchedAt),
					lt(gridCells.lastFetchedAt, staleThreshold)
				)
			)
		);

	return staleCells.map((cell) => ({
		cellId: cell.id,
		level: cell.level,
		centerLat: cell.centerLat,
		centerLng: cell.centerLng,
		queryRadiusM: cell.queryRadiusM,
	}));
}

/**
 * Build Google Places Nearby Search requests for cells
 */
export function buildNearbySearchRequests(
	cells: GridCellDescriptor[],
	options?: {
		includedTypes?: string[];
		excludedTypes?: string[];
		maxResultCount?: number;
	}
): NearbySearchRequest[] {
	const maxResultCount = options?.maxResultCount ?? 20;
	const fieldMask = 'places.id,places.displayName,places.location,places.primaryType,places.types';

	return cells.map((cell) => ({
		cellId: cell.cellId,
		requestBody: {
			locationRestriction: {
				circle: {
					center: {
						latitude: cell.centerLat,
						longitude: cell.centerLng,
					},
					radius: cell.queryRadiusM,
				},
			},
			...(options?.includedTypes && { includedTypes: options.includedTypes }),
			...(options?.excludedTypes && { excludedTypes: options.excludedTypes }),
			maxResultCount,
		},
		fieldMask,
	}));
}

/**
 * Link an event to its covering cells
 */
export async function linkEventToCells(eventId: string, cellIds: string[]): Promise<void> {
	if (cellIds.length === 0) return;

	await db.insert(eventCells).values(
		cellIds.map((cellId) => ({
			eventId,
			cellId,
		}))
	).onConflictDoNothing();
}

/**
 * Update cell metadata after fetching from Google Places
 */
export async function updateCellAfterFetch(
	cellId: string,
	resultCount: number,
	now: Date = new Date()
): Promise<void> {
	await db
		.update(gridCells)
		.set({
			lastFetchedAt: now,
			resultCountLastFetch: resultCount,
			hitCapLastFetch: resultCount === 20,
			updatedAt: now,
		})
		.where(eq(gridCells.id, cellId));
}

/**
 * Get cells for an event
 */
export async function getEventCells(eventId: string): Promise<GridCell[]> {
	const results = await db
		.select({
			cell: gridCells,
		})
		.from(eventCells)
		.innerJoin(gridCells, eq(eventCells.cellId, gridCells.id))
		.where(eq(eventCells.eventId, eventId));

	return results.map((r) => r.cell);
}

/**
 * Enqueue refresh jobs for stale cells
 * Uses BullMQ job ID deduplication to ensure each cell is only refreshed once
 */
export async function enqueueRefreshJobs(staleCells: GridCellDescriptor[]): Promise<void> {
	const jobPromises = staleCells.map((cell) =>
		syncPlacesRefreshQueue.add(
			'refresh-cell',
			{
				cellId: cell.cellId,
				level: cell.level,
			},
			{
				jobId: `cell:${cell.cellId}`, // Dedupe key - only one job per cell
			}
		)
	);

	const jobs = await Promise.all(jobPromises);
	logger.info({ jobCount: jobs.length }, 'Enqueued cell refresh jobs');
}

/**
 * Fetch places from Google Places API for a specific cell
 * Uses the Google Maps Services JS library like the import script
 */
export async function fetchPlacesForCell(
	centerLat: number,
	centerLng: number,
	radiusM: number
): Promise<Array<{
	id: string;
	name: string;
	location: { latitude: number; longitude: number };
	types: string[];
}>> {
	const response = await googleClient.placesNearby({
		params: {
			location: { lat: centerLat, lng: centerLng },
			radius: radiusM,
			key: config.GOOGLE_PLACES_API_KEY,
		},
	});

	if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
		throw new Error(`Google Places API error: ${response.data.status}`);
	}

	const places = response.data.results;
	
	return places
		.filter(place => place.place_id && place.geometry?.location)
		.map(place => ({
			id: place.place_id!,
			name: place.name || 'Unknown',
			location: {
				latitude: place.geometry!.location.lat,
				longitude: place.geometry!.location.lng,
			},
			types: place.types || [],
		}));
}

/**
 * Process a single cell refresh: fetch from Google and upsert places
 */
export async function refreshCell(cellId: string): Promise<void> {
	logger.info({ cellId }, 'Starting cell refresh');

	// Load cell from database
	const [cell] = await db
		.select()
		.from(gridCells)
		.where(eq(gridCells.id, cellId))
		.limit(1);

	if (!cell) {
		logger.error({ cellId }, 'Cell not found in database');
		throw new Error(`Cell ${cellId} not found`);
	}

	// Fetch places from Google
	const googlePlaces = await fetchPlacesForCell(
		cell.centerLat,
		cell.centerLng,
		cell.queryRadiusM
	);

	logger.info({ cellId, placeCount: googlePlaces.length }, 'Fetched places from Google');

	// Upsert places into database
	let upsertedCount = 0;
	for (const place of googlePlaces) {
		// Check if place already exists
		const [existing] = await db
			.select()
			.from(places)
			.where(eq(places.googlePlaceId, place.id))
			.limit(1);

		if (!existing) {
			// Insert new place
			await db.insert(places).values({
				googlePlaceId: place.id,
				name: place.name,
				latitude: place.location.latitude.toString(),
				longitude: place.location.longitude.toString(),
				categories: place.types,
			});
			upsertedCount++;
		}
	}

	logger.info({ cellId, upsertedCount }, 'Upserted places into database');

	// Update cell metadata
	await updateCellAfterFetch(cellId, googlePlaces.length);

	logger.info({ cellId }, 'Cell refresh completed');
}

/**
 * Complete workflow: compute cells, upsert, link to event, and enqueue refresh jobs
 * Call this when an event is created to trigger place fetching
 */
export async function initializeEventGrid(
	eventId: string,
	center: { lat: number; lng: number },
	radiusM: number,
	options?: {
		level?: number;
		staleAfterMs?: number;
	}
): Promise<{
	totalCells: number;
	staleCells: number;
}> {
	// 1. Compute covering cells
	const cells = getCoveringCells(center, radiusM, options?.level);
	logger.info({ eventId, cellCount: cells.length }, 'Computed covering cells');

	// 2. Upsert cells
	await upsertCells(cells);
	logger.info({ eventId }, 'Upserted cells');

	// 3. Link event to cells
	const cellIds = cells.map((c) => c.cellId);
	await linkEventToCells(eventId, cellIds);
	logger.info({ eventId }, 'Linked event to cells');

	// 4. Get stale cells
	const staleCells = await getCellsNeedingRefresh(cells, options?.staleAfterMs);
	logger.info({ eventId, staleCellCount: staleCells.length }, 'Found stale cells');

	// 5. Enqueue refresh jobs
	if (staleCells.length > 0) {
		await enqueueRefreshJobs(staleCells);
	}

	return {
		totalCells: cells.length,
		staleCells: staleCells.length,
	};
}

export const syncPlacesService = {
	getCoveringCells,
	upsertCells,
	getCellsNeedingRefresh,
	buildNearbySearchRequests,
	linkEventToCells,
	updateCellAfterFetch,
	getEventCells,
	enqueueRefreshJobs,
	initializeEventGrid,
	fetchPlacesForCell,
	refreshCell,
};
