import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Box, Gauge, Zap } from "lucide-react";

import axios from "@/services/api";
import type { CarWithBrand } from "@/db/schema";
import { formatPrice } from "@/lib/utils";

interface CarVariant {
  id: number;
  carId: number;
  colorName: string;
  colorHex: string;
  thumbnailUrl: string;
  modelUrl: string;
  isDefault: boolean;
  sortOrder: number;
}

interface CarCardProps {
  car: CarWithBrand;
  index?: number;
}

export function CarCard({ car, index = 0 }: CarCardProps) {
  const [variants, setVariants] = useState<CarVariant[]>([]);
  const [selectedVariant, setSelectedVariant] =
    useState<CarVariant | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadVariants() {
      try {
        const response = await axios.get("/api/car-variants", {
          params: {
            car_id: car.id,
          },
        });

        const loadedVariants: CarVariant[] = Array.isArray(
          response.data?.data,
        )
          ? response.data.data
          : [];

        if (cancelled) return;

        setVariants(loadedVariants);

        const defaultVariant =
          loadedVariants.find((variant) => variant.isDefault) ??
          loadedVariants[0] ??
          null;

        setSelectedVariant(defaultVariant);
      } catch (error) {
        console.error(
          `Failed to load variants for car ${car.id}:`,
          error,
        );

        if (!cancelled) {
          setVariants([]);
          setSelectedVariant(null);
        }
      }
    }

    loadVariants();

    return () => {
      cancelled = true;
    };
  }, [car.id]);

  const displayedImage =
    selectedVariant?.thumbnailUrl || car.thumbnail;

  const displayedColor =
    selectedVariant?.colorName || car.color;

  const displayedColorHex =
    selectedVariant?.colorHex || car.colorHex;

  const detailUrl = useMemo(() => {
    if (selectedVariant) {
      return `/cars/${car.id}?variant=${selectedVariant.id}`;
    }

    return `/cars/${car.id}`;
  }, [car.id, selectedVariant]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{
        duration: 0.6,
        delay: (index % 3) * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-obsidian-900 transition-all duration-500 hover:-translate-y-1.5 hover:border-champagne-400/35 hover:shadow-[0_24px_60px_-20px_rgba(217,185,129,0.25)]"
    >
      {/* صورة السيارة */}
      <Link
        to={detailUrl}
        aria-label={`View the ${car.year} ${car.brandName} ${car.name} in ${displayedColor}`}
        className="block"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-obsidian-950">
          <img
            key={displayedImage}
            src={displayedImage}
            alt={`${car.brandName} ${car.name} in ${displayedColor}`}
            loading={index > 2 ? "lazy" : "eager"}
            className="h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.06]"
            onError={(event) => {
              const image = event.currentTarget;

              if (
                car.thumbnail &&
                image.src !== car.thumbnail
              ) {
                image.src = car.thumbnail;
              }
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-obsidian-900 via-transparent to-transparent" />

          <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
            <span className="glass rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-zinc-300 uppercase">
              {car.brandName}
            </span>

            {car.featured && (
              <span className="rounded-full border border-champagne-400/40 bg-champagne-400/15 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-champagne-300 uppercase backdrop-blur-md">
                Featured
              </span>
            )}
          </div>

          <div className="glass absolute right-3.5 bottom-3.5 flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-zinc-300">
            <Box className="size-3 text-champagne-400" />
            3D View
          </div>
        </div>
      </Link>

      {/* معلومات السيارة */}
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link to={detailUrl}>
              <h3 className="font-display text-xl font-semibold tracking-tight text-zinc-50 transition-colors hover:text-champagne-300">
                {car.name}
              </h3>
            </Link>

            <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-zinc-500">
              <span
                className="inline-block size-2.5 rounded-full ring-1 ring-white/25"
                style={{ backgroundColor: displayedColorHex }}
                aria-hidden="true"
              />

              {displayedColor} · {car.year}
            </p>
          </div>

          <div className="text-right">
            <p className="text-gradient-gold font-display text-lg font-bold">
              {formatPrice(car.price)}
            </p>

            <div className="mt-1 flex items-center justify-end gap-2.5 text-[11px] text-zinc-500">
              {car.specs.horsepower ? (
                <span className="inline-flex items-center gap-1">
                  <Zap className="size-3" />
                  {car.specs.horsepower} hp
                </span>
              ) : null}

              {car.specs.acceleration ? (
                <span className="inline-flex items-center gap-1">
                  <Gauge className="size-3" />
                  {car.specs.acceleration.toFixed(1)}s
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* دوائر الألوان */}
        {variants.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-zinc-600 uppercase">
              Available colours
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {variants.map((variant) => {
                const isSelected =
                  selectedVariant?.id === variant.id;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    title={variant.colorName}
                    aria-label={`Select ${variant.colorName}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedVariant(variant)}
                    className={`relative grid size-7 place-items-center rounded-full transition-all duration-300 ${
                      isSelected
                        ? "scale-110 ring-2 ring-champagne-300 ring-offset-2 ring-offset-obsidian-900"
                        : "ring-1 ring-white/20 hover:scale-110 hover:ring-white/50"
                    }`}
                  >
                    <span
                      className="block size-full rounded-full border border-white/10"
                      style={{
                        backgroundColor: variant.colorHex,
                      }}
                    />

                    {isSelected && (
                      <span className="absolute -bottom-2 size-1 rounded-full bg-champagne-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* رابط صفحة الـ3D */}
        <Link
          to={detailUrl}
          className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4"
        >
          <span className="text-[11px] font-semibold tracking-[0.22em] text-zinc-500 uppercase transition-colors group-hover:text-champagne-300">
            Inspect in 3D
          </span>

          <span className="grid size-8 place-items-center rounded-full border border-white/10 text-zinc-400 transition-all duration-300 group-hover:border-champagne-400/60 group-hover:bg-champagne-400 group-hover:text-obsidian-950">
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" />
          </span>
        </Link>
      </div>
    </motion.article>
  );
}