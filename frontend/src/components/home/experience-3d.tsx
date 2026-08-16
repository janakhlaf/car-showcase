

import { useEffect, useState } from "react";
import { ModelViewer } from "@/components/three/model-viewer";
import { Expand, MousePointer2, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/reveal";
import type { CarWithBrand } from "@/db/schema";
// WebGL must stay client-only — load the stage lazily in the browser.
export interface PaintOption {
  name: string;
  color: string;
  hex: string;
  modelUrl?: string | null;
  isDefault?: boolean;
}

const capabilities = [
  { icon: MousePointer2, label: "360° orbit inspection" },
  { icon: ZoomIn, label: "Precision zoom control" },
  { icon: Expand, label: "Immersive fullscreen" },
];

export function Experience3D({
  paints,
  car,
}: {
  paints: PaintOption[];
  car: CarWithBrand;
}) {
  const [active, setActive] = useState(0);

useEffect(() => {
  const defaultIndex = paints.findIndex(
    (paint) => paint.isDefault
  );

  setActive(
    defaultIndex >= 0
      ? defaultIndex
      : 0
  );
}, [paints]);
  const paint = paints[active] ?? {
  name: car.name,
  color: car.color,
  hex: car.colorHex,
  modelUrl: car.modelPath,
  isDefault: true,
};

  return (
    <section id="experience" className="relative py-24" aria-labelledby="experience-title">
      {/* ambient glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-[140px] transition-colors duration-1000"
        style={{ backgroundColor: paint.hex }}
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[1fr_1.35fr] lg:px-8">
        <Reveal>
          <p className="font-display text-xs font-semibold tracking-[0.32em] text-champagne-400 uppercase">
            The Digital Atelier
          </p>
          <h2 id="experience-title" className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Inspect every curve in{" "}
            <span className="font-accent text-gradient-gold font-normal italic">interactive 3D</span>
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-zinc-400">
            Rotate, zoom and examine each machine rendered in its true factory paint. Select a
            shade from the collection to repaint the studio car in real time.
          </p>

          <div className="mt-8">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-zinc-500 uppercase">
              Collection paints
            </p>
            <div className="mt-3 flex flex-wrap gap-3" role="listbox" aria-label="Choose a paint">
              {paints.map((p, i) => (
                <button
                  key={p.hex}
                  role="option"
                  aria-selected={i === active}
                  title={`${p.color} — ${p.name}`}
                  onClick={() => setActive(i)}
                  className={cn(
                    "relative size-10 rounded-full border-2 transition-all duration-300",
                    i === active
                      ? "scale-110 border-champagne-300 shadow-[0_0_24px_-4px_rgba(217,185,129,0.7)]"
                      : "border-white/15 hover:border-white/40",
                  )}
                  style={{ backgroundColor: p.hex }}
                >
                  <span className="sr-only">{p.color}</span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm text-zinc-400">
              <span className="font-semibold text-zinc-200">{paint.color}</span>
              <span className="text-zinc-600"> — as configured on the {paint.name}</span>
            </p>
          </div>

          <ul className="mt-9 space-y-3.5">
            {capabilities.map((c) => (
              <li key={c.label} className="flex items-center gap-3.5 text-sm text-zinc-300">
                <span className="grid size-9 place-items-center rounded-full border border-champagne-400/25 bg-champagne-400/10 text-champagne-300">
                  <c.icon className="size-4" />
                </span>
                {c.label}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.12}>
          <ModelViewer
  key={paint.modelUrl ?? car.modelPath ?? paint.color}
  modelPath={paint.modelUrl ?? car.modelPath}
  color={paint.hex}
  colorName={paint.color}
  className="aspect-[4/3] md:aspect-[16/11]"
/>
        </Reveal>
      </div>
    </section>
  );
}
