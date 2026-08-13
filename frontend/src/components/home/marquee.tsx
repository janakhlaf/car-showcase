import { useEffect, useState } from "react";
import { Diamond } from "lucide-react";
import axios from "@/services/api";

interface Brand {
  id: number;
  name: string;
}

/** Infinite marque ticker — brands loaded dynamically from the database. */
export function BrandMarquee() {
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    axios
      .get<{ data: Brand[] }>("/api/brands")
      .then((res) => {
        setBrands(res.data.data ?? []);
      })
      .catch((error) => {
        console.error("Could not load marquee brands:", error);
      });
  }, []);

  if (brands.length === 0) return null;

  const row = [...brands, ...brands];

  return (
    <div
      className="relative overflow-hidden border-y border-white/[0.06] py-7"
      aria-hidden
      id="collection"
    >
      <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap">
        {row.map((brand, i) => (
          <span key={`${brand.id}-${i}`} className="flex items-center gap-10">
            <span className="font-display text-2xl font-bold tracking-[0.24em] text-zinc-600 uppercase transition-colors md:text-3xl">
              {brand.name}
            </span>

            <Diamond className="size-3 fill-champagne-500/40 text-champagne-500/40" />
          </span>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-obsidian-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-obsidian-950 to-transparent" />
    </div>
  );
}