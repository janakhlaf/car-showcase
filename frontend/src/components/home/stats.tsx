

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import type { ShowroomStats } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

function Counter({ value, duration = 1.9 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduce]);

  return (
    <span ref={ref} className="tabular-nums">
      {formatNumber(display)}
    </span>
  );
}

export function Stats({ stats }: { stats: ShowroomStats }) {
  const items = [
    { value: stats.carCount, label: "Curated machines", suffix: "" },
    { value: stats.brandCount, label: "Marques represented", suffix: "" },
    { value: stats.totalHorsepower, label: "Combined horsepower", suffix: "" },
    { value: stats.paintShades, label: "Factory paint shades", suffix: "" },
  ];
  return (
    <dl className="glass grid grid-cols-2 gap-px overflow-hidden rounded-2xl lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-obsidian-950/40 px-6 py-5">
          <dd className="font-display text-3xl font-bold text-zinc-50 md:text-4xl">
            <Counter value={item.value} />
            {item.suffix}
          </dd>
          <dt className="mt-1 text-[11px] font-medium tracking-[0.2em] text-zinc-500 uppercase">
            {item.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}
