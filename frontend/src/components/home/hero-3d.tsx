/**
 * Hero3D — full-viewport cinematic landing experience.
 *
 *   · 210vh scroll choreography around a sticky WebGL stage
 *   · cursor parallax on BOTH the camera (canvas) and the copy (DOM springs)
 *   · animated champagne/steel gradient layers drifting behind the car
 *   · floating typography that hands off to a "close-up" copy phase mid-scroll
 *   · interactive hotspot panels fed by the vehicle's real DB data
 *   · lazy-loaded canvas with a branded "igniting studio" veil
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowUpRight,
  Armchair,
  ChevronDown,
  Circle,
  Cog,
  Gauge,
  Lightbulb,
  Orbit,
  Palette,
  X,
  Zap,
} from "lucide-react";
import type { CarWithBrand } from "@/db/schema";
import { formatPrice } from "@/lib/utils";
import type { HotspotId } from "./hero-canvas";

import HeroCanvas from "./hero-canvas";

const ease = [0.22, 1, 0.36, 1] as const;

/* ── Hotspot info panels (fed by live vehicle data) ───────────────────── */
function HotspotPanel({ id, car, onClose }: { id: HotspotId; car: CarWithBrand; onClose: () => void }) {
  const interiorImage = car.images[2] ?? car.thumbnail;
  const content: Record<HotspotId, { icon: ReactNode; kicker: string; title: string; body: ReactNode }> = {
    headlights: {
      icon: <Lightbulb className="size-4" strokeWidth={1.75} />,
      kicker: "Exterior",
      title: "Blade Matrix Lighting",
      body: (
        <ul className="mt-3 space-y-2 text-sm text-zinc-400">
          {(car.features.length ? car.features.slice(0, 3) : ["Adaptive matrix LED blade DRLs"])
            .map((f) => (
              <li key={f} className="flex gap-2.5">
                <span className="mt-[7px] h-px w-4 shrink-0 bg-champagne-400/70" aria-hidden />
                {f}
              </li>
            ))}
        </ul>
      ),
    },
    wheels: {
      icon: <Circle className="size-4" strokeWidth={1.75} />,
      kicker: "Chassis",
      title: "Wheel & Drive Specifications",
      body: (
        <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
          {[
            { icon: Zap, label: "Power", value: car.specs.horsepower ? `${car.specs.horsepower} hp` : "—" },
            { icon: Gauge, label: "Top speed", value: car.specs.topSpeed ? `${car.specs.topSpeed} mph` : "—" },
            { icon: Cog, label: "Gearbox", value: car.specs.transmission ?? "—" },
            { icon: Circle, label: "Drive", value: car.specs.drivetrain ?? "—" },
          ].map((row) => (
            <div key={row.label}>
              <dt className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">
                <row.icon className="size-3 text-champagne-400" /> {row.label}
              </dt>
              <dd className="mt-1 font-semibold break-words text-zinc-100">{row.value}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    interior: {
      icon: <Armchair className="size-4" strokeWidth={1.75} />,
      kicker: "Cabin",
      title: "The Cockpit",
      body: (
        <div className="mt-3">
          <img
            src={interiorImage}
            alt={`${car.brandName} ${car.name} interior`}
            className="h-32 w-full rounded-xl border border-white/10 object-cover"
            loading="lazy"
          />
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-400">{car.description}</p>
          <p className="mt-2 text-xs tracking-[0.18em] text-zinc-500 uppercase">
            {car.specs.seats ?? 2} seats · hand-finished cabin
          </p>
        </div>
      ),
    },
  };

  const item = content[id];
  return (
    <motion.aside
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.97 }}
      transition={{ duration: 0.35, ease }}
      className="glass-strong pointer-events-auto w-full max-w-sm rounded-2xl p-5"
      role="dialog"
      aria-label={item.title}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-champagne-400/30 bg-champagne-400/10 text-champagne-300">
            {item.icon}
          </span>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.24em] text-champagne-400 uppercase">{item.kicker}</p>
            <h3 className="font-display text-base font-bold text-zinc-50">{item.title}</h3>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="grid size-7 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
        >
          <X className="size-3.5" />
        </button>
      </div>
      {item.body}
    </motion.aside>
  );
}

/* ── Floating copy blocks ─────────────────────────────────────────────── */
function IntroCopy({ car, onView360, visible }: { car: CarWithBrand; onView360: () => void; visible: boolean }) {
  return (
    <motion.div
      initial={false}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: -50 }}
      transition={{ duration: 0.55, ease }}
      className="max-w-2xl"
      aria-hidden={!visible}
    >
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5, ease }}
        className="flex items-center gap-3 font-display text-[11px] font-semibold tracking-[0.34em] text-champagne-400 uppercase md:text-xs"
      >
        <span className="hairline w-10" aria-hidden />
        Live 3D · The Signature Series
      </motion.p>

      <h1 className="mt-4">
        <motion.span
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.62, ease }}
          className="block font-display text-sm font-bold tracking-[0.5em] text-zinc-400 uppercase md:text-lg"
        >
          {car.brandName}
        </motion.span>
        <motion.span
          initial={{ opacity: 0, y: 46 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.74, ease }}
          className="mt-1 block font-display text-[15vw] leading-[0.92] font-black tracking-[-0.02em] uppercase sm:text-7xl md:text-8xl lg:text-[6.5rem]"
        >
          {car.name}
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, -7, 0] }}
          transition={{
            opacity: { delay: 1.05, duration: 0.8 },
            y: { delay: 1.6, repeat: Infinity, duration: 5.5, ease: "easeInOut" },
          }}
          className="font-accent text-gradient-gold mt-2 inline-block text-2xl font-normal italic md:text-4xl"
        >
          finished in {car.color}
        </motion.span>
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.05, ease }}
        className="mt-5 max-w-md text-sm leading-relaxed text-zinc-400 md:text-base"
      >
        Rendered live in true factory paint. Move your cursor to orbit the studio —
        scroll for the cinematic close-up, and touch the glowing markers to explore.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2, ease }}
        className="pointer-events-auto mt-8 flex flex-wrap items-center gap-3.5"
      >
        <Link
          to={`/cars/${car.id}`}
          className="group inline-flex items-center gap-2 rounded-full bg-champagne-400 px-6 py-3 text-[13px] font-bold tracking-[0.14em] text-obsidian-950 uppercase transition-all hover:bg-champagne-300 hover:shadow-[0_0_40px_-8px_rgba(217,185,129,0.65)]"
        >
          Explore model
          <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" />
        </Link>
        <a
          href="#experience"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-[13px] font-semibold tracking-[0.14em] text-zinc-200 uppercase backdrop-blur-sm transition-colors hover:border-champagne-400/50 hover:text-champagne-300"
        >
          <Palette className="size-4" />
          Configure car
        </a>
        <button
          type="button"
          onClick={onView360}
          className="inline-flex items-center gap-2 rounded-full border border-champagne-400/35 bg-champagne-400/10 px-6 py-3 text-[13px] font-semibold tracking-[0.14em] text-champagne-300 uppercase backdrop-blur-sm transition-colors hover:bg-champagne-400/20"
        >
          <Orbit className="size-4" />
          View 360°
        </button>
      </motion.div>
    </motion.div>
  );
}

