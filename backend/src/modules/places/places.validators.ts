import { z } from 'zod';

export const createPlaceSchema = z.object({
  googlePlaceId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  address: z.string().optional(),
  latitude: z
    .string()
    .or(z.number())
    .transform((val) => String(val)),
  longitude: z
    .string()
    .or(z.number())
    .transform((val) => String(val)),
  categories: z.array(z.string()).optional(),
  rating: z
    .string()
    .or(z.number())
    .transform((val) => String(val))
    .optional(),
  reviewCount: z.number().optional(),
  priceLevel: z.number().min(0).max(4).optional(),
  photos: z
    .array(
      z.object({
        reference: z.string(),
        url: z.string().optional(),
      })
    )
    .optional(),
  openingHours: z
    .object({
      weekdayText: z.array(z.string()).optional(),
      periods: z
        .array(
          z.object({
            open: z.object({ day: z.number(), time: z.string() }),
            close: z.object({ day: z.number(), time: z.string() }).optional(),
          })
        )
        .optional(),
    })
    .optional(),
  phoneNumber: z.string().optional(),
  website: z.string().optional(),
});

export const updatePlaceSchema = createPlaceSchema.partial();

export const searchSchema = z.object({
  query: z.string().optional(),
  categories: z.array(z.string()).optional(),
  minRating: z.number().optional(),
  maxPriceLevel: z.number().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radiusKm: z.number().optional(),
  limit: z.number().default(50),
  offset: z.number().default(0),
});

export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;
export type UpdatePlaceInput = z.infer<typeof updatePlaceSchema>;
export type SearchPlacesInput = z.infer<typeof searchSchema>;
