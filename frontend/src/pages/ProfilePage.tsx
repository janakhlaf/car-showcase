import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Phone,
  UserCircle,
  Loader2,
} from "lucide-react";

import { userApi } from "@/lib/user-auth";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
};

export function ProfilePage() {
  const navigate = useNavigate();

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadProfile() {
      const accessToken =
        sessionStorage.getItem(
          "userAccessToken"
        );

      const refreshToken =
        sessionStorage.getItem(
          "userRefreshToken"
        );

      if (!accessToken && !refreshToken) {
        navigate(
          "/login?redirect=/profile"
        );

        return;
      }

      try {
        const response =
          await userApi.get(
            "/api/auth/profile"
          );

        const user =
          response.data?.data?.user;

        if (!user) {
          throw new Error(
            "Profile data not found"
          );
        }

        setProfile(user);

        sessionStorage.setItem(
          "user",
          JSON.stringify(user)
        );

      } catch (error) {
        console.log(
          "PROFILE ERROR:",
          error
        );

        setError(
          "Could not load your profile."
        );

      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [navigate]);

  if (loading) {
    return (
      <section className="min-h-screen bg-obsidian-950 px-5 pt-32 text-white">
        <div className="mx-auto flex max-w-3xl justify-center py-24">
          <Loader2 className="size-7 animate-spin text-champagne-300" />
        </div>
      </section>
    );
  }

  if (error || !profile) {
    return (
      <section className="min-h-screen bg-obsidian-950 px-5 pt-32 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-zinc-400">
            {error ||
              "Profile could not be loaded."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-obsidian-950 px-5 pb-20 pt-32 text-white">
      <div className="mx-auto max-w-3xl">

        <div className="mb-8">
          <p className="font-display text-xs font-semibold tracking-[0.32em] text-champagne-400 uppercase">
            Your Account
          </p>

          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
            My Profile
          </h1>

          <p className="mt-3 text-sm text-zinc-500">
            Review your personal information
            used for test drive bookings.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">

          <div className="flex items-center gap-4 border-b border-white/[0.07] p-6 md:p-8">
            <span className="grid size-14 place-items-center rounded-2xl border border-champagne-400/25 bg-champagne-400/10 text-champagne-300">
              <UserCircle className="size-7" />
            </span>

            <div>
              <h2 className="font-display text-xl font-semibold text-zinc-100">
                {profile.name}
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Customer account
              </p>
            </div>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8">

            <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-5">
              <div className="flex items-center gap-3 text-zinc-500">
                <UserCircle className="size-4" />

                <span className="text-[11px] font-semibold tracking-[0.18em] uppercase">
                  Full Name
                </span>
              </div>

              <p className="mt-3 text-sm font-medium text-zinc-200">
                {profile.name}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-5">
              <div className="flex items-center gap-3 text-zinc-500">
                <Mail className="size-4" />

                <span className="text-[11px] font-semibold tracking-[0.18em] uppercase">
                  Email
                </span>
              </div>

              <p className="mt-3 break-all text-sm font-medium text-zinc-200">
                {profile.email}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-5 md:col-span-2">
              <div className="flex items-center gap-3 text-zinc-500">
                <Phone className="size-4" />

                <span className="text-[11px] font-semibold tracking-[0.18em] uppercase">
                  Phone Number
                </span>
              </div>

              <p className="mt-3 text-sm font-medium text-zinc-200">
                {profile.phone}
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}