function CloseupCopy({ car, visible }: { car: CarWithBrand; visible: boolean }) {
  return (
    <motion.div
      initial={false}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.55, ease }}
      className="max-w-lg"
      aria-hidden={!visible}
    >
      <p className="font-display text-[11px] font-semibold tracking-[0.34em] text-champagne-400 uppercase">
        The close-up
      </p>
      <h2 className="mt-3 font-display text-4xl font-black tracking-tight md:text-5xl">
        Closer than <span className="font-accent text-gradient-gold font-normal italic">ever.</span>
      </h2>
      <div className="pointer-events-auto mt-6 flex flex-wrap gap-2.5">
        {[
          car.specs.horsepower ? `${car.specs.horsepower} hp` : null,
          car.specs.acceleration ? `${car.specs.acceleration.toFixed(1)}s · 0–60` : null,
          formatPrice(car.price),
        ]
          .filter(Boolean)
          .map((chip) => (
            <span key={chip} className="glass rounded-full px-4 py-2 text-xs font-semibold tracking-[0.14em] text-zinc-300 uppercase">
              {chip}
            </span>
          ))}
      </div>
      <Link
        to={`/cars/${car.id}`}
        className="pointer-events-auto mt-5 inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-champagne-300 uppercase transition-colors hover:text-champagne-200"
      >
        Full dossier <ArrowUpRight className="size-3.5" />
      </Link>
    </motion.div>
  );
}

