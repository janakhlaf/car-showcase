import { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-auth";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  CarFront,
  Plus,
  ClipboardCheck,
  CalendarDays,
  Store,
  Monitor,
  Users,
User,
ShieldCheck,
History,
LogOut,
Menu,
X,
} from "lucide-react";

type AdminLayoutProps = {
  children: ReactNode;
};

export function AdminLayout({
  children,
}: AdminLayoutProps) {
  const location = useLocation();
  const [adminRole, setAdminRole] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

useEffect(() => {
  adminApi
    .get("/api/admin/me")
    .then((response) => {
      setAdminRole(
        response.data.data?.role ??
        response.data.role ??
        ""
      );
    })
    .catch(() => {
      setAdminRole("");
    });
}, []);
  const handleSignOut = async () => {
  const refreshToken =
    sessionStorage.getItem("adminRefreshToken");

  try {
    await adminApi.post("/api/admin/logout", {
      refreshToken,
    });
  } catch {
    // حتى لو فشل الطلب، منعمل logout محليًا
  }

  sessionStorage.removeItem("adminAccessToken");
  sessionStorage.removeItem("adminRefreshToken");

  window.location.href = "/admin/login";
};

  const isActive = (path: string) =>
    location.pathname === path;

  const linkClass = (path: string) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
      isActive(path)
        ? "bg-[#d7b36a]/10 text-[#d7b36a]"
        : "text-white/50 hover:bg-white/[0.04] hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-[#080809] text-white">
      {/* MOBILE MENU BUTTON */}
<button
  type="button"
  onClick={() => setSidebarOpen(true)}
  className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#0b0b0d] text-white shadow-lg lg:hidden"
  aria-label="Open admin menu"
>
  <Menu className="h-5 w-5" />
</button>  
{/* MOBILE OVERLAY */}
{sidebarOpen && (
  <button
    type="button"
    onClick={() => setSidebarOpen(false)}
    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
    aria-label="Close admin menu"
  />
)}
      {/* SIDEBAR */}
      <aside
  className={`fixed left-0 top-0 z-[60] flex h-screen w-64 flex-col border-r border-white/10 bg-[#0b0b0d] transition-transform duration-300 lg:translate-x-0 ${
    sidebarOpen
      ? "translate-x-0"
      : "-translate-x-full"
  }`}
>

        {/* LOGO */}
        <div className="relative border-b border-white/10 px-6 py-7">
          <Link
            to="/admin"
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d7b36a]/30 text-[#d7b36a]">
              V
            </div>

            <div>
              <p className="text-sm font-semibold tracking-[0.3em]">
                VELOCE
              </p>

              <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-white/30">
                Admin Studio
              </p>
            </div>
          </Link>
          <button
    type="button"
    onClick={() => setSidebarOpen(false)}
    className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:bg-white/5 hover:text-white lg:hidden"
    aria-label="Close admin menu"
  >
    <X className="h-5 w-5" />
  </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">

          

          {/* VEHICLES */}
          <p className="mb-2 mt-7 px-3 text-[9px] font-semibold uppercase tracking-[0.25em] text-white/25">
            Vehicles
          </p>

          <Link
            to="/admin"
            className={linkClass("/admin")}
          >
            <CarFront className="h-4 w-4" />
            Inventory
          </Link>

          <Link
            to="/admin/cars/new"
            className={linkClass("/admin/cars/new")}
          >
            <Plus className="h-4 w-4" />
            Add Vehicle
          </Link>

          <Link
            to="/admin/vehicle-reviews"
            className={linkClass(
              "/admin/vehicle-reviews"
            )}
          >
            <ClipboardCheck className="h-4 w-4" />
            Vehicle Reviews
          </Link>

          {/* OPERATIONS */}
          <p className="mb-2 mt-7 px-3 text-[9px] font-semibold uppercase tracking-[0.25em] text-white/25">
            Operations
          </p>

          <Link
            to="/admin/test-drives"
            className={linkClass(
              "/admin/test-drives"
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Test Drive Bookings
          </Link>

          <Link
            to="/admin/seller-requests"
            className={linkClass(
              "/admin/seller-requests"
            )}
          >
            <Store className="h-4 w-4" />
            Seller Requests
          </Link>

          {/* WEBSITE */}
          <p className="mb-2 mt-7 px-3 text-[9px] font-semibold uppercase tracking-[0.25em] text-white/25">
            Website
          </p>

          <Link
            to="/admin/content"
            className={linkClass(
              "/admin/content"
            )}
          >
            <Monitor className="h-4 w-4" />
            Website Content
          </Link>

          {/* ADMINISTRATION */}
          <p className="mb-2 mt-7 px-3 text-[9px] font-semibold uppercase tracking-[0.25em] text-white/25">
            Administration
          </p>
          <Link
  to="/admin/profile"
  className={linkClass("/admin/profile")}
>
  <User className="h-4 w-4" />
  My Profile
</Link>

          <Link
            to="/admin/users"
            className={linkClass(
              "/admin/users"
            )}
          >
            <Users className="h-4 w-4" />
            Manage Users
          </Link>

          <Link
            to="/admin/roles"
            className={linkClass(
              "/admin/roles"
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            Roles & Permissions
          </Link>

          {adminRole === "super_admin" && (
  <Link
    to="/admin/activity-history"
    className={linkClass(
      "/admin/activity-history"
    )}
  >
    <History className="h-4 w-4" />
    Activity History
  </Link>
)}
        </nav>

        {/* BOTTOM */}
        <div className="border-t border-white/10 p-4">
          <button
  type="button"
  onClick={handleSignOut}
  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/40 transition hover:bg-red-500/10 hover:text-red-300"
>
  <LogOut className="h-4 w-4" />
  Sign Out
</button>
        </div>
      </aside>

      {/* PAGE CONTENT */}
      <div className="lg:pl-64">
        {children}
      </div>
    </div>
  );
}