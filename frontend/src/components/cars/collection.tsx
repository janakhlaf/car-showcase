

/**
 * Collection — live search & faceted filtering against GET /api/cars.
 * Debounced queries, abort handling, skeleton loading and toast errors.
 */
import { useEffect, useMemo, useState } from "react";
import axios from "@/services/api";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownUp, Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import type { CarWithBrand } from "@/db/schema";
import { cn, formatPrice } from "@/lib/utils";
import { CarCard } from "./car-card";

interface Meta {
  colors: Array<{ color: string; colorHex: string }>;
  years: number[];
  price: { min: number; max: number };
  brands: Array<{ id: number; name: string }>;
}

interface Filters {
  search: string;
  brand: string;
  color: string;
  minPrice: string;
  maxPrice: string;
  year: string;
}

const EMPTY: Filters = { search: "", brand: "", color: "", minPrice: "", maxPrice: "", year: "" };

const selectCls =
  "w-full rounded-xl border border-white/10 bg-obsidian-900/80 px-4 py-2.5 text-sm text-zinc-200 outline-none transition-colors focus:border-champagne-400/60";

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
      <div className="shimmer aspect-[16/10]" />
      <div className="space-y-3 p-5">
        <div className="shimmer h-5 w-2/3 rounded-md" />
        <div className="shimmer h-4 w-1/3 rounded-md" />
        <div className="shimmer h-4 w-full rounded-md" />
      </div>
    </div>
  );
}

