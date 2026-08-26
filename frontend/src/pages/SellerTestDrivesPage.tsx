import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  Phone,
  UserCircle,
  X,
} from "lucide-react";

import { userApi } from "@/lib/user-auth";

type Booking = {
  id: number;
  userId: number;
  carId: number;
  sellerId: number;

  customerName: string;
  customerEmail: string;
  customerPhone: string;

  testDriveDate: string;
  testDriveTime: string;

  notes?: string | null;

  status:
    | "pending"
    | "confirmed"
    | "cancelled"
    | "completed";

  carName: string;
  carYear: number;
  brandName: string;
};

export function SellerTestDrivesPage() {
  const navigate = useNavigate();

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [updatingId, setUpdatingId] =
    useState<number | null>(null);

  const [error, setError] =
    useState("");

  async function loadBookings() {
    try {
      setError("");

      const response =
        await userApi.get(
          "/api/seller/test-drives"
        );

      setBookings(
        response.data?.data?.bookings ?? []
      );

    } catch (error: any) {
      console.error(
        "SELLER TEST DRIVES ERROR:",
        error
      );

      setError(
        error?.response?.data?.error ??
          "Could not load test drive requests."
      );

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function changeStatus(
    bookingId: number,
    status:
      | "confirmed"
      | "cancelled"
      | "completed"
  ) {
    try {
      setUpdatingId(bookingId);
      setError("");

      await userApi.patch(
        `/api/seller/test-drives/${bookingId}/status`,
        {
          status,
        }
      );

      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                status,
              }
            : booking
        )
      );

    } catch (error: any) {
      setError(
        error?.response?.data?.error ??
          "Could not update booking."
      );

    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-obsidian-950 pt-32 text-white">
        <div className="flex justify-center py-24">
          <Loader2 className="size-7 animate-spin text-champagne-300" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-obsidian-950 px-5 pb-24 pt-32 text-white">
      <div className="mx-auto max-w-5xl">

        <button
          onClick={() =>
            navigate("/seller")
          }
          className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 hover:text-champagne-300"
        >
          <ArrowLeft className="size-4" />
          Seller Studio
        </button>

        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-champagne-400">
            Seller Studio
          </p>

          <h1 className="mt-3 font-display text-4xl font-bold">
            Test Drive Requests
          </h1>

          <p className="mt-3 text-sm text-zinc-500">
            Review test drive requests for your vehicles.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center">
            <CalendarDays className="mx-auto size-8 text-zinc-700" />

            <p className="mt-4 text-sm text-zinc-500">
              No test drive requests yet.
            </p>
          </div>
        ) : (
          <div className="space-y-5">

            {bookings.map((booking) => (
              <article
                key={booking.id}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-6"
              >

                <div className="flex flex-wrap items-start justify-between gap-5">

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne-400">
                      {booking.brandName}
                    </p>

                    <h2 className="mt-2 font-display text-xl font-semibold">
                      {booking.carYear} {booking.carName}
                    </h2>
                  </div>

                  <span className="rounded-full border border-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300">
                    {booking.status}
                  </span>

                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">

                  <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <UserCircle className="size-4" />
                      Customer
                    </div>

                    <p className="mt-2 font-medium">
                      {booking.customerName}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {booking.customerEmail}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Phone className="size-4" />
                      Phone
                    </div>

                    <p className="mt-2">
                      {booking.customerPhone}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <CalendarDays className="size-4" />
                      Date
                    </div>

                    <p className="mt-2">
                      {booking.testDriveDate}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Clock3 className="size-4" />
                      Time
                    </div>

                    <p className="mt-2">
                      {booking.testDriveTime}
                    </p>
                  </div>

                </div>

                {booking.notes && (
                  <div className="mt-4 rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                    <p className="text-xs text-zinc-500">
                      Notes
                    </p>

                    <p className="mt-2 text-sm text-zinc-300">
                      {booking.notes}
                    </p>
                  </div>
                )}

                {booking.status === "pending" && (
                  <div className="mt-6 flex flex-wrap gap-3">

                    <button
                      disabled={
                        updatingId === booking.id
                      }
                      onClick={() =>
                        changeStatus(
                          booking.id,
                          "confirmed"
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-black disabled:opacity-50"
                    >
                      <Check className="size-4" />
                      Confirm
                    </button>

                    <button
                      disabled={
                        updatingId === booking.id
                      }
                      onClick={() =>
                        changeStatus(
                          booking.id,
                          "cancelled"
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-full border border-red-500/30 px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <X className="size-4" />
                      Decline
                    </button>

                  </div>
                )}

                {booking.status === "confirmed" && (
                  <div className="mt-6">

                    <button
                      disabled={
                        updatingId === booking.id
                      }
                      onClick={() =>
                        changeStatus(
                          booking.id,
                          "completed"
                        )
                      }
                      className="rounded-full border border-champagne-400/30 px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-champagne-300"
                    >
                      Mark Completed
                    </button>

                  </div>
                )}

              </article>
            ))}

          </div>
        )}

      </div>
    </main>
  );
}