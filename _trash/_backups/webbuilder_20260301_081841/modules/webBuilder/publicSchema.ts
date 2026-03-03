import { z } from 'zod';

export const PublicPropertySchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    coordinates: z.object({
        lat: z.number().optional(),
        lng: z.number().optional(),
    }).optional(),
    amenities: z.array(z.string()).optional(),
    photos: z.array(z.object({
        id: z.string(),
        url: z.string(),
        title: z.string().optional(),
    })).optional(),
    contact: z.object({
        email: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
    }).optional(),
    social: z.object({
        instagram: z.string().optional(),
        facebook: z.string().optional(),
        tiktok: z.string().optional(),
        x: z.string().optional(),
        youtube: z.string().optional(),
    }).optional(),
});

export const PublicApartmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    capacity: z.number().optional(),
    bedrooms: z.number().optional(),
    bathrooms: z.number().optional(),
    basePrice: z.number().nullable(),
    currency: z.string().default('EUR'),
    amenities: z.array(z.string()).optional(),
    photos: z.array(z.object({
        id: z.string(),
        url: z.string(),
        title: z.string().optional(),
    })).optional(),
});

export const PublicPolicySchema = z.object({
    id: z.string(),
    scope_id: z.string(),
    payment_mode: z.string(),
    cancellation_policy_type: z.string(),
    deposit_type: z.string().optional(),
    deposit_value: z.number().optional(),
    rules: z.array(z.any()).optional(),
});

export const PublicSnapshotSchema = z.object({
    version: z.literal('1.0'),
    generatedAt: z.number(),
    property: PublicPropertySchema,
    apartments: z.array(PublicApartmentSchema),
    policies: z.array(PublicPolicySchema),
});

export const PublicAvailabilitySchema = z.record(
    z.string(), // apartmentId
    z.record(
        z.string(), // date YYYY-MM-DD
        z.enum(['blocked', 'available'])
    )
);

export type PublicSnapshotV1 = z.infer<typeof PublicSnapshotSchema>;
export type PublicAvailability = z.infer<typeof PublicAvailabilitySchema>;