/* ── Main hero ────────────────────────────────────────────────────────── */
export function Hero3D({ car }: { car: CarWithBrand }) {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const reduced = useReducedMotion() ?? false;

  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<0 | 1>(0);
  const [spinning, setSpinning] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<HotspotId | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse), (max-width: 768px)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progressRef.current = v;
    setPhase(v > 0.52 ? 1 : 0);
    if (v > 0.08) setSpinning(false);
  });

  // DOM parallax springs (mirrors the camera rig for layered depth)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const springX = useSpring(mx, { stiffness: 55, damping: 16, mass: 0.6 });
  const springY = useSpring(my, { stiffness: 55, damping: 16, mass: 0.6 });
  const copyX = useTransform(springX, (v) => v * 16);
  const copyY = useTransform(springY, (v) => v * 11);
  const glowX = useTransform(springX, (v) => v * -30);
  const glowY = useTransform(springY, (v) => v * -22);
  const progressBar = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (coarse || reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    mouseRef.current = { x, y };
    mx.set(x);
    my.set(y);
  }

  function view360() {
    setSpinning(true);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section
      ref={sectionRef}
      className="relative h-[210vh]"
      aria-label={`Interactive 3D presentation of the ${car.year} ${car.brandName} ${car.name}`}
    >
      <div className="sticky top-0 h-screen overflow-hidden" onPointerMove={onPointerMove}>
        {/* animated gradient atmosphere */}
        <div className="absolute inset-0" aria-hidden>
          <motion.div
            style={{ x: glowX, y: glowY }}
            className="animate-drift absolute -top-[20%] right-[-10%] h-[65vh] w-[65vh] rounded-full opacity-20 blur-[130px]"
            // paint-tinted studio glow follows the car's true colour
            data-glow
          >
            <div className="h-full w-full rounded-full" style={{ backgroundColor: car.colorHex }} />
          </motion.div>
          <div className="animate-drift absolute bottom-[-25%] left-[-12%] h-[70vh] w-[70vh] rounded-full bg-champagne-500/10 blur-[150px] [animation-delay:-9s]" />
          <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_100%,rgba(5,5,7,0)_0%,rgba(5,5,7,0.55)_70%,rgba(5,5,7,0.95)_100%)]" />
        </div>

        {/* WebGL stage (lazy, client-only) */}
        <div className="absolute inset-0">
          <HeroCanvas
            car={car}
            progress={progressRef}
            mouse={mouseRef}
            spinning={spinning}
            coarse={coarse}
            reduced={reduced}
            activeHotspot={activeHotspot}
            onHotspot={setActiveHotspot}
            onCreated={() => setReady(true)}
          />
        </div>

        {/* copy + chrome — parallax layer */}
        <motion.div
          style={reduced ? undefined : { x: copyX, y: copyY }}
          className="pointer-events-none absolute inset-0 flex flex-col justify-center px-6 pt-14 md:px-12 lg:px-20"
        >
          <IntroCopy car={car} onView360={view360} visible={phase === 0} />
          <div className="absolute bottom-24 left-6 md:bottom-16 md:left-12 lg:left-20">
            <CloseupCopy car={car} visible={phase === 1} />
          </div>
        </motion.div>

        {/* top-right live badge */}
        <div className="glass pointer-events-none absolute top-24 right-6 flex items-center gap-2.5 rounded-full px-4 py-2 md:right-12">
          <span className="size-2.5 rounded-full ring-2 ring-white/20" style={{ backgroundColor: car.colorHex }} aria-hidden />
          <span className="text-[10px] font-semibold tracking-[0.22em] text-zinc-300 uppercase">
            {car.color} · {formatPrice(car.price)}
          </span>
          <span className="animate-pulse-slow size-1.5 rounded-full bg-champagne-400" aria-hidden />
        </div>

        {/* hotspot panel */}
        <div className="pointer-events-none absolute right-6 bottom-24 z-20 flex w-[calc(100%-3rem)] max-w-sm justify-end md:right-12 md:bottom-16">
          <AnimatePresence mode="wait">
            {activeHotspot && (
              <HotspotPanel key={activeHotspot} id={activeHotspot} car={car} onClose={() => setActiveHotspot(null)} />
            )}
          </AnimatePresence>
        </div>

        {/* scroll cue + progress */}
        <motion.div
          style={{ opacity: cueOpacity }}
          className="pointer-events-none absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3"
        >
          <p className="text-[10px] font-semibold tracking-[0.3em] text-zinc-500 uppercase">
            Scroll · cinematic zoom
          </p>
          <div className="relative h-10 w-px overflow-hidden bg-white/10">
            <motion.span
              style={{ scaleY: progressBar }}
              className="absolute inset-0 origin-top bg-champagne-400"
              aria-hidden
            />
          </div>
          <motion.span animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
            <ChevronDown className="size-4 text-champagne-400" />
          </motion.span>
        </motion.div>

        {/* branded startup veil */}
        <AnimatePresence>
          {!ready && (
            <motion.div
              key="veil"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease }}
              className="absolute inset-0 z-30 grid place-items-center bg-obsidian-950"
            >
              <div className="flex flex-col items-center gap-5">
                <span className="grid size-14 place-items-center rounded-2xl border border-champagne-400/40 bg-champagne-400/10 text-champagne-300">
                  <Gauge className="size-6 animate-pulse" strokeWidth={1.5} />
                </span>
                <p className="font-display text-xs font-semibold tracking-[0.4em] text-zinc-400 uppercase">
                  Igniting the studio
                </p>
                <div className="shimmer h-0.5 w-44 rounded-full" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
