

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Gauge, Menu, X, UserCircle, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminApi } from "@/lib/admin-auth";
import axios from "axios";

const LINKS = [
  { href: "/", label: "Showroom" },
  { href: "/cars", label: "Collection" },
];

export function Navbar() {
  const pathname = useLocation().pathname;
  const isAdmin = pathname.startsWith("/admin");
  const isAdminLogin = pathname === "/admin/login";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userAccount, setUserAccount] = useState<{
  id: number;
  name: string;
  email: string;
  phone: string;
} | null>(null);
  const [adminAccount, setAdminAccount] = useState<{
  name: string;
  email: string;
} | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
  if (isAdmin) {
    setUserAccount(null);
    return;
  }

  const storedUser =
    sessionStorage.getItem("user");

  const accessToken =
    sessionStorage.getItem("userAccessToken");

  if (!storedUser || !accessToken) {
    setUserAccount(null);
    return;
  }

  try {
    const parsedUser = JSON.parse(storedUser);

    setUserAccount(parsedUser);
  } catch {
    setUserAccount(null);
  }
}, [pathname, isAdmin]);
  useEffect(() => {
  if (!isAdmin || isAdminLogin) {
    setAdminAccount(null);
    return;
  }

  adminApi
    .get("/api/admin/me")
    .then((response) => {
      setAdminAccount({
        name: response.data.data.name,
        email: response.data.data.email,
      });
    })
    .catch(() => {
      setAdminAccount(null);
    });
}, [isAdmin, isAdminLogin]);
if (isAdminLogin) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-obsidian-950/95 py-5 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center px-5 lg:px-8">
        <Link
          to="/admin/login"
          className="group flex items-center gap-2.5"
          aria-label="VELOCE admin login"
        >
          <span className="grid size-9 place-items-center rounded-xl border border-champagne-400/40 bg-champagne-400/10 text-champagne-300">
            <Gauge className="size-4.5" strokeWidth={1.75} />
          </span>

          <span className="font-display text-lg font-semibold tracking-[0.32em] uppercase">
            Veloce
          </span>
        </Link>
      </div>
    </header>
  );
}  
if (isAdmin && !isAdminLogin) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 bg-obsidian-950/95 py-5 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 lg:px-8">

        <Link
          to="/admin"
          className="group flex items-center gap-2.5"
          aria-label="VELOCE admin"
        >
          <span className="grid size-9 place-items-center rounded-xl border border-champagne-400/40 bg-champagne-400/10 text-champagne-300">
            <Gauge className="size-4.5" strokeWidth={1.75} />
          </span>

          <span className="font-display text-lg font-semibold tracking-[0.32em] uppercase">
            Veloce
          </span>
        </Link>


        <div className="relative">
          <button
  type="button"
  onClick={() => setProfileOpen((v) => !v)}
  className="flex h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 text-zinc-300 transition-colors hover:border-champagne-400/40 hover:bg-champagne-400/10 hover:text-champagne-300"
  aria-label="Admin account"
  aria-expanded={profileOpen}
>
  <UserCircle className="size-5 shrink-0" />

  <span className="max-w-[180px] truncate text-sm font-medium">
  {adminAccount?.name || adminAccount?.email || "Admin"}
</span>

  <span
    className={cn(
      "text-xs text-zinc-500 transition-transform duration-200",
      profileOpen && "rotate-180"
    )}
  >
    ▾
  </span>
</button>

          {profileOpen && (
            <div className="absolute right-0 top-14 z-50 w-60 overflow-hidden rounded-2xl border border-white/10 bg-obsidian-900/95 shadow-2xl backdrop-blur-xl">

              <div className="border-b border-white/[0.07] px-4 py-3">
  <p className="truncate text-sm font-semibold text-zinc-200">
    {adminAccount?.name || "Admin"}
  </p>

  <p className="mt-1 truncate text-xs text-zinc-500">
    {adminAccount?.email || ""}
  </p>
</div> 
              <div className="p-2">
                <Link
                  to="/admin/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-champagne-300"
                >
                  <UserCircle className="size-4" />
                  View profile
                </Link>

                <button
                  type="button"
                  onClick={async () => {
  setProfileOpen(false);

  const refreshToken =
    sessionStorage.getItem("adminRefreshToken");

  try {
    if (refreshToken) {
      await axios.post(
        "/api/admin/logout",
        {
          refreshToken,
        }
      );
    }
  } catch (error) {
    console.log("Logout revoke failed:", error);
  }

  sessionStorage.removeItem("adminAccessToken");
  sessionStorage.removeItem("adminRefreshToken");

  setAdminAccount(null);

  window.location.href = "/admin/login";
}}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </header>
  );
}

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

        <div className="hidden items-center gap-2 md:flex">
  {!userAccount ? (
    <>
      <Link
        to="/login"
        className="rounded-full px-4 py-2.5 text-[12px] font-semibold tracking-[0.16em] text-zinc-300 uppercase transition-colors hover:text-champagne-300"
      >
        Sign In
      </Link>

      <Link
        to="/register"
        className="rounded-full border border-champagne-400/40 px-5 py-2.5 text-[12px] font-semibold tracking-[0.16em] text-champagne-300 uppercase transition-all hover:bg-champagne-400 hover:text-obsidian-950"
      >
        Create Account
      </Link>
    </>
  ) : (
    <div className="relative">
      <button
        type="button"
        onClick={() => setProfileOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.025] px-4 py-2 text-zinc-200 transition-all hover:border-champagne-400/40 hover:bg-champagne-400/[0.06]"
      >
        <span className="grid size-7 place-items-center rounded-full bg-champagne-400/10 text-champagne-300">
          <UserCircle className="size-4.5" />
        </span>

        <span className="max-w-[110px] truncate text-[12px] font-semibold tracking-[0.1em] uppercase">
          {userAccount.name}
        </span>

        <span
          className={cn(
            "text-[10px] text-zinc-500 transition-transform duration-200",
            profileOpen && "rotate-180"
          )}
        >
          ▾
        </span>
      </button>

      {profileOpen && (
        <div className="absolute right-0 top-14 z-50 w-60 overflow-hidden rounded-2xl border border-white/10 bg-obsidian-900/95 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-white/[0.07] px-4 py-4">
            <p className="truncate text-sm font-semibold text-zinc-100">
              {userAccount.name}
            </p>

            <p className="mt-1 truncate text-xs text-zinc-500">
              {userAccount.email}
            </p>
          </div>

          <div className="p-2">
            <Link
              to="/profile"
              onClick={() => setProfileOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-champagne-300"
            >
              <UserCircle className="size-4" />
              My Profile
            </Link>

            <Link
              to="/my-test-drives"
              onClick={() => setProfileOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-champagne-300"
            >
              <Gauge className="size-4" />
              My Test Drives
            </Link>

            <div className="my-1 border-t border-white/[0.07]" />

            <button
              type="button"
              onClick={async () => {
  setProfileOpen(false);

  const refreshToken =
    sessionStorage.getItem("userRefreshToken");

  try {
    if (refreshToken) {
      await axios.post(
        "/api/auth/logout",
        {
          refreshToken,
        }
      );
    }
  } catch (error) {
    console.log(
      "User logout revoke failed:",
      error
    );
  }

  sessionStorage.removeItem(
    "userAccessToken"
  );

  sessionStorage.removeItem(
    "userRefreshToken"
  );

  sessionStorage.removeItem(
    "user"
  );

  setUserAccount(null);

  window.location.href = "/";
}}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="size-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )}
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
