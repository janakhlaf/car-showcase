import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight } from "lucide-react";
import axios from "@/services/api";
import type { CarWithBrand } from "@/db/schema";
import { Hero3D } from "@/components/home/hero-3d";
import { Stats } from "@/components/home/stats";
import { Experience3D } from "@/components/home/experience-3d";
import { BrandMarquee } from "@/components/home/marquee";
import { Editorial } from "@/components/home/editorial";
import { Reveal } from "@/components/reveal";
import { CarCard } from "@/components/cars/car-card";


const fallbackHeroCar: CarWithBrand = {
  id: 1,
  name: "Huracán Tecnica",
  brandId: 1,
  brandName: "Lamborghini",
  year: 2024,
  price: 249865,
  color: "Arancio Xanto",
  colorHex: "#d95d24",
  description:
    "A cinematic supercar experience rendered in an interactive studio.",
  thumbnail: "",
  images: [],
  sketchfabUrl: null,
  modelPath: null,
  featured: true,
  specs: {
    horsepower: 630,
    topSpeed: 202,
    acceleration: 3.2,
    engine: "5.2L naturally aspirated V10",
    transmission: "7-speed dual clutch",
    drivetrain: "RWD",
    weight: 3040,
    seats: 2,
  },
  features: [
    "Adaptive matrix LED headlights",
    "Carbon ceramic brakes",
    "Performance driving modes",
  ],
  createdAt: new Date().toISOString(),
};

export function HomePage() {
  const [featured, setFeatured] = useState<CarWithBrand[]>([]);
  const [heroCar, setHeroCar] =
    useState<CarWithBrand | null>(null);

  const [stats, setStats] = useState({
    carCount: 0,
    brandCount: 0,
    totalHorsepower: 0,
    paintShades: 0,
  });

  useEffect(() => {
    async function loadHomeData() {
      try {
        const [
  carsResponse,
  statsResponse,
  settingsResponse,
] = await Promise.all([
  axios.get("/api/cars", {
    params: {
      featured: 1,
      limit: 3,
    },
  }),

  axios.get("/api/stats"),

  axios.get("/api/site-settings"),
]);
        const cars =
          carsResponse.data?.data ??
          carsResponse.data?.cars ??
          carsResponse.data ??
          [];

        const statsData =
          statsResponse.data?.data ??
          statsResponse.data ??
          {};

          const heroCarId =
  settingsResponse.data?.data?.heroCarId ??
  null;

        if (Array.isArray(cars)) {
          setFeatured(cars);
        }

        if (heroCarId) {
  const heroResponse =
    await axios.get(
      `/api/cars/${heroCarId}`
    );

  const selectedHero =
    heroResponse.data?.data ??
    null;

  setHeroCar(selectedHero);
}

        setStats({
          carCount: Number(statsData.carCount ?? 0),
          brandCount: Number(statsData.brandCount ?? 0),
          totalHorsepower: Number(statsData.totalHorsepower ?? 0),
          paintShades: Number(statsData.paintShades ?? 0),
        });
      } catch (error) {
        console.error("Failed to load homepage data:", error);
      }
    }

    loadHomeData();
  }, []);

  const displayedHeroCar =
  heroCar ??
  featured[0] ??
  fallbackHeroCar;

  const paints =
    featured.length > 0
      ? featured.map((car) => ({
          name: car.name,
          color: car.color,
          hex: car.colorHex,
        }))
      : [
          {
            name: fallbackHeroCar.name,
            color: fallbackHeroCar.color,
            hex: fallbackHeroCar.colorHex,
          },
        ];

  return (
    <>
      {/* يبقى موجودًا دائمًا حتى لو قاعدة البيانات لم تعمل */}
      <Hero3D car={displayedHeroCar} />

      <section
        className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-5 pb-4 lg:px-8"
        aria-label="Showroom at a glance"
      >
        <Stats stats={stats} />
      </section>

      <BrandMarquee />

      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <Reveal>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-display text-xs font-semibold tracking-[0.32em] text-champagne-400 uppercase">
                The Collection
              </p>

              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
                Featured{" "}
                <span className="font-accent text-gradient-gold font-normal italic">
                  machines
                </span>
              </h2>
            </div>

            <Link
              to="/cars"
              className="group inline-flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-zinc-400 uppercase transition-colors hover:text-champagne-300"
            >
              View full collection
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((car, index) => (
            <CarCard key={car.id} car={car} index={index} />
          ))}
        </div>
      </section>

      <Experience3D paints={paints} />

      <Editorial />

      <section className="relative mx-auto max-w-7xl px-5 pb-8 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-white/10">
            <img
              src="https://images.pexels.com/photos/6046594/pexels-photo-6046594.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200"
              alt="City streets at night through a windshield"
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-obsidian-950/95 via-obsidian-950/70 to-obsidian-950/30" />

            <div className="relative px-8 py-20 md:px-14 md:py-28">
              <p className="font-display text-xs font-semibold tracking-[0.32em] text-champagne-400 uppercase">
                Private viewings
              </p>

              <h2 className="mt-4 max-w-xl font-display text-4xl font-bold tracking-tight md:text-6xl">
                Your garage awaits.
              </h2>

              <p className="mt-4 max-w-md text-zinc-400">
                Every machine can be inspected in interactive 3D.
              </p>

              <Link
                to="/cars"
                className="group mt-9 inline-flex items-center gap-3 rounded-full bg-champagne-400 px-7 py-3.5 text-sm font-bold tracking-[0.14em] text-obsidian-950 uppercase"
              >
                Browse the collection
                <ChevronRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}