import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import axios from "@/services/api";
import type { CarWithBrand } from "@/db/schema";
import { CarDetail } from "@/components/cars/car-detail";

export interface CarVariant {
  id: number;
  carId: number;
  colorName: string;
  colorHex: string;
  thumbnailUrl: string;
  modelUrl: string;
  isDefault: boolean;
  sortOrder: number;
}

export function CarDetailPage() {
  const { id } = useParams();
  useEffect(() => {
  window.scrollTo(0, 0);
}, [id]);
  const [searchParams] = useSearchParams();

  const [car, setCar] = useState<CarWithBrand | null>(null);
  const [related, setRelated] = useState<CarWithBrand[]>([]);
  const [variants, setVariants] = useState<CarVariant[]>([]);
  const [loading, setLoading] = useState(true);

  const variantIdFromUrl = Number(searchParams.get("variant")) || null;

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadPage() {
      setLoading(true);

      try {
        const [carResponse, variantsResponse] = await Promise.all([
          axios.get(`/api/cars/${id}`),
          axios.get("/api/car-variants", {
            params: {
              car_id: id,
            },
          }),
        ]);

        if (cancelled) return;

        const loadedCar: CarWithBrand = carResponse.data.data;
        const loadedVariants: CarVariant[] =
          variantsResponse.data?.data ?? [];

        setCar(loadedCar);
        setVariants(
          Array.isArray(loadedVariants) ? loadedVariants : [],
        );

        const relatedResponse = await axios.get("/api/cars", {
          params: {
            brandId: loadedCar.brandId,
            limit: 4,
          },
        });

        if (cancelled) return;

        const relatedCars: CarWithBrand[] =
          relatedResponse.data?.data ?? [];

        setRelated(
          relatedCars
            .filter((item) => String(item.id) !== id)
            .slice(0, 3),
        );
      } catch (error) {
        console.error("Failed to load car details:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-40 text-center text-zinc-400">
        Loading...
      </div>
    );
  }

  if (!car) {
    return (
      <div className="min-h-screen pt-40 text-center text-zinc-400">
        Car not found.
      </div>
    );
  }

  return (
    <CarDetail
      car={car}
      related={related}
      variants={variants}
      initialVariantId={variantIdFromUrl}
    />
  );
}