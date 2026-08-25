import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { CarForm } from "@/components/admin/car-form";
import { userApi } from "@/lib/user-auth";

import type { Brand } from "@/db/schema";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone: string;
  sellerStatus: string;
};

export function SellerNewCarPage() {
  const navigate = useNavigate();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPage() {
      try {
        /*
        |--------------------------------------------------------------------------
        | CHECK SELLER
        |--------------------------------------------------------------------------
        */

        const profileResponse =
          await userApi.get(
            "/api/auth/profile"
          );

        const user: UserProfile | undefined =
          profileResponse.data?.data?.user;

        if (!user) {
          navigate("/login");
          return;
        }

        if (
          user.sellerStatus !== "approved"
        ) {
          navigate("/profile");
          return;
        }

        /*
        |--------------------------------------------------------------------------
        | LOAD BRANDS
        |--------------------------------------------------------------------------
        */

        const brandsResponse =
          await userApi.get(
            "/api/brands"
          );

        const loadedBrands =
          brandsResponse.data?.data ?? [];

        setBrands(loadedBrands);

      } catch (error) {
        console.error(
          "SELLER ADD VEHICLE PAGE ERROR:",
          error
        );

        navigate("/seller");

      } finally {
        setLoading(false);
      }
    }

    loadPage();
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

  return (
    <div className="mx-auto max-w-5xl px-5 pb-16 pt-28">
      <CarForm
        mode="create"
        brands={brands}
        ownerType="seller"
      />
    </div>
  );
}