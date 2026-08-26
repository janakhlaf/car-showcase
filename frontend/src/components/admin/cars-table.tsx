

/**
 * CarsTable — admin inventory manager: live search, inventory KPIs,
 * edit links and deletion with an elegant confirmation modal.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { adminApi } from "@/lib/admin-auth";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  CircleDollarSign,
  ExternalLink,
  Layers,
  LayoutDashboard,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Store,
  Trash2,
  TriangleAlert,
  Users,
  ClipboardCheck,

} from "lucide-react";
import { toast } from "sonner";
import type { Brand, CarWithBrand } from "@/db/schema";
import { cn, formatPrice } from "@/lib/utils";

export function CarsTable({
  cars: initialCars,
  brands,
  adminName,
  adminRole,
  adminPermissions,
}: {
  cars: CarWithBrand[];
  brands: Brand[];
  adminName: string;
  adminRole: "super_admin" | "manage_admin" | "editor_admin";
  adminPermissions: string[];
}) {
  const navigate = useNavigate();
  const [cars, setCars] = useState(initialCars);
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState<CarWithBrand | null>(null);
  const [deleting, setDeleting] = useState(false);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cars;
    return cars.filter((c) => `${c.brandName} ${c.name} ${c.color} ${c.year}`.toLowerCase().includes(q));
  }, [cars, query]);

  const stats = useMemo(
    () => [
      { icon: Layers, label: "Vehicles", value: String(cars.length) },
      {
        icon: CircleDollarSign,
        label: "Inventory value",
        value: formatPrice(cars.reduce((acc, c) => acc + c.price, 0)),
      },
      { icon: Star, label: "Featured", value: String(cars.filter((c) => c.featured).length) },
      { icon: Layers, label: "Marques", value: String(brands.length) },
    ],
    [cars, brands],
  );

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminApi.delete(`/api/cars/${toDelete.id}`);
      setCars((list) => list.filter((c) => c.id !== toDelete.id));
      toast.success(`${toDelete.brandName} ${toDelete.name} removed from the collection`);
      setToDelete(null);
      
    } catch {
      toast.error("Could not delete this vehicle");
    } finally {
      setDeleting(false);
    }
  }

  async function logout() {
  const refreshToken =
    sessionStorage.getItem("adminRefreshToken");

  try {
    await axios.post(
      "/api/admin/logout",
      {
        refreshToken,
      }
    );

    sessionStorage.removeItem(
      "adminAccessToken"
    );

    sessionStorage.removeItem(
      "adminRefreshToken"
    );

    toast.success("Signed out");

    navigate("/admin/login");

  } catch {
    toast.error("Sign out failed");
  }
}

  return (
    <div className="mx-auto max-w-7xl px-5 pt-28 pb-16 lg:px-8">

      {/* header */}
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-xs font-semibold tracking-[0.32em] text-champagne-400 uppercase">
            Admin Studio
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Inventory <span className="font-accent text-gradient-gold font-normal italic">management</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500">Signed in as {adminName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">

  {adminRole === "super_admin" && (
  <>
    <Link
      to="/admin/users"
      className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-xs font-semibold tracking-[0.14em] text-zinc-300 uppercase transition-colors hover:border-champagne-400/40 hover:text-champagne-300"
    >
      <Users className="size-4" />
      Manage users
    </Link>

    <Link
      to="/admin/roles"
      className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-xs font-semibold tracking-[0.14em] text-zinc-300 uppercase transition-colors hover:border-champagne-400/40 hover:text-champagne-300"
    >
      <ShieldCheck className="size-4" />
      Roles & Permissions
    </Link>
  </>
)}

{(
  adminRole === "super_admin" ||
  adminPermissions.includes("test_drives.manage")
) && (
  <Link
    to="/admin/test-drives"
    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-xs font-semibold tracking-[0.14em] text-zinc-300 uppercase transition-colors hover:border-champagne-400/40 hover:text-champagne-300"
  >
    <CalendarDays className="size-4" />
    Test Drive Bookings
  </Link>
)}
{(
  adminRole === "super_admin" ||
  adminPermissions.includes("sellers.manage")
) && (
  <Link
    to="/admin/seller-requests"
    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-xs font-semibold tracking-[0.14em] text-zinc-300 uppercase transition-colors hover:border-champagne-400/40 hover:text-champagne-300"
  >
    <Store className="size-4" />
    Seller Requests
  </Link>
)}
{(
  adminRole === "super_admin" ||
  adminPermissions.includes("seller_vehicles.review")
) && (
  <Link
    to="/admin/vehicle-reviews"
    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-xs font-semibold tracking-[0.14em] text-zinc-300 uppercase transition-colors hover:border-champagne-400/40 hover:text-champagne-300"
  >
    <Store className="size-4" />
    Vehicle Reviews
  </Link>
)}

