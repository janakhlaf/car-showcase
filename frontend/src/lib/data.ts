import axios from "axios";

export interface ShowroomStats {
  carCount: number;
  brandCount: number;
  totalHorsepower: number;
  paintShades: number;
}

export interface CarWithBrand {
  id: number;
  name: string;
  brandId: number;
  brandName: string;
  year: number;
  price: number;
  color: string;
  colorHex: string;
  description: string;
  thumbnail: string;
  images: string[];
  sketchfabUrl?: string | null;
  modelPath?: string | null;
  featured?: boolean;
  specs?: {
    horsepower?: number;
    [key: string]: any;
  };
  features?: string[];
  approvalStatus?: "pending" | "approved" | "rejected";
  sellerId?: number | null;
}

export async function getFeaturedCars(
  limit = 3
): Promise<CarWithBrand[]> {
  const response = await axios.get(
    `/api/cars?featured=1&limit=${limit}`
  );

  return response.data?.data ?? [];
}

export async function getCarById(
  id: number
): Promise<CarWithBrand | null> {
  const response = await axios.get(
    `/api/cars/${id}`
  );

  return response.data?.data ?? null;
}

export async function getRelatedCars(
  car: CarWithBrand,
  limit = 3
): Promise<CarWithBrand[]> {
  const response = await axios.get(
    `/api/cars?brandId=${car.brandId}&limit=${limit + 1}`
  );

  const rows: CarWithBrand[] =
    response.data?.data ?? [];

  return rows
    .filter((item) => item.id !== car.id)
    .slice(0, limit);
}

export async function getShowroomStats(): Promise<ShowroomStats> {
  const response = await axios.get(
    "/api/stats"
  );

  return (
    response.data?.data ?? {
      carCount: 0,
      brandCount: 0,
      totalHorsepower: 0,
      paintShades: 0,
    }
  );
}