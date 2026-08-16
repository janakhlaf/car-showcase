import { Award, FileCheck, Globe2 } from "lucide-react";
import { Reveal } from "@/components/reveal";
export interface EditorialContent {
  eyebrow: string;
  titleBefore: string;
  titleAccent: string;
  titleAfter: string;

  imageUrl: string;
  certificationNumber: string;
  certificationLabel: string;

  item1Title: string;
  item1Text: string;

  item2Title: string;
  item2Text: string;

  item3Title: string;
  item3Text: string;
}



export function Editorial({
  content,
}: {
  content: EditorialContent;
}) {
  const values = [
  {
    icon: Award,
    title: content.item1Title,
    text: content.item1Text,
  },
  {
    icon: FileCheck,
    title: content.item2Title,
    text: content.item2Text,
  },
  {
    icon: Globe2,
    title: content.item3Title,
    text: content.item3Text,
  },
];
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8" aria-labelledby="craft">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-white/10">
              <img
                src={content.imageUrl}
                alt="Hand-stitched leather dashboard of a luxury grand tourer"
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-[1.04]"
              />
            </div>
            <div className="glass-strong absolute -right-4 -bottom-6 hidden rounded-2xl px-6 py-5 sm:block">
              <p className="font-display text-3xl font-bold text-champagne-300">
  {content.certificationNumber}
</p>

<p className="mt-1 text-[11px] tracking-[0.2em] text-zinc-400 uppercase">
  {content.certificationLabel}
</p>
            </div>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="font-display text-xs font-semibold tracking-[0.32em] text-champagne-400 uppercase">
  {content.eyebrow}
</p>
            <h2 id="craft" className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
  {content.titleBefore}{" "}
  <span className="font-accent text-gradient-gold font-normal italic">
    {content.titleAccent}
  </span>{" "}
  {content.titleAfter}
</h2>
          </Reveal>

          <div className="mt-10 space-y-8">
            {values.map((v, i) => (
  <Reveal key={i} delay={0.08 * (i + 1)}>
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
