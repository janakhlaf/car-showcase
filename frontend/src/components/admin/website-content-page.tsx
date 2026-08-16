import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, MonitorCog, CarFront, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { adminApi } from "@/lib/admin-auth";

type CarOption = {
  id: number;
  name: string;
  year: number;
  brandName: string;
};

export function WebsiteContentPage() {
  const navigate = useNavigate();

  const [cars, setCars] = useState<CarOption[]>([]);
  const [heroCarId, setHeroCarId] = useState("");
  const [initialHeroCarId, setInitialHeroCarId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadPage() {
      try {
        /*
         * 1. Check current admin + permissions
         */
        const meResponse =
          await adminApi.get("/api/admin/me");

        const permissions: string[] =
          meResponse.data.data?.permissions ?? [];

        if (
          !permissions.includes(
            "site_content.edit"
          )
        ) {
          toast.error(
            "You do not have permission to edit website content"
          );

          navigate("/admin", {
            replace: true,
          });

          return;
        }

        /*
         * 2. Load available cars
         * 3. Load current site settings
         */
        const [
          carsResponse,
          settingsResponse,
        ] = await Promise.all([
          axios.get(
            "/api/cars?limit=200"
          ),

          axios.get(
            "/api/site-settings"
          ),
        ]);

        setCars(
          carsResponse.data.data ?? []
        );

        const currentHeroCarId =
          settingsResponse.data.data
            ?.heroCarId;

        const value =
          currentHeroCarId !== null &&
          currentHeroCarId !== undefined
            ? String(currentHeroCarId)
            : "";

        setHeroCarId(value);
        setInitialHeroCarId(value);

      } catch (error) {
        console.error(
          "Could not load website content:",
          error
        );

        toast.error(
          "Could not load website content"
        );

        navigate("/admin", {
          replace: true,
        });

      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [navigate]);


  async function saveHeroVehicle() {
    if (!heroCarId) {
      toast.error(
        "Please select a hero vehicle"
      );

      return;
    }

    setSaving(true);

    try {
      await adminApi.put(
        "/api/site-settings/hero-car",
        {
          heroCarId:
            Number(heroCarId),
        }
      );

      setInitialHeroCarId(
        heroCarId
      );

      toast.success(
        "Hero vehicle updated"
      );

    } catch (error) {
      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.error ??
            "Could not update hero vehicle"
          : "Could not update hero vehicle";

      toast.error(message);

    } finally {
      setSaving(false);
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-950 pt-40 text-center text-zinc-500">
        Loading website content...
      </div>
    );
  }


  const hasChanges =
    heroCarId !== initialHeroCarId;


  return (
    <div className="min-h-screen bg-obsidian-950 px-5 pb-20 pt-28 text-white">
      <div className="mx-auto max-w-5xl">

        {/* Back */}
        <button
          type="button"
          onClick={() =>
            navigate("/admin")
          }
          className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to Admin
        </button>


        {/* Header */}
        <div className="border-b border-white/10 pb-8">
          <div className="flex items-center gap-3">
            <MonitorCog className="size-5 text-champagne-400" />

            <p className="text-xs font-semibold tracking-[0.22em] text-champagne-400 uppercase">
              CMS
            </p>
          </div>

          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
            Website Content
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Manage the content and vehicles displayed across the public website.
          </p>
        </div>


        {/* Home Page */}
        <section className="mt-10">
          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase">
            Home Page
          </p>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-6 md:p-8">

            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <CarFront className="size-5 text-champagne-400" />
              </div>

              <div>
                <h2 className="font-display text-xl font-semibold">
                  Hero Vehicle
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Choose the vehicle displayed as the main vehicle on the homepage.
                </p>
              </div>
            </div>


            <div className="mt-7">
              <label
                htmlFor="hero-car"
                className="mb-2 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase"
              >
                Main Hero Vehicle
              </label>

              <select
                id="hero-car"
                value={heroCarId}
                onChange={(e) =>
                  setHeroCarId(
                    e.target.value
                  )
                }
                disabled={saving}
                className="w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-champagne-400/50 disabled:opacity-50"
              >
                <option value="">
                  Select a vehicle
                </option>

                {cars.map((car) => (
                  <option
                    key={car.id}
                    value={car.id}
                  >
                    {car.year}{" "}
                    {car.brandName}{" "}
                    {car.name}
                  </option>
                ))}
              </select>

              <p className="mt-3 text-xs leading-5 text-zinc-600">
                The selected vehicle is stored in the CMS and will be used as the homepage hero vehicle.
              </p>
            </div>


            <div className="mt-7 flex justify-end">
              <button
                type="button"
                onClick={
                  saveHeroVehicle
                }
                disabled={
                  saving ||
                  !heroCarId ||
                  !hasChanges
                }
                className="inline-flex items-center gap-2 rounded-full bg-champagne-400 px-6 py-2.5 text-xs font-bold tracking-[0.12em] text-black uppercase transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving && (
                  <Loader2 className="size-4 animate-spin" />
                )}

                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}