

/**
 * CarDetail — immersive vehicle dossier: interactive 3D studio, animated
 * specification sheet, feature list, gallery with keyboard-navigable
 * lightbox, and related machines.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ModelViewer } from "@/components/three/model-viewer";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  Armchair,
  CarFront,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cog,
  Gauge,
  Share2,
  Sparkles,
  Timer,
  Weight,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type { CarWithBrand } from "@/db/schema";
import { cn, formatPrice } from "@/lib/utils";
import { Reveal } from "@/components/reveal";
import { CarCard } from "./car-card";

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

const specDefs: Array<{
  key: keyof CarWithBrand["specs"];
  label: string;
  icon: typeof Zap;
  format: (v: number | string) => string;
}> = [
  { key: "horsepower", label: "Power", icon: Zap, format: (v) => `${v} hp` },
  { key: "topSpeed", label: "Top speed", icon: Gauge, format: (v) => `${v} mph` },
  { key: "acceleration", label: "0–60 mph", icon: Timer, format: (v) => `${Number(v).toFixed(1)} s` },
  { key: "engine", label: "Powertrain", icon: Cog, format: (v) => String(v) },
  { key: "transmission", label: "Gearbox", icon: Cog, format: (v) => String(v) },
  { key: "drivetrain", label: "Driven wheels", icon: CarFront, format: (v) => String(v) },
  { key: "weight", label: "Dry weight", icon: Weight, format: (v) => `${Number(v).toLocaleString()} lbs` },
  { key: "seats", label: "Seats", icon: Armchair, format: (v) => String(v) },
];

interface CarDetailProps {
  car: CarWithBrand;
  related: CarWithBrand[];
  variants: CarVariant[];
  initialVariantId?: number | null;
}

export function CarDetail({
  car,
  related,
  variants,
  initialVariantId,
}: CarDetailProps) {
  const navigate = useNavigate();

  const initialVariant =
    variants.find((variant) => variant.id === initialVariantId) ??
    variants.find((variant) => variant.isDefault) ??
    variants[0] ??
    null;

  const [selectedVariant, setSelectedVariant] =
    useState<CarVariant | null>(initialVariant);

  const [imageIndex, setImageIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    const nextVariant =
      variants.find((variant) => variant.id === initialVariantId) ??
      variants.find((variant) => variant.isDefault) ??
      variants[0] ??
      null;

    setSelectedVariant(nextVariant);
    setImageIndex(0);
  }, [variants, initialVariantId]);

  const displayedColor =
    selectedVariant?.colorName ?? car.color;

  const displayedColorHex =
    selectedVariant?.colorHex ?? car.colorHex;

  const displayedModel =
    selectedVariant?.modelUrl ?? car.modelPath;

  const displayedThumbnail =
    selectedVariant?.thumbnailUrl ?? car.thumbnail;

  const gallery = useMemo(() => {
    const images = [
      displayedThumbnail,
      ...car.images.filter(
        (image) => image && image !== displayedThumbnail,
      ),
    ].filter(Boolean);

    return images.length > 0 ? images : [car.thumbnail];
  }, [displayedThumbnail, car.images, car.thumbnail]);

  function selectVariant(variant: CarVariant) {
    setSelectedVariant(variant);
    setImageIndex(0);

    navigate(`/cars/${car.id}?variant=${variant.id}`, {
      replace: true,
    });
  }

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") setImageIndex((i) => (i + 1) % gallery.length);
      if (e.key === "ArrowLeft") setImageIndex((i) => (i - 1 + gallery.length) % gallery.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, gallery.length]);

  const enquire = () =>
    toast.success("Request received", {
      description: `Our concierge will contact you about the ${car.year} ${car.brandName} ${car.name}.`,
    });

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pt-28 pb-10 lg:px-8">
      <Link
        to="/cars"
        className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase transition-colors hover:text-champagne-300"
      >
        <ArrowLeft className="size-3.5" /> Back to collection
      </Link>

      {/* header */}
      <header className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-display text-sm font-semibold tracking-[0.32em] text-champagne-400 uppercase">
            {car.brandName}
          </p>
          <h1 className="mt-2 font-display text-5xl font-black tracking-tight md:text-7xl">{car.name}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-zinc-400">
            <span>{car.year} model year</span>

            <span
              className="hidden h-1 w-1 rounded-full bg-zinc-600 sm:block"
              aria-hidden
            />

            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block size-3 rounded-full ring-1 ring-white/25"
                style={{ backgroundColor: displayedColorHex }}
                aria-hidden
              />

              {displayedColor}
            </span>
          </p>
          {variants.length > 0 && (
  <div className="mt-5">
    <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
      Available colours
    </p>

    <div className="flex flex-wrap items-center gap-3">
      {variants.map((variant) => {
        const selected =
          selectedVariant?.id === variant.id;

        return (
          <button
            key={variant.id}
            type="button"
            title={variant.colorName}
            aria-label={`Select ${variant.colorName}`}
            aria-pressed={selected}
            onClick={() => selectVariant(variant)}
            className={cn(
              "relative grid size-9 place-items-center rounded-full transition-all duration-300",
              selected
                ? "scale-110 ring-2 ring-champagne-300 ring-offset-2 ring-offset-obsidian-950"
                : "ring-1 ring-white/20 hover:scale-110 hover:ring-white/50",
            )}
          >
            <span
              className="size-full rounded-full border border-white/15"
              style={{
                backgroundColor: variant.colorHex,
              }}
            />

            {selected && (
              <span className="absolute -bottom-2 size-1 rounded-full bg-champagne-300" />
            )}
          </button>
        );
      })}
    </div>
  </div>
)}
        </div>
        <div className="lg:text-right">
          <p className="text-xs tracking-[0.2em] text-zinc-500 uppercase">Guide price</p>
          <p className="text-gradient-gold font-display text-4xl font-bold md:text-5xl">
            {formatPrice(car.price)}
          </p>
        </div>
      </header>

      {/* 3D studio */}
      <Reveal className="mt-9">
        <ModelViewer
          key={selectedVariant?.id ?? "default"}
          sketchfabUrl={selectedVariant ? null : car.sketchfabUrl}
          modelPath={displayedModel}
          color={displayedColorHex}
          colorName={displayedColor}
          className="aspect-[16/10] lg:aspect-[21/9]"
        />
      </Reveal>

      {/* description + quick specs */}
      <section className="mt-12 grid gap-10 lg:grid-cols-[1.5fr_1fr]" aria-label="Overview">
        <Reveal>
          <h2 className="font-display text-xs font-semibold tracking-[0.32em] text-champagne-400 uppercase">
            The story
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-zinc-300">{car.description}</p>

          {car.features.length > 0 && (
            <div className="mt-10">
              <h3 className="flex items-center gap-2 font-display text-sm font-semibold tracking-[0.24em] text-zinc-100 uppercase">
                <Sparkles className="size-4 text-champagne-400" /> Signature features
              </h3>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {car.features.map((feature) => (
                  <li
                    key={feature}
                    className="glass flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-zinc-300"
                  >
                    <CheckCircle2 className="size-4 shrink-0 text-champagne-400" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Reveal>

        <Reveal delay={0.1}>
          <aside className="glass sticky top-24 h-fit rounded-3xl p-6">
            <p className="text-xs font-semibold tracking-[0.24em] text-zinc-500 uppercase">At a glance</p>
            <dl className="mt-4 space-y-4">
              {[
                ["Marque", car.brandName],
                ["Model year", String(car.year)],
                ["Paint", displayedColor],
                ["Power", car.specs.horsepower ? `${car.specs.horsepower} hp` : "—"],
                ["0–60 mph", car.specs.acceleration ? `${car.specs.acceleration.toFixed(1)} seconds` : "—"],
                ["Top speed", car.specs.topSpeed ? `${car.specs.topSpeed} mph` : "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-white/[0.06] pb-3.5 text-sm last:border-0 last:pb-0">
                  <dt className="text-zinc-500">{label}</dt>
                  <dd className="font-semibold text-zinc-100">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 space-y-3">

  <Link
    to={`/cars/${car.id}/test-drive`}
    className="group flex w-full items-center justify-center gap-2 rounded-full bg-champagne-400 px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-obsidian-950 uppercase transition-all hover:bg-champagne-300 hover:shadow-[0_0_36px_-8px_rgba(217,185,129,0.6)]"
  >
    Book Test Drive
    <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" />
  </Link>

  <button
    type="button"
    onClick={enquire}
    className="group flex w-full items-center justify-center gap-2 rounded-full border border-champagne-400/40 px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-champagne-300 uppercase transition-all hover:bg-champagne-400/10"
  >
    Enquire Now
    <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" />
  </button>

</div>
            <button
              type="button"
              onClick={share}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/10 px-6 py-3 text-xs font-semibold tracking-[0.16em] text-zinc-400 uppercase transition-colors hover:border-white/30 hover:text-zinc-200"
            >
              <Share2 className="size-3.5" /> Share this machine
            </button>
          </aside>
        </Reveal>
      </section>

      {/* specifications */}
      <section className="mt-16" aria-labelledby="specs">
        <Reveal>
          <h2 id="specs" className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Technical <span className="font-accent text-gradient-gold font-normal italic">specifications</span>
          </h2>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {specDefs
            .filter((s) => car.specs[s.key] !== undefined)
            .map((s, i) => (
              <Reveal key={s.key} delay={i * 0.05}>
                <div className="group rounded-2xl border border-white/[0.07] bg-obsidian-900 p-5 transition-colors hover:border-champagne-400/30">
                  <s.icon className="size-5 text-champagne-400" strokeWidth={1.5} aria-hidden />
                  <p className="mt-4 font-display text-xl font-bold break-words text-zinc-50 md:text-2xl">
                    {s.format(car.specs[s.key] as number | string)}
                  </p>
                  <p className="mt-1 text-[11px] font-medium tracking-[0.18em] text-zinc-500 uppercase">
                    {s.label}
                  </p>
                </div>
              </Reveal>
            ))}
        </div>
      </section>

      {/* gallery */}
      <section className="mt-16" aria-labelledby="gallery">
        <Reveal>
          <h2 id="gallery" className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            The <span className="font-accent text-gradient-gold font-normal italic">gallery</span>
          </h2>
        </Reveal>
        <Reveal delay={0.08} className="mt-8">
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="group relative block w-full overflow-hidden rounded-3xl border border-white/10"
            aria-label="Open gallery lightbox"
          >
            <img
              src={gallery[imageIndex]}
              alt={`${car.brandName} ${car.name} — photo ${imageIndex + 1}`}
              className="aspect-[16/8] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <span className="glass absolute right-4 bottom-4 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest text-zinc-200">
              {imageIndex + 1} / {gallery.length}
            </span>
          </button>
          <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {gallery.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setImageIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-pressed={i === imageIndex}
                className={cn(
                  "overflow-hidden rounded-xl border-2 transition-all",
                  i === imageIndex ? "border-champagne-400" : "border-transparent opacity-60 hover:opacity-100",
                )}
              >
                <img src={src} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </Reveal>
      </section>

      {/* related */}
      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related">
          <Reveal>
            <h2 id="related" className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              More from <span className="font-accent text-gradient-gold font-normal italic">{car.brandName}</span>
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r, i) => (
              <CarCard key={r.id} car={r} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={`${car.brandName} ${car.name} gallery`}
            className="fixed inset-0 z-[80] grid place-items-center bg-obsidian-950/95 p-4 backdrop-blur-md"
            onClick={() => setLightbox(false)}
          >
            <button
              type="button"
              className="glass absolute top-5 right-5 grid size-11 place-items-center rounded-full text-zinc-200 hover:text-champagne-300"
              onClick={() => setLightbox(false)}
              aria-label="Close lightbox"
            >
              <X className="size-5" />
            </button>
            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  className="glass absolute left-5 z-10 grid size-11 place-items-center rounded-full text-zinc-200 hover:text-champagne-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageIndex((i) => (i - 1 + gallery.length) % gallery.length);
                  }}
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  className="glass absolute right-5 z-10 grid size-11 place-items-center rounded-full text-zinc-200 hover:text-champagne-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageIndex((i) => (i + 1) % gallery.length);
                  }}
                  aria-label="Next photo"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
            <motion.img
              key={gallery[imageIndex]}
              src={gallery[imageIndex]}
              alt={`${car.brandName} ${car.name} — photo ${imageIndex + 1}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="max-h-[86vh] max-w-full rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
