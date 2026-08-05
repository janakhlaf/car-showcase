/** Server-side data access for page components (runs only on the server). */
import { and, count, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { brands, cars, type CarWithBrand } from "@/db/schema";

const withBrand = {
  id: cars.id,
  name: cars.name,
  brandId: cars.brandId,
  year: cars.year,
  price: cars.price,
  color: cars.color,
  colorHex: cars.colorHex,
  description: cars.description,
  thumbnail: cars.thumbnail,
  images: cars.images,
  sketchfabUrl: cars.sketchfabUrl,
  modelPath: cars.modelPath,
  featured: cars.featured,
  specs: cars.specs,
  features: cars.features,
  createdAt: cars.createdAt,
  brandName: brands.name,
};

export async function getFeaturedCars(limit = 3): Promise<CarWithBrand[]> {
  return db
    .select(withBrand)
    .from(cars)
    .innerJoin(brands, eq(cars.brandId, brands.id))
    .orderBy(desc(cars.featured), desc(cars.createdAt))
    .limit(limit);
}

export async function getCarById(id: number): Promise<CarWithBrand | null> {
  const [row] = await db
    .select(withBrand)
    .from(cars)
    .innerJoin(brands, eq(cars.brandId, brands.id))
    .where(eq(cars.id, id));
  return row ?? null;
}

export async function getRelatedCars(car: CarWithBrand, limit = 3): Promise<CarWithBrand[]> {
  return db
    .select(withBrand)
    .from(cars)
    .innerJoin(brands, eq(cars.brandId, brands.id))
    .where(and(ne(cars.id, car.id), eq(cars.brandId, car.brandId)))
    .limit(limit);
}

export interface ShowroomStats {
  carCount: number;
  brandCount: number;
  totalHorsepower: number;
  paintShades: number;
}

export async function getShowroomStats(): Promise<ShowroomStats> {
  const [carAgg, brandAgg, specRows] = await Promise.all([
    db.select({ n: count() }).from(cars),
    db.select({ n: count() }).from(brands),
    db.select({ specs: cars.specs, color: cars.color }).from(cars),
  ]);
  // Horsepower lives in JSONB — aggregate in JS for simplicity & type-safety.
  const totalHorsepower = specRows.reduce((acc, r) => acc + (r.specs.horsepower ?? 0), 0);
  const paintShades = new Set(specRows.map((r) => r.color)).size;

  return {
    carCount: carAgg[0]?.n ?? 0,
    brandCount: brandAgg[0]?.n ?? 0,
    totalHorsepower,
    paintShades,
  };
}
