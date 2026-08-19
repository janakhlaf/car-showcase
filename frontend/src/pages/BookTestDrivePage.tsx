import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import axios from "axios";

import {
  CalendarDays,
  Clock3,
  MapPin,
  CarFront,
  Loader2,
} from "lucide-react";

import { userApi } from "@/lib/user-auth";


type Car = {
  id: number;
  name: string;
  year?: number;
  brandName?: string;
};


export function BookTestDrivePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [car, setCar] =
    useState<Car | null>(null);

  const [loadingCar, setLoadingCar] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [branch, setBranch] =
    useState("");

  const [date, setDate] =
    useState("");

  const [time, setTime] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  /*
  |--------------------------------------------------------------------------
  | CHECK LOGIN + LOAD CAR
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const accessToken =
      sessionStorage.getItem(
        "userAccessToken"
      );

    const refreshToken =
      sessionStorage.getItem(
        "userRefreshToken"
      );

    if (
      !accessToken &&
      !refreshToken
    ) {
      navigate(
        `/login?redirect=/cars/${id}/test-drive`
      );

      return;
    }


    if (!id) {
      setError(
        "Vehicle not found."
      );

      setLoadingCar(false);

      return;
    }


    axios
      .get(`/api/cars/${id}`)
      .then((response) => {
        setCar(
          response.data.data
        );
      })
      .catch((error) => {
        console.log(
          "CAR ERROR:",
          error
        );

        setError(
          "Could not load vehicle."
        );
      })
      .finally(() => {
        setLoadingCar(false);
      });

  }, [id, navigate]);


  /*
  |--------------------------------------------------------------------------
  | SUBMIT BOOKING
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");
    setSuccess("");


    if (!car) {
      return;
    }


    if (!branch) {
      setError(
        "Please select a branch."
      );

      return;
    }


    if (!date) {
      setError(
        "Please select a date."
      );

      return;
    }


    if (!time) {
      setError(
        "Please select a time."
      );

      return;
    }


    setSubmitting(true);


    try {
      const response =
        await userApi.post(
          "/api/test-drives",
          {
            carId: car.id,

            branch,

            testDriveDate:
              date,

            testDriveTime:
              time,

            notes,
          }
        );


      const booking =
        response.data.data.booking;


      setSuccess(
        `Your test drive request has been submitted for ${booking.testDriveDate} at ${booking.testDriveTime}.`
      );


      setNotes("");


    } catch (error) {

      if (
        axios.isAxiosError(error)
      ) {
        const message =
          error.response?.data?.error;


        if (
          error.response?.status === 409
        ) {
          setError(
            message ??
            "This time slot is no longer available. Please choose another time."
          );
        }

        else if (
          error.response?.status === 401
        ) {
          setError(
            "Your session has expired. Please sign in again."
          );
        }

        else {
          setError(
            message ??
            "Could not create test drive booking."
          );
        }

      } else {
        setError(
          "Could not create test drive booking."
        );
      }

    } finally {
      setSubmitting(false);
    }
  }


  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loadingCar) {
    return (
      <main className="min-h-screen bg-obsidian-950 px-5 pt-32 text-white">
        <div className="mx-auto flex max-w-4xl justify-center py-24">
          <Loader2 className="size-7 animate-spin text-champagne-300" />
        </div>
      </main>
    );
  }


  /*
  |--------------------------------------------------------------------------
  | VEHICLE ERROR
  |--------------------------------------------------------------------------
  */

  if (!car) {
    return (
      <main className="min-h-screen bg-obsidian-950 px-5 pt-32 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-zinc-400">
            {error ||
              "Vehicle not found."}
          </p>
        </div>
      </main>
    );
  }


  /*
  |--------------------------------------------------------------------------
  | PAGE
  |--------------------------------------------------------------------------
  */

  return (
    <main className="min-h-screen bg-obsidian-950 px-5 pb-24 pt-32 text-white">

      <div className="mx-auto max-w-4xl">

        <div className="mb-8">

          <p className="text-xs font-semibold tracking-[0.28em] text-champagne-300 uppercase">
            Test Drive
          </p>

          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Book a Test Drive
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
  Schedule a private one-hour test drive.
  A 15-minute handover period is reserved between appointments.
</p>
        </div>


        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">

          {/* VEHICLE */}

          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">

            <div className="flex items-center gap-3">

              <span className="grid size-11 place-items-center rounded-2xl border border-champagne-400/25 bg-champagne-400/10 text-champagne-300">
                <CarFront className="size-5" />
              </span>

              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
                  Vehicle
                </p>

                <h2 className="mt-1 font-display text-xl font-semibold">
                  {car.name}
                </h2>
              </div>

            </div>


            <div className="mt-6 border-t border-white/[0.07] pt-5">

              {car.brandName && (
                <p className="text-sm text-zinc-400">
                  Brand:{" "}
                  <span className="text-zinc-200">
                    {car.brandName}
                  </span>
                </p>
              )}

              {car.year && (
                <p className="mt-2 text-sm text-zinc-400">
                  Model Year:{" "}
                  <span className="text-zinc-200">
                    {car.year}
                  </span>
                </p>
              )}

              <p className="mt-5 text-xs leading-5 text-zinc-500">
                The reservation applies to this vehicle
                model regardless of displayed color.
              </p>

            </div>

          </div>


          {/* BOOKING FORM */}

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8"
          >

            {/* BRANCH */}

            <label className="block">

              <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">
                <MapPin className="size-4" />
                Branch
              </span>

              <select
                value={branch}
                onChange={(e) =>
                  setBranch(
                    e.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-zinc-200 outline-none focus:border-champagne-400/50"
              >
                <option value="">
                  Select branch
                </option>

                <option value="nablus">
                  Nablus
                </option>

                <option value="ramallah">
                  Ramallah
                </option>
              </select>

            </label>


            {/* DATE */}

            <label className="mt-5 block">

              <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">
                <CalendarDays className="size-4" />
                Date
              </span>

              <input
  type="date"
  value={date}
  min={new Date().toLocaleDateString("en-CA")}
  onClick={(e) => {
    e.currentTarget.showPicker?.();
  }}
  onFocus={(e) => {
    e.currentTarget.showPicker?.();
  }}
  onChange={(e) => {
    setDate(e.target.value);
    setTime("");
  }}
  onKeyDown={(e) => {
    if (e.key !== "Tab") {
      e.preventDefault();
    }
  }}
  onPaste={(e) => {
    e.preventDefault();
  }}
  onDrop={(e) => {
    e.preventDefault();
  }}
  className="mt-2 w-full cursor-pointer rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-zinc-200 outline-none focus:border-champagne-400/50"
/>

            </label>


            {/* TIME */}

<label className="mt-5 block">

  <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">
    <Clock3 className="size-4" />
    Time
  </span>

  <select
    value={time}
    onChange={(e) =>
      setTime(e.target.value)
    }
    className="mt-2 w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-zinc-200 outline-none focus:border-champagne-400/50"
  >
    <option value="">
      Select time
    </option>

    <option value="09:00">
      09:00 AM
    </option>

    <option value="10:15">
      10:15 AM
    </option>

    <option value="11:30">
      11:30 AM
    </option>

    <option value="12:45">
      12:45 PM
    </option>

    <option value="14:00">
      02:00 PM
    </option>

    <option value="15:15">
      03:15 PM
    </option>

    <option value="16:30">
      04:30 PM
    </option>

  </select>

  <p className="mt-2 text-xs leading-5 text-zinc-500">
    Each test drive lasts 1 hour. A 15-minute handover
    period is reserved before the vehicle is available
    for the next appointment.
  </p>

</label>


            {/* NOTES */}

            <label className="mt-5 block">

              <span className="text-[11px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">
                Notes
              </span>

              <textarea
                value={notes}
                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Optional notes for the showroom team..."
                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-champagne-400/50"
              />

            </label>


            {/* ERROR */}

            {error && (
              <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}


            {/* SUCCESS */}

            {success && (
              <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {success}
              </div>
            )}


            {/* SUBMIT */}

            <button
              type="submit"
              disabled={submitting}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-champagne-400 py-3.5 text-sm font-bold tracking-[0.14em] text-obsidian-950 uppercase transition-colors hover:bg-champagne-300 disabled:opacity-60"
            >
              {submitting && (
                <Loader2 className="size-4 animate-spin" />
              )}

              {submitting
                ? "Submitting..."
                : "Request Test Drive"}
            </button>

          </form>

        </div>

      </div>

    </main>
  );
}