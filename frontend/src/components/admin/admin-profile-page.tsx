import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Loader2, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin-auth";

type AdminProfile = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

export function AdminProfilePage() {
  const [profile, setProfile] =
    useState<AdminProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    adminApi
      .get("/api/admin/me")
      .then((response) => {
        setProfile(response.data.data);
      })
      .catch(() => {
        toast.error("Could not load profile");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-champagne-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-5 pt-28">
        <p className="text-zinc-500">
          Could not load profile.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pt-28 pb-16 lg:px-8">

      <Link
        to="/admin"
        className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase transition-colors hover:text-champagne-300"
      >
        ← Admin dashboard
      </Link>

      <div className="mt-8">
        <p className="font-display text-xs font-semibold tracking-[0.32em] text-champagne-400 uppercase">
          Admin Studio
        </p>

        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">
          My{" "}
          <span className="font-accent text-gradient-gold font-normal italic">
            profile
          </span>
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Your administrator account information.
        </p>
      </div>

      <div className="glass mt-8 rounded-3xl p-6 md:p-8">

        <div className="flex items-center gap-4 border-b border-white/[0.07] pb-6">
          <span className="grid size-14 place-items-center rounded-2xl border border-champagne-400/30 bg-champagne-400/10 text-champagne-300">
            <User className="size-6" />
          </span>

          <div>
            <p className="font-display text-xl font-bold text-zinc-100">
              {profile.name}
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Administrator account
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-5">

          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 size-4 text-champagne-400" />

            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">
                Email
              </p>

              <p className="mt-1 text-sm text-zinc-200">
                {profile.email}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 size-4 text-champagne-400" />

            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">
                Account created
              </p>

              <p className="mt-1 text-sm text-zinc-200">
                {profile.createdAt}
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}