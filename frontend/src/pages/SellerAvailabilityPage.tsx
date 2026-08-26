import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { userApi } from "@/lib/user-auth";

type Availability = {
  id: number;
  sellerId: number;
  carId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
};

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function SellerAvailabilityPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const carId = Number(id);

  const [carName, setCarName] = useState("");
  const [availability, setAvailability] =
    useState<Availability[]>([]);

  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("14:00");
  const [slotDuration, setSlotDuration] = useState(30);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD AVAILABILITY
  |--------------------------------------------------------------------------
  */

  async function loadAvailability() {
    try {
      setError("");

      const response = await userApi.get(
        `/api/sellers/cars/${carId}/availability`
      );

      const data = response.data?.data;

      setCarName(data?.car?.name ?? "");

      setAvailability(
        Array.isArray(data?.availability)
          ? data.availability
          : []
      );
    } catch (error: any) {
      console.error(
        "LOAD AVAILABILITY ERROR:",
        error
      );

      setError(
        error?.response?.data?.error ??
          error?.response?.data?.message ??
          "Could not load test drive availability."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isInteger(carId) || carId <= 0) {
      navigate("/seller");
      return;
    }

    loadAvailability();
  }, [carId]);

  /*
  |--------------------------------------------------------------------------
  | ADD AVAILABILITY
  |--------------------------------------------------------------------------
  */

  async function addAvailability() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (endTime <= startTime) {
        setError(
          "End time must be after start time."
        );
        return;
      }

      await userApi.post(
        `/api/sellers/cars/${carId}/availability`,
        {
          dayOfWeek,
          startTime,
          endTime,
          slotDuration,
        }
      );

      setSuccess(
        "Test drive availability added successfully."
      );

      await loadAvailability();
    } catch (error: any) {
      console.error(
        "ADD AVAILABILITY ERROR:",
        error
      );

      setError(
        error?.response?.data?.error ??
          error?.response?.data?.message ??
          "Could not add availability."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | DELETE AVAILABILITY
  |--------------------------------------------------------------------------
  */

  async function deleteAvailability(
    availabilityId: number
  ) {
    try {
      setDeletingId(availabilityId);
      setError("");
      setSuccess("");

      await userApi.delete(
        `/api/sellers/cars/${carId}/availability/${availabilityId}`
      );

      setAvailability((current) =>
        current.filter(
          (item) => item.id !== availabilityId
        )
      );

      setSuccess(
        "Availability removed successfully."
      );
    } catch (error: any) {
      console.error(
        "DELETE AVAILABILITY ERROR:",
        error
      );

      setError(
        error?.response?.data?.error ??
          error?.response?.data?.message ??
          "Could not remove availability."
      );
    } finally {
      setDeletingId(null);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | FORMAT TIME
  |--------------------------------------------------------------------------
  */

  function formatTime(value: string) {
    if (!value) return "";

    const [hours, minutes] = value.split(":");

    const date = new Date();

    date.setHours(
      Number(hours),
      Number(minutes),
      0,
      0
    );

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

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
    <section className="min-h-screen bg-obsidian-950 px-5 pb-24 pt-32 text-white">
      <div className="mx-auto max-w-5xl">

        {/* BACK */}

        <button
          type="button"
          onClick={() => navigate("/seller")}
          className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 transition hover:text-champagne-300"
        >
          <ArrowLeft className="size-4" />
          Seller Studio
        </button>

        {/* HEADER */}

        <div className="mb-10">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.32em] text-champagne-400">
            Test Drive Scheduling
          </p>

          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Availability
          </h1>

          <p className="mt-3 text-sm text-zinc-500">
            Set the days and times customers can
            book a test drive for{" "}
            <span className="font-medium text-zinc-300">
              {carName}
            </span>
            .
          </p>
        </div>

        {/* FORM */}

        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">

          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl border border-champagne-400/20 bg-champagne-400/10 text-champagne-300">
              <CalendarDays className="size-5" />
            </span>

            <div>
              <h2 className="font-display text-lg font-semibold">
                Add Available Hours
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Choose when this vehicle is available.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-4">

            {/* DAY */}

            <label>
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Day
              </span>

              <select
                value={dayOfWeek}
                onChange={(event) =>
                  setDayOfWeek(
                    Number(event.target.value)
                  )
                }
                className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition focus:border-champagne-400/40"
              >
                {DAYS.map((day, index) => (
                  <option
                    key={day}
                    value={index}
                    className="bg-zinc-950"
                  >
                    {day}
                  </option>
                ))}
              </select>
            </label>

            {/* START */}

            <label>
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Start Time
              </span>

              <input
                type="time"
                value={startTime}
                onChange={(event) =>
                  setStartTime(event.target.value)
                }
                className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition focus:border-champagne-400/40"
              />
            </label>

            {/* END */}

            <label>
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                End Time
              </span>

              <input
                type="time"
                value={endTime}
                onChange={(event) =>
                  setEndTime(event.target.value)
                }
                className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition focus:border-champagne-400/40"
              />
            </label>

            {/* DURATION */}

            <label>
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Appointment Length
              </span>

              <select
                value={slotDuration}
                onChange={(event) =>
                  setSlotDuration(
                    Number(event.target.value)
                  )
                }
                className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition focus:border-champagne-400/40"
              >
                <option
                  value={30}
                  className="bg-zinc-950"
                >
                  30 Minutes
                </option>

                <option
                  value={45}
                  className="bg-zinc-950"
                >
                  45 Minutes
                </option>

                <option
                  value={60}
                  className="bg-zinc-950"
                >
                  60 Minutes
                </option>
              </select>
            </label>

          </div>

          {/* MESSAGES */}

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-300">
              {success}
            </div>
          )}

          {/* SAVE */}

          <div className="mt-7 flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={addAvailability}
              className="inline-flex items-center gap-2 rounded-full bg-champagne-300 px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-black transition hover:bg-champagne-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}

              {saving
                ? "Adding..."
                : "Add Availability"}
            </button>
          </div>

        </div>

        {/* CURRENT AVAILABILITY */}

        <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">

          <div className="flex items-center gap-3">
            <Clock3 className="size-5 text-champagne-300" />

            <h2 className="font-display text-lg font-semibold">
              Current Availability
            </h2>
          </div>

          {availability.length === 0 ? (
            <div className="mt-7 rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center">
              <CalendarDays className="mx-auto size-7 text-zinc-700" />

              <p className="mt-3 text-sm text-zinc-500">
                No test drive availability added yet.
              </p>
            </div>
          ) : (
            <div className="mt-7 space-y-3">

              {availability.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-white/[0.07] bg-black/20 px-5 py-4 sm:flex-row sm:items-center"
                >

                  <div className="flex items-center gap-4">

                    <span className="grid size-11 place-items-center rounded-xl bg-champagne-400/10 text-champagne-300">
                      <CalendarDays className="size-5" />
                    </span>

                    <div>
                      <p className="text-sm font-semibold text-white">
                        {DAYS[item.dayOfWeek]}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {formatTime(item.startTime)}
                        {" — "}
                        {formatTime(item.endTime)}
                        {" · "}
                        {item.slotDuration} min appointments
                      </p>
                    </div>

                  </div>

                  <button
                    type="button"
                    disabled={
                      deletingId === item.id
                    }
                    onClick={() =>
                      deleteAvailability(item.id)
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 px-4 py-2.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-40"
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}

                    Remove
                  </button>

                </div>
              ))}

            </div>
          )}

        </div>

      </div>
    </section>
  );
}