{adminPermissions.includes("site_content.edit") && (
  <Link
    to="/admin/content"
    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-xs font-semibold tracking-[0.14em] text-zinc-300 uppercase transition-colors hover:border-champagne-400/40 hover:text-champagne-300"
  >
    <LayoutDashboard className="size-4" />
    Website Content
  </Link>
)}


{adminPermissions.includes("cars.create") && (
  <Link
    to="/admin/cars/new"
    className="inline-flex items-center gap-2 rounded-full bg-champagne-400 px-6 py-3 text-sm font-bold tracking-[0.12em] text-obsidian-950 uppercase transition-colors hover:bg-champagne-300"
  >
    <Plus className="size-4" />
    Add vehicle
  </Link>
)}


</div>
      </header>

      {/* KPIs */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl px-5 py-4">
            <s.icon className="size-4 text-champagne-400" aria-hidden />
            <p className="mt-3 font-display text-2xl font-bold break-words text-zinc-50">{s.value}</p>
            <p className="mt-0.5 text-[11px] tracking-[0.18em] text-zinc-500 uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* search */}
      <label className="relative mt-8 block max-w-md">
        <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter inventory…"
          aria-label="Filter inventory"
          className="w-full rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm outline-none placeholder:text-zinc-600 focus:border-champagne-400/60"
        />
      </label>

      {/* table */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02] text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
                <th className="px-5 py-4 font-semibold">Vehicle</th>
                <th className="px-5 py-4 font-semibold">Marque</th>
                <th className="px-5 py-4 font-semibold">Year</th>
                <th className="px-5 py-4 font-semibold">Paint</th>
                <th className="px-5 py-4 text-right font-semibold">Price</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((car) => (
                <tr key={car.id} className="border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={car.thumbnail}
                        alt=""
                        className="h-11 w-18 rounded-lg border border-white/10 object-cover"
                        loading="lazy"
                      />
                      <div>
                        <p className="font-semibold text-zinc-100">
                          {car.name}
                          {car.featured && <Star className="ml-2 inline size-3.5 fill-champagne-400 text-champagne-400" aria-label="Featured" />}
                        </p>
                        <p className="text-xs text-zinc-500">#{car.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-400">{car.brandName}</td>
                  <td className="px-5 py-3.5 text-zinc-400">{car.year}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-2 text-zinc-400">
                      <span className="size-3.5 rounded-full ring-1 ring-white/25" style={{ backgroundColor: car.colorHex }} aria-hidden />
                      {car.color}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-zinc-100">{formatPrice(car.price)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        to={`/cars/${car.id}`}
                        target="_blank"
                        title="View public page"
                        aria-label={`View ${car.name} public page`}
                        className="grid size-9 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-champagne-300"
                      >
                        <ExternalLink className="size-4" />
                      </Link>
                      {adminPermissions.includes("cars.edit") && (
                      <Link
                        to={`/admin/cars/${car.id}`}
                        title="Edit vehicle"
                        aria-label={`Edit ${car.name}`}
                        className="grid size-9 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-champagne-300"
                      >
                        <Pencil className="size-4" />
                      </Link>
                    )}
                      {adminPermissions.includes("cars.delete") && (
                    <button
                      type="button"
                      title="Delete vehicle"
                      aria-label={`Delete ${car.name}`}
                      onClick={() => setToDelete(car)}
                      className="grid size-9 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-zinc-500">
                    No vehicles match “{query}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* delete confirmation */}
      <AnimatePresence>
        {toDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm deletion"
            className="fixed inset-0 z-[80] grid place-items-center bg-obsidian-950/80 p-4 backdrop-blur-sm"
            onClick={() => !deleting && setToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="glass-strong w-full max-w-md rounded-3xl p-7"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="grid size-12 place-items-center rounded-2xl border border-red-400/30 bg-red-500/10 text-red-400">
                <TriangleAlert className="size-5" />
              </span>
              <h2 className="mt-5 font-display text-xl font-bold">Delete this vehicle?</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                The {toDelete.year} {toDelete.brandName} {toDelete.name} will be permanently removed
                from the collection. This action cannot be undone.
              </p>
              <div className="mt-7 flex gap-3">
                <button
                  type="button"
                  onClick={() => setToDelete(null)}
                  disabled={deleting}
                  className={cn(
                    "flex-1 rounded-full border border-white/10 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:border-white/30",
                    deleting && "opacity-50",
                  )}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-red-500 py-3 text-sm font-bold text-white transition-colors hover:bg-red-400 disabled:opacity-60"
                >
                  {deleting && <Loader2 className="size-4 animate-spin" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
