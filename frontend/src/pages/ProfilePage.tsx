import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Phone,
  UserCircle,
  Loader2,
  Store,

} from "lucide-react";

import { userApi } from "@/lib/user-auth";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone: string;
  sellerStatus?: "none" | "pending" | "approved" | "rejected";
  seller_status?: "none" | "pending" | "approved" | "rejected";
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
    const [sellerStatus, setSellerStatus] =
  useState<"none" | "pending" | "approved" | "rejected">("none");

const [submittingSellerRequest, setSubmittingSellerRequest] =
  useState(false);

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
        setSellerStatus(
          user.sellerStatus ??
          user.seller_status ??
          "none"
        );

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

  async function becomeSeller() {
  try {
    setSubmittingSellerRequest(true);
    setError("");

    await userApi.post(
      "/api/sellers/request"
    );

    setSellerStatus("pending");

    if (profile) {
      const updatedUser = {
        ...profile,
        sellerStatus: "pending" as const,
        seller_status: "pending" as const,
      };

      setProfile(updatedUser);

      sessionStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );
    }

  } catch (error: any) {
    console.error(
      "BECOME SELLER ERROR:",
      error
    );

    setError(
      error?.response?.data?.error ??
      error?.response?.data?.message ??
      "Could not submit seller request."
    );

  } finally {
    setSubmittingSellerRequest(false);
  }
}

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
        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">

  <div className="flex items-start gap-4 p-6 md:p-8">

    <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-champagne-400/25 bg-champagne-400/10 text-champagne-300">
      <Store className="size-6" />
    </span>

    <div className="flex-1">

      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-champagne-400">
        Seller Access
      </p>

      <h2 className="mt-2 font-display text-xl font-semibold text-white">
        Become a Seller
      </h2>

      <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
        Apply for permission to list and sell your own vehicles on VELOCE.
      </p>

      <div className="mt-6">

        {sellerStatus === "none" && (
          <button
            type="button"
            disabled={submittingSellerRequest}
            onClick={becomeSeller}
            className="rounded-full bg-champagne-400 px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-obsidian-950 transition hover:bg-champagne-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submittingSellerRequest
              ? "Submitting..."
              : "Become a Seller"}
          </button>
        )}

        {sellerStatus === "pending" && (
          <div className="inline-flex rounded-full border border-champagne-400/25 bg-champagne-400/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-champagne-300">
            Seller Request Pending
          </div>
        )}

        {sellerStatus === "approved" && (
          <div className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">
            Seller Account Approved
          </div>
        )}

        {sellerStatus === "rejected" && (
          <div className="flex flex-wrap items-center gap-3">

            <div className="rounded-full border border-red-500/25 bg-red-500/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-red-300">
              Seller Request Rejected
            </div>

            <button
              type="button"
              disabled={submittingSellerRequest}
              onClick={becomeSeller}
              className="rounded-full border border-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300 transition hover:border-champagne-400/40 hover:text-champagne-300 disabled:opacity-50"
            >
              Apply Again
            </button>

          </div>
        )}

      </div>
    </div>
  </div>
</div>
      </div>
    </section>
  );
}