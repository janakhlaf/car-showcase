import { Award, FileCheck, Globe2 } from "lucide-react";
import { Reveal } from "@/components/reveal";

const values = [
  {
    icon: Award,
    title: "Concierge Authentication",
    text: "Every vehicle is inspected, verified and certified by our master technicians before entering the collection.",
  },
  {
    icon: FileCheck,
    title: "Complete Provenance",
    text: "Full documented history, service records and originality reports accompany each machine.",
  },
  {
    icon: Globe2,
    title: "Global Delivery",
    text: "Enclosed transport, customs handling and white-glove handover anywhere in the world.",
  },
];

export function Editorial() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8" aria-labelledby="craft">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-white/10">
              <img
                src="https://images.pexels.com/photos/12959473/pexels-photo-12959473.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200"
                alt="Hand-stitched leather dashboard of a luxury grand tourer"
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-[1.04]"
              />
            </div>
            <div className="glass-strong absolute -right-4 -bottom-6 hidden rounded-2xl px-6 py-5 sm:block">
              <p className="font-display text-3xl font-bold text-champagne-300">120+</p>
              <p className="mt-1 text-[11px] tracking-[0.2em] text-zinc-400 uppercase">Point certification</p>
            </div>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="font-display text-xs font-semibold tracking-[0.32em] text-champagne-400 uppercase">
              The Veloce Standard
            </p>
            <h2 id="craft" className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
              Obsessive curation,{" "}
              <span className="font-accent text-gradient-gold font-normal italic">uncompromising</span> care
            </h2>
          </Reveal>

          <div className="mt-10 space-y-8">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={0.08 * (i + 1)}>
                <div className="flex gap-5">
                  <span className="mt-1 grid size-11 shrink-0 place-items-center rounded-xl border border-champagne-400/25 bg-champagne-400/10 text-champagne-300">
                    <v.icon className="size-5" strokeWidth={1.5} />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-zinc-100">{v.title}</h3>
                    <p className="mt-1.5 max-w-md leading-relaxed text-zinc-500">{v.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
