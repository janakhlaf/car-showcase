

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Gauge, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Showroom" },
  { href: "/cars", label: "Collection" },
];

export function Navbar() {
  const pathname = useLocation().pathname;
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "glass-strong py-3" : "bg-transparent py-5",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link to="/" className="group flex items-center gap-2.5" aria-label="VELOCE home">
          <span className="grid size-9 place-items-center rounded-xl border border-champagne-400/40 bg-champagne-400/10 text-champagne-300 transition-colors group-hover:bg-champagne-400 group-hover:text-obsidian-950">
            <Gauge className="size-4.5" strokeWidth={1.75} />
          </span>
          <span className="font-display text-lg font-semibold tracking-[0.32em] uppercase">
            Veloce
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "relative rounded-full px-4 py-2 text-[13px] font-medium tracking-[0.14em] uppercase transition-colors",
                  active ? "text-champagne-300" : "text-zinc-400 hover:text-zinc-100",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full border border-champagne-400/25 bg-champagne-400/10"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  {link.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <Link
            to="/cars"
            className="group relative overflow-hidden rounded-full border border-champagne-400/50 px-5 py-2.5 text-[13px] font-semibold tracking-[0.14em] text-champagne-300 uppercase transition-colors hover:text-obsidian-950"
          >
            <span className="absolute inset-0 origin-bottom scale-y-0 bg-champagne-400 transition-transform duration-300 ease-out group-hover:scale-y-100" />
            <span className="relative">Book a viewing</span>
          </Link>
        </div>

        <button
          className="grid size-10 place-items-center rounded-lg border border-white/10 text-zinc-200 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong mx-4 mt-3 overflow-hidden rounded-2xl md:hidden"
            aria-label="Mobile"
          >
            <div className="flex flex-col p-3">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="rounded-xl px-4 py-3 text-sm font-medium tracking-[0.16em] text-zinc-300 uppercase hover:bg-white/5 hover:text-champagne-300"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
