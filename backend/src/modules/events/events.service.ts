import { db } from '../../lib/db.js';
import { redis } from '../../lib/redis.js';
import { events, type Event, type NewEvent } from './schemas/events.schema.js';
import { syncPlacesService } from '../sync-places/sync-places.service.js';

/**
 * Initialize grid fetching for an event
 * This should be called after creating an event to trigger place fetching
 * 
 * @param eventId - The event ID
 * @param center - Event center location
 * @param radiusM - Search radius in meters
 * @returns Object with totalCells and staleCells counts
 */
export async function initializeEventPlaceFetching(
  eventId: string,
  center: { lat: number; lng: number },
  radiusM: number
): Promise<{ totalCells: number; staleCells: number }> {
  return await syncPlacesService.initializeEventGrid(eventId, center, radiusM);
}

export const eventsService = {
  // TODO: Implement event service methods (create, update, get, etc.)
  // You can call initializeEventPlaceFetching after creating an event
  initializeEventPlaceFetching,
};
