/**
 * Zod request validation — single source of truth for the REST API.
 * Every mutating endpoint parses with these schemas and returns a
 * 422 `UNPROCESSABLE_ENTITY` envelope `{ error, issues }` on failure.
 */
import { z } from "zod";

const imageUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v.startsWith("/") || /^https?:\/\//i.test(v), {
    message: "Must be an absolute http(s) URL or a root-relative path",
  });

const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v), {
    message: "Must be a URL or empty",
  })
  .optional()
  .nullable();

export const specsSchema = z.object({
  horsepower: z.number().int().min(50).max(2000).optional(),
  topSpeed: z.number().int().min(60).max(350).optional(),
  acceleration: z.number().min(1).max(15).optional(),
  engine: z.string().trim().max(160).optional(),
  transmission: z.string().trim().max(80).optional(),
  drivetrain: z.string().trim().max(40).optional(),
  weight: z.number().int().min(500).max(9000).optional(),
  seats: z.number().int().min(1).max(9).optional(),
});

export const carInputSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(160),
  brandId: z.number().int().positive("Pick a brand"),
  year: z.number().int().min(1950).max(2035),
  price: z.number().int().min(1000).max(50_000_000),
  color: z.string().trim().min(2).max(80),
  colorHex: z.string().trim().regex(/^#(?:[0-9a-fA-F]{6})$/i, "Use a 6-digit hex colour"),
  description: z.string().trim().min(10, "Description is too short").max(4000),
  thumbnail: imageUrl,
  images: z.array(imageUrl).max(10).default([]),
  sketchfabUrl: optionalUrl,
  modelPath: optionalUrl,
  featured: z.boolean().default(false),
  specs: specsSchema.default({}),
  features: z.array(z.string().trim().min(2).max(120)).max(12).default([]),
});

export const carQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  brand: z.coerce.number().int().positive().optional(),
  color: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().min(1950).max(2035).optional(),
  sort: z.enum(["newest", "price-asc", "price-desc", "year-desc"]).optional(),
});

export const brandInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, "Password required").max(200),
});

export type CarInput = z.infer<typeof carInputSchema>;
