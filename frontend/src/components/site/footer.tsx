import { Link } from "react-router-dom";
import { Gauge, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/5">
      <div className="hairline absolute inset-x-0 top-0" />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl border border-champagne-400/40 bg-champagne-400/10 text-champagne-300">
              <Gauge className="size-4.5" strokeWidth={1.75} />
            </span>
            <span className="font-display text-lg font-semibold tracking-[0.32em] uppercase">Veloce</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500">
            A private showroom for the world&apos;s most coveted performance machines — inspected,
            authenticated, and presented in interactive 3D, finished in true factory paint.
          </p>
        </div>

        <nav aria-label="Footer" className="text-sm">
          <p className="font-display text-xs font-semibold tracking-[0.28em] text-champagne-400 uppercase">Explore</p>
          <ul className="mt-4 space-y-2.5 text-zinc-400">
            <li><Link className="transition-colors hover:text-champagne-300" to="/">Showroom</Link></li>
            <li><Link className="transition-colors hover:text-champagne-300" to="/cars">Full Collection</Link></li>
            <li>
              <Link className="inline-flex items-center gap-1.5 transition-colors hover:text-champagne-300" to="/admin">
                <ShieldCheck className="size-3.5" /> Admin Dashboard
              </Link>
            </li>
          </ul>
        </nav>

        <div className="text-sm">
          <p className="font-display text-xs font-semibold tracking-[0.28em] text-champagne-400 uppercase">Atelier</p>
          <ul className="mt-4 space-y-2.5 text-zinc-400">
            <li>12 Meridian Row, Mayfair</li>
            <li>London W1K 4QF</li>
            <li>concierge@veloce.show</li>
          </ul>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-white/5 px-5 py-6 text-xs tracking-wide text-zinc-600 sm:flex-row lg:px-8">
        <p>© {new Date().getFullYear()} Veloce Automobili. All rights reserved.</p>
        <p className="font-accent italic text-zinc-500">Crafted for those who drive the extraordinary.</p>
      </div>
    </footer>
  );
}
