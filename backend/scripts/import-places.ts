import { Client } from '@googlemaps/google-maps-services-js';
import { config } from '../src/lib/config.js';
import { placesService } from '../src/modules/places/places.service.js';

const client = new Client({});

interface ImportOptions {
  latitude: number;
  longitude: number;
  radius?: number;
  type?: string;
  keyword?: string;
}

async function importPlaces(options: ImportOptions) {
  const { latitude, longitude, radius = 5000, type, keyword } = options;

  console.log(`Fetching places near (${latitude}, ${longitude})`);
  console.log(`Radius: ${radius}m, Type: ${type || 'all'}, Keyword: ${keyword || 'none'}`);

  try {
    const response = await client.placesNearby({
      params: {
        location: { lat: latitude, lng: longitude },
        radius,
        type,
        keyword,
        key: config.GOOGLE_PLACES_API_KEY,
      },
    });

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${response.data.status}`);
    }

    const places = response.data.results;
    console.log(`Found ${places.length} places`);

    let imported = 0;
    let skipped = 0;

    for (const place of places) {
      try {
        if (!place.place_id) {
          console.log(`Skipping place without ID: ${place.name}`);
          skipped++;
          continue;
        }

        // Check if place already exists
        const existing = await placesService.getByGooglePlaceId(place.place_id);

        if (existing) {
          console.log(`Skipping existing place: ${place.name}`);
          skipped++;
          continue;
        }

        // Get additional details for the place
        const detailsResponse = await client.placeDetails({
          params: {
            place_id: place.place_id,
            fields: [
              'name',
              'formatted_address',
              'geometry',
              'rating',
              'user_ratings_total',
              'price_level',
              'types',
              'photos',
              'opening_hours',
              'formatted_phone_number',
              'website',
            ],
            key: config.GOOGLE_PLACES_API_KEY,
          },
        });

        const details = detailsResponse.data.result;

        await placesService.create({
          googlePlaceId: place.place_id,
          name: details.name || place.name || 'Unknown',
          address: details.formatted_address,
          latitude: String(details.geometry?.location.lat || place.geometry?.location.lat),
          longitude: String(details.geometry?.location.lng || place.geometry?.location.lng),
          categories: details.types || [],
          rating: details.rating ? String(details.rating) : undefined,
          reviewCount: details.user_ratings_total,
          priceLevel: details.price_level,
          photos: details.photos?.map((photo) => ({
            reference: photo.photo_reference,
          })),
          openingHours: details.opening_hours
            ? {
                weekdayText: details.opening_hours.weekday_text,
                periods: details.opening_hours.periods?.map((period) => ({
                  open: {
                    day: period.open?.day ?? 0,
                    time: period.open?.time ?? '0000',
                  },
                  close: period.close
                    ? {
                        day: period.close.day ?? 0,
                        time: period.close.time ?? '0000',
                      }
                    : undefined,
                })),
              }
            : undefined,
          phoneNumber: details.formatted_phone_number,
          website: details.website,
        });

        console.log(`Imported: ${details.name || place.name}`);
        imported++;

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to import place ${place.name}:`, error);
      }
    }

    console.log(`\nImport complete: ${imported} imported, ${skipped} skipped`);
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

// Parse command-line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: bun run import:places <latitude> <longitude> [radius] [type] [keyword]');
  console.error('Example: bun run import:places 40.7128 -74.0060 5000 restaurant pizza');
  process.exit(1);
}

const latitude = parseFloat(args[0]);
const longitude = parseFloat(args[1]);
const radius = args[2] ? parseInt(args[2]) : 5000;
const type = args[3];
const keyword = args[4];

if (isNaN(latitude) || isNaN(longitude)) {
  console.error('Invalid latitude or longitude');
  process.exit(1);
}

importPlaces({ latitude, longitude, radius, type, keyword })
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
