import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import axios from "axios";

import {
  CalendarDays,
  Clock3,
  MapPin,
  CarFront,
  Loader2,
} from "lucide-react";

import {
  userApi,
} from "@/lib/user-auth";


type TestDriveBooking = {
  id: number;
  carId: number;
  sellerId: number | null;
  carName: string;
  carYear: number;
  brandName: string;

  branch:
    | "nablus"
    | "ramallah";

  testDriveDate: string;
  testDriveTime: string;

  notes: string | null;

  status:
    | "pending"
    | "confirmed"
    | "completed"
    | "cancelled";

  createdAt: string;
};


export function MyTestDrivesPage() {
  const navigate =
    useNavigate();

  const [
    bookings,
    setBookings,
  ] = useState<TestDriveBooking[]>(
    []
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  /*
  |--------------------------------------------------------------------------
  | LOAD USER BOOKINGS
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
      !accessToken
      &&
      !refreshToken
    ) {
      navigate(
        "/login?redirect=/my-test-drives"
      );

      return;
    }


    async function loadBookings() {
      try {

        const response =
          await userApi.get(
            "/api/test-drives/my"
          );


        setBookings(
          response.data.data
            .bookings ?? []
        );

      } catch (error) {

        console.log(
          "MY TEST DRIVES ERROR:",
          error
        );


        if (
          axios.isAxiosError(error)
          &&
          error.response?.status
            === 401
        ) {
          setError(
            "Your session has expired. Please sign in again."
          );

          return;
        }


        setError(
          "Could not load your test drive bookings."
        );

      } finally {
        setLoading(false);
      }
    }


    loadBookings();

  }, [navigate]);


  /*
  |--------------------------------------------------------------------------
  | FORMAT DATE
  |--------------------------------------------------------------------------
  */

  function formatDate(
    value: string
  ) {
    const date =
      new Date(
        value + "T00:00:00"
      );

    return new Intl.DateTimeFormat(
      "en-US",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    ).format(date);
  }


  /*
  |--------------------------------------------------------------------------
  | FORMAT TIME
  |--------------------------------------------------------------------------
  */

  function formatTime(
    value: string
  ) {
    const [
      hourValue,
      minuteValue,
    ] = value.split(":");

    const hour =
      Number(hourValue);

    const minute =
      minuteValue ?? "00";

    const period =
      hour >= 12
        ? "PM"
        : "AM";

    const displayHour =
      hour % 12 || 12;

    return `${displayHour}:${minute} ${period}`;
  }


  /*
  |--------------------------------------------------------------------------
  | STATUS STYLE
  |--------------------------------------------------------------------------
  */

  function statusClass(
    status:
      TestDriveBooking["status"]
  ) {
    switch (status) {

      case "confirmed":
        return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

      case "completed":
        return "border-blue-500/20 bg-blue-500/10 text-blue-300";

      case "cancelled":
        return "border-red-500/20 bg-red-500/10 text-red-300";

      default:
        return "border-champagne-400/20 bg-champagne-400/10 text-champagne-300";
    }
  }


  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <main className="min-h-screen bg-obsidian-950 px-5 pt-32 text-white">

        <div className="mx-auto flex max-w-5xl justify-center py-32">

          <Loader2 className="size-7 animate-spin text-champagne-300" />

        </div>

      </main>
    );
  }


  return (
    <main className="min-h-screen bg-obsidian-950 px-5 pb-24 pt-32 text-white">

      <div className="mx-auto max-w-5xl">

        {/* HEADER */}

        <div className="mb-10">

          <p className="text-xs font-semibold tracking-[0.28em] text-champagne-300 uppercase">
            Your Account
          </p>

          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
            My Test Drives
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            Review your upcoming and previous
            test drive appointments.
          </p>

        </div>


        {/* ERROR */}

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}


        {/* EMPTY */}

        {!error
          &&
          bookings.length === 0
          && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-16 text-center">

              <CarFront className="mx-auto size-8 text-zinc-600" />

              <h2 className="mt-5 font-display text-xl font-semibold text-zinc-200">
                No test drives yet
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Your future test drive bookings
                will appear here.
              </p>

            </div>
          )}


        {/* BOOKINGS */}

        <div className="space-y-4">

          {bookings.map(
            (booking) => (

              <article
                key={booking.id}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-white/20"
              >

                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

                  {/* CAR */}

                  <div className="flex items-center gap-4">

                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-champagne-400/25 bg-champagne-400/10 text-champagne-300">

                      <CarFront className="size-5" />

                    </span>


                    <div>

                      <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-600 uppercase">
                        Vehicle
                      </p>

                      <h2 className="mt-1 font-display text-lg font-semibold">
                        {booking.carName}
                        </h2>

                      <p className="mt-1 text-xs text-zinc-500">
                        {booking.brandName}
                      </p>

                    </div>

                  </div>


                  {/* DETAILS */}

                  <div className="grid flex-1 gap-4 sm:grid-cols-3 md:max-w-xl">

                    {!booking.sellerId && (
  <div>
    <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-zinc-600 uppercase">
      <MapPin className="size-3.5" />
      Branch
    </p>

    <p className="mt-2 text-sm font-medium capitalize text-zinc-300">
      {booking.branch}
    </p>
  </div>
)}


                    <div>
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-zinc-600 uppercase">
                        <CalendarDays className="size-3.5" />
                        Date
                      </p>

                      <p className="mt-2 text-sm font-medium text-zinc-300">
                        {formatDate(
                          booking.testDriveDate
                        )}
                      </p>
                    </div>


                    <div>
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-zinc-600 uppercase">
                        <Clock3 className="size-3.5" />
                        Time
                      </p>

                      <p className="mt-2 text-sm font-medium text-zinc-300">
                        {formatTime(
                          booking.testDriveTime
                        )}
                      </p>
                    </div>

                  </div>


                  {/* STATUS */}

                  <span
                    className={[
                      "w-fit rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] uppercase",
                      statusClass(
                        booking.status
                      ),
                    ].join(" ")}
                  >
                    {booking.status}
                  </span>

                </div>


                {booking.notes && (
                  <div className="mt-5 border-t border-white/[0.07] pt-4">

                    <p className="text-[10px] font-semibold tracking-[0.16em] text-zinc-600 uppercase">
                      Notes
                    </p>

                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {booking.notes}
                    </p>

                  </div>
                )}

              </article>

            )
          )}

        </div>

      </div>

    </main>
  );
}