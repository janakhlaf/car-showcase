import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Car,
  Plus,
  Loader2,
  Store,
} from "lucide-react";

import { userApi } from "@/lib/user-auth";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone: string;
  sellerStatus: string;
};

export function SellerDashboardPage() {
  const navigate = useNavigate();

  const [user, setUser] =
    useState<UserProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function checkSeller() {
      try {
        const response =
          await userApi.get(
            "/api/auth/profile"
          );

        const currentUser =
          response.data?.data?.user;

        if (!currentUser) {
          navigate("/login");
          return;
        }

        if (
          currentUser.sellerStatus !==
          "approved"
        ) {
          navigate("/profile");
          return;
        }

        setUser(currentUser);
      } catch (error) {
        console.error(
          "SELLER AUTH ERROR:",
          error
        );

        navigate("/login");
      } finally {
        setLoading(false);
      }
    }

    checkSeller();
  }, [navigate]);

  if (loading) {
    return (
      <section className="min-h-screen bg-obsidian-950 pt-32 text-white">
        <div className="flex justify-center py-24">
          <Loader2 className="size-7 animate-spin text-champagne-300" />
        </div>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <section className="min-h-screen bg-obsidian-950 px-5 pb-24 pt-32 text-white">
      <div className="mx-auto max-w-6xl">

        <div className="mb-10">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.32em] text-champagne-400">
            Seller Studio
          </p>

          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
            My Vehicles
          </h1>

          <p className="mt-3 text-sm text-zinc-500">
            Welcome, {user.name}. Manage your
            vehicle listings.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-4">

          <button
            onClick={() =>
              navigate("/seller/cars/new")
            }
            className="flex items-center gap-2 rounded-full bg-champagne-300 px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-black transition hover:bg-champagne-200"
          >
            <Plus className="size-4" />
            Add Vehicle
          </button>

        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8">

          <div className="flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl border border-champagne-400/20 bg-champagne-400/10 text-champagne-300">
              <Store className="size-5" />
            </span>

            <div>
              <h2 className="font-display text-lg font-semibold">
                Seller Inventory
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Your vehicles will appear here.
              </p>
            </div>
          </div>

          <div className="mt-8 flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10">

            <Car className="mb-4 size-8 text-zinc-600" />

            <p className="text-sm text-zinc-400">
              No vehicles listed yet.
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              Add your first vehicle to get started.
            </p>

          </div>

        </div>

      </div>
    </section>
  );
}