export function Collection() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState("newest");
  const [cars, setCars] = useState<CarWithBrand[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    axios
      .get<{ data: Meta }>("/api/cars/meta")
      .then((res) => setMeta(res.data.data))
      .catch(() => toast.error("Could not load filter options"));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (filters.search.trim()) params.set("search", filters.search.trim());
        if (filters.brand) params.set("brand", filters.brand);
        if (filters.color) params.set("color", filters.color);
        if (filters.minPrice) params.set("minPrice", filters.minPrice);
        if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
        if (filters.year) params.set("year", filters.year);
        params.set("sort", sort);
        const res = await axios.get<{ data: CarWithBrand[]; count: number }>(
          "/api/cars",
          {
            params: Object.fromEntries(params),
            signal: controller.signal,
          }
        );
        setCars(res.data.data);
        setCount(res.data.count);
      } catch (error) {
        if (!axios.isCancel(error)) toast.error("Could not load the collection");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 320);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filters, sort]);

  const activeCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );

  const set = (key: keyof Filters) => (value: string) => setFilters((f) => ({ ...f, [key]: value }));

  return (
    <div className="mt-10">
      {/* ── Filter panel ─────────────────────────────────────────── */}
      <div className="glass rounded-3xl p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => set("search")(e.target.value)}
              placeholder="Search machines — try “GT” or “Huracán”…"
              aria-label="Search cars by name"
              className="w-full rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-champagne-400/60"
            />
          </label>

          <div className="flex items-center gap-3">
            <label className="relative min-w-44 flex-1 lg:flex-none">
              <ArrowDownUp className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-zinc-500" aria-hidden />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort results"
                className={cn(selectCls, "appearance-none pl-10")}
              >
                <option value="newest">Featured first</option>
                <option value="price-asc">Price · low to high</option>
                <option value="price-desc">Price · high to low</option>
                <option value="year-desc">Newest model year</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              aria-expanded={panelOpen}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors lg:hidden",
                panelOpen ? "border-champagne-400/50 text-champagne-300" : "border-white/10 text-zinc-300",
              )}
            >
              <SlidersHorizontal className="size-4" />
              Filters
              {activeCount > 0 && (
                <span className="grid size-5 place-items-center rounded-full bg-champagne-400 text-[11px] font-bold text-obsidian-950">
                  {activeCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className={cn("mt-5 grid-cols-1 gap-5 md:grid-cols-3", panelOpen ? "grid" : "hidden lg:grid")}>
          {/* brand pills */}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Marque</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => set("brand")("")}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  !filters.brand
                    ? "border-champagne-400/60 bg-champagne-400/15 text-champagne-300"
                    : "border-white/10 text-zinc-400 hover:border-white/30",
                )}
              >
                All
              </button>
              {meta?.brands.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => set("brand")(filters.brand === String(b.id) ? "" : String(b.id))}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                    filters.brand === String(b.id)
                      ? "border-champagne-400/60 bg-champagne-400/15 text-champagne-300"
                      : "border-white/10 text-zinc-400 hover:border-white/30",
                  )}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* colour swatches */}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Paint</p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {(meta?.colors ?? []).map((c) => (
                <button
                  key={c.color}
                  type="button"
                  title={c.color}
                  aria-label={`Filter by ${c.color}`}
                  aria-pressed={filters.color === c.color}
                  onClick={() => set("color")(filters.color === c.color ? "" : c.color)}
                  className={cn(
                    "size-8 rounded-full border-2 transition-all",
                    filters.color === c.color
                      ? "scale-110 border-champagne-300 shadow-[0_0_18px_-2px_rgba(217,185,129,0.7)]"
                      : "border-white/15 hover:border-white/40",
                  )}
                  style={{ backgroundColor: c.colorHex }}
                />
              ))}
              {filters.color && (
                <button
                  type="button"
                  onClick={() => set("color")("")}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 text-xs text-zinc-400 hover:border-white/30"
                >
                  <X className="size-3" /> {filters.color}
                </button>
              )}
            </div>
          </div>

          {/* price + year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Min price</p>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={filters.minPrice}
                onChange={(e) => set("minPrice")(e.target.value)}
                placeholder={meta ? formatPrice(meta.price.min) : "0"}
                aria-label="Minimum price"
                className={cn(selectCls, "mt-2.5")}
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Max price</p>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={filters.maxPrice}
                onChange={(e) => set("maxPrice")(e.target.value)}
                placeholder={meta ? formatPrice(meta.price.max) : "Any"}
                aria-label="Maximum price"
                className={cn(selectCls, "mt-2.5")}
              />
            </div>
            <div className="col-span-2">
              <p className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Model year</p>
              <select
                value={filters.year}
                onChange={(e) => set("year")(e.target.value)}
                aria-label="Model year"
                className={cn(selectCls, "mt-2.5 appearance-none")}
              >
                <option value="">Any year</option>
                {meta?.years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {activeCount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
                <p className="text-xs text-zinc-500">
                  {activeCount} filter{activeCount > 1 ? "s" : ""} active · {count} match{count === 1 ? "" : "es"}
                </p>
                <button
                  type="button"
                  onClick={() => setFilters(EMPTY)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.14em] text-champagne-400 uppercase hover:text-champagne-300"
                >
                  <X className="size-3.5" /> Clear all
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Results ─────────────────────────────────────────────── */}
      <p className="mt-8 text-xs font-semibold tracking-[0.24em] text-zinc-500 uppercase" aria-live="polite">
        {loading ? "Curating…" : `${count} machine${count === 1 ? "" : "s"}`}
      </p>

      {loading ? (
        <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : cars.length === 0 ? (
        <div className="mt-5 grid place-items-center rounded-3xl border border-dashed border-white/10 py-24 text-center">
          <span className="grid size-14 place-items-center rounded-2xl border border-white/10 text-zinc-500">
            <SearchX className="size-6" />
          </span>
          <h2 className="mt-5 font-display text-xl font-semibold text-zinc-200">No machines match your criteria</h2>
          <p className="mt-2 max-w-sm text-sm text-zinc-500">
            Adjust your filters or clear them to explore the full collection.
          </p>
          <button
            type="button"
            onClick={() => setFilters(EMPTY)}
            className="mt-6 rounded-full border border-champagne-400/50 px-6 py-2.5 text-xs font-bold tracking-[0.16em] text-champagne-300 uppercase transition-colors hover:bg-champagne-400 hover:text-obsidian-950"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((car, i) => (
            <CarCard key={car.id} car={car} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
