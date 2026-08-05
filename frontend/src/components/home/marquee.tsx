import { Diamond } from "lucide-react";

const BRANDS = ["McLaren", "Lamborghini", "Porsche", "Aston Martin", "Bentley", "Audi", "Mercedes-AMG", "Ferrari"];

/** Infinite marque ticker — pure CSS animation, pauses for reduced motion. */
export function BrandMarquee() {
  const row = [...BRANDS, ...BRANDS];
  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] py-7" aria-hidden id="collection">
      <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap">
        {row.map((brand, i) => (
          <span key={i} className="flex items-center gap-10">
            <span className="font-display text-2xl font-bold tracking-[0.24em] text-zinc-600 uppercase transition-colors md:text-3xl">
              {brand}
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
