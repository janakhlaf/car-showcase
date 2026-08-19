import { adminApi } from "@/lib/admin-auth";
import { Eye, CalendarDays, Clock3, MapPin, CarFront } from "lucide-react";
import {useEffect,useState} from 'react'; import {useNavigate,useParams} from 'react-router-dom'; import axios from 'axios'; import type {Brand,CarWithBrand} from '@/db/schema'; import {CarsTable} from '@/components/admin/cars-table'; import {CarForm} from '@/components/admin/car-form'; import {LoginForm} from '@/components/admin/login-form';
export function AdminLoginPage(){return <div className="mx-auto flex min-h-screen max-w-md items-center px-5"><LoginForm/></div>}
function useAdminData() {
  const nav = useNavigate();

  const [data, setData] = useState<{
  cars: CarWithBrand[];
  brands: Brand[];
  name: string;
  role: "super_admin" | "manage_admin" | "editor_admin";
  permissions: string[];
} | null>(null);

  useEffect(() => {
    Promise.all([
  adminApi.get("/api/admin/me"),

  axios.get("/api/cars?limit=200"),

  axios.get("/api/brands"),
])
      .then(([m, c, b]) => {

  console.log("ME RESPONSE:", m.data);

  setData({
  cars: c.data.data,
  brands: b.data.data,
  name: m.data.data?.email ?? m.data.email ?? "Admin",
  role: m.data.data?.role ?? "editor_admin",
  permissions: m.data.data?.permissions ?? [],
});

})
      .catch((error) => {
  console.log("FULL ADMIN ERROR:", error);
  console.log("MESSAGE:", error.message);
  console.log("STATUS:", error.response?.status);
  console.log("DATA:", error.response?.data);

  nav("/admin/login");
});

  }, [nav]);

  return data;
}
export function AdminPage(){
  const d = useAdminData();

  return d
    ? (
      <CarsTable
        cars={d.cars}
        brands={d.brands}
        adminName={d.name}
        adminRole={d.role}
        adminPermissions={d.permissions}
      />
    )
    : (
      <div className="min-h-screen pt-40 text-center">
        Loading...
      </div>
    );
}
export function NewCarPage(){const d=useAdminData(); return d?<div className="mx-auto max-w-5xl px-5 pt-28 pb-16"><CarForm mode="create" brands={d.brands}/></div>:null}
export function EditCarPage(){const d=useAdminData(); const {id}=useParams(); const car=d?.cars.find(c=>String(c.id)===id); return d&&car?<div className="mx-auto max-w-5xl px-5 pt-28 pb-16"><CarForm mode="edit" initial={car} brands={d.brands}/></div>:null}
type TestDriveBooking = {
  id: number;
  user_id: number;
  car_id: number;
  name: string;
  email: string;
  phone: string;
  branch: string;
  test_drive_date: string;
  test_drive_time: string;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  car_name: string;
  car_year: number;
};

export function AdminTestDrivesPage() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<TestDriveBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBooking, setSelectedBooking] =
  useState<TestDriveBooking | null>(null);
  const [updatingStatus, setUpdatingStatus] =
  useState(false);

  useEffect(() => {
    adminApi
      .get("/api/admin/test-drives")
      .then((response) => {
        console.log("TEST DRIVES:", response.data);

        setBookings(
          response.data.data?.bookings ??
          response.data.bookings ??
          []
        );
      })
      .catch((error) => {
        console.error("TEST DRIVE ERROR:", error);

        if (error.response?.status === 401) {
          navigate("/admin/login");
          return;
        }

        setError("Unable to load test drive bookings.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate]);

  const formatDate = (date: string) => {
    return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (time: string) => {
    const [hourString, minute] = time.split(":");
    const hour = Number(hourString);

    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minute} ${period}`;
  };

  const updateBookingStatus = async (
  bookingId: number,
  status: "confirmed" | "completed" | "cancelled"
) => {
  try {
    setUpdatingStatus(true);
    setError("");

    const response = await adminApi.patch(
      `/api/admin/test-drives/${bookingId}/status`,
      {
        status,
      }
    );

    const newStatus =
      response.data.data?.booking?.status ??
      status;

    /*
     * Update booking in table
     */
    setBookings((currentBookings) =>
      currentBookings.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              status: newStatus,
            }
          : booking
      )
    );

    /*
     * Update open modal
     */
    setSelectedBooking((currentBooking) => {
      if (
        !currentBooking ||
        currentBooking.id !== bookingId
      ) {
        return currentBooking;
      }

      return {
        ...currentBooking,
        status: newStatus,
      };
    });

  } catch (error) {
    console.error(
      "UPDATE BOOKING STATUS ERROR:",
      error
    );

    if (axios.isAxiosError(error)) {
      setError(
        error.response?.data?.error ??
        error.response?.data?.message ??
        "Unable to update booking status."
      );
    } else {
      setError(
        "Unable to update booking status."
      );
    }

  } finally {
    setUpdatingStatus(false);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen pt-40 text-center">
        Loading test drives...
      </div>
    );
  }

  return (
    <main className="min-h-screen px-5 pb-20 pt-28">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-[#d7b36a]">
            Admin Studio
          </p>

          <h1 className="text-4xl font-semibold text-white">
            Test Drive Bookings
          </h1>

          <p className="mt-3 text-sm text-white/45">
            Review and manage customer test drive appointments.
          </p>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* EMPTY */}

        {!error && bookings.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-16 text-center">
            <CarFront className="mx-auto mb-4 h-8 w-8 text-white/30" />

            <p className="text-white">
              No test drive bookings yet.
            </p>

            <p className="mt-2 text-sm text-white/40">
              New customer requests will appear here.
            </p>
          </div>
        )}

        {/* BOOKINGS */}

        {bookings.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">

            {/* TABLE HEADER */}

            <div className="hidden grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_0.8fr_70px] gap-4 border-b border-white/10 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35 lg:grid">
              <span>Customer</span>
              <span>Vehicle</span>
              <span>Branch</span>
              <span>Date</span>
              <span>Time</span>
              <span>Status</span>
              <span></span>
            </div>

            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="grid gap-5 border-b border-white/10 px-6 py-5 last:border-b-0 lg:grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_0.8fr_70px] lg:items-center"
              >

                {/* CUSTOMER */}

                <div>
                  <p className="font-medium text-white">
                    {booking.name}
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    {booking.email}
                  </p>
                </div>

                {/* VEHICLE */}

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d7b36a]/20 bg-[#d7b36a]/10">
                    <CarFront className="h-4 w-4 text-[#d7b36a]" />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white">
                      {booking.car_year} {booking.car_name}
                    </p>

                    <p className="mt-1 text-xs text-white/35">
                      Car #{booking.car_id}
                    </p>
                  </div>
                </div>

                {/* BRANCH */}

                <div className="flex items-center gap-2 text-sm text-white/70">
                  <MapPin className="h-4 w-4 text-white/30" />
                  {booking.branch}
                </div>

                {/* DATE */}

                <div className="flex items-center gap-2 text-sm text-white/70">
                  <CalendarDays className="h-4 w-4 text-white/30" />
                  {formatDate(booking.test_drive_date)}
                </div>

                {/* TIME */}

                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Clock3 className="h-4 w-4 text-white/30" />
                  {formatTime(booking.test_drive_time)}
                </div>

                {/* STATUS */}

                <div>
                  <span className="inline-flex rounded-full border border-[#d7b36a]/25 bg-[#d7b36a]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#d7b36a]">
                    {booking.status}
                  </span>
                </div>

                {/* VIEW */}

                <button
                  type="button"
                  title="Manage booking"
                  onClick={() => setSelectedBooking(booking)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-[#d7b36a]/50 hover:bg-[#d7b36a]/10 hover:text-[#d7b36a]"
                >
                  <Eye className="h-4 w-4" />
                </button>

              </div>
            ))}

          </div>
                )}

      </div>

      {/* BOOKING DETAILS MODAL */}
      {selectedBooking && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0d0d0f] p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >

            {/* MODAL HEADER */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d7b36a]">
                  Booking Details
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Test Drive #{selectedBooking.id}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/50 transition hover:border-white/20 hover:text-white"
              >
                Close
              </button>
            </div>

            {/* DETAILS */}
            <div className="mt-7 grid gap-6 sm:grid-cols-2">

              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                  Customer
                </p>

                <p className="mt-2 text-sm font-medium text-white">
                  {selectedBooking.name}
                </p>

                <p className="mt-1 text-xs text-white/40">
                  {selectedBooking.email}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                  Phone
                </p>

                <p className="mt-2 text-sm font-medium text-white">
                  {selectedBooking.phone || "—"}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                  Vehicle
                </p>

                <p className="mt-2 text-sm font-medium text-white">
                  {selectedBooking.car_year} {selectedBooking.car_name}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                  Branch
                </p>

                <p className="mt-2 text-sm font-medium capitalize text-white">
                  {selectedBooking.branch}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                  Date
                </p>

                <p className="mt-2 text-sm font-medium text-white">
                  {formatDate(selectedBooking.test_drive_date)}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                  Time
                </p>

                <p className="mt-2 text-sm font-medium text-white">
                  {formatTime(selectedBooking.test_drive_time)}
                </p>
              </div>

            </div>

            {/* NOTES */}
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                Notes
              </p>

              <p className="mt-2 text-sm leading-6 text-white/60">
                {selectedBooking.notes || "No notes provided."}
              </p>
            </div>

            {/* STATUS */}
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                Status
              </p>

              <span className="mt-3 inline-flex rounded-full border border-[#d7b36a]/25 bg-[#d7b36a]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#d7b36a]">
                {selectedBooking.status}
              </span>
            </div>

            {/* ACTIONS */}
            <div className="mt-7 flex flex-wrap gap-3">

              {selectedBooking.status === "pending" && (
                <>
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() =>
                      updateBookingStatus(
                        selectedBooking.id,
                        "confirmed"
                      )
                    }
                    className="rounded-full bg-[#d7b36a] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updatingStatus
                      ? "Updating..."
                      : "Confirm Booking"}
                  </button>

                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() =>
                      updateBookingStatus(
                        selectedBooking.id,
                        "cancelled"
                      )
                    }
                    className="rounded-full border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updatingStatus
                      ? "Updating..."
                      : "Cancel Booking"}
                  </button>
                </>
              )}

              {selectedBooking.status === "confirmed" && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() =>
                    updateBookingStatus(
                      selectedBooking.id,
                      "completed"
                    )
                  }
                  className="rounded-full bg-emerald-500 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updatingStatus
                    ? "Updating..."
                    : "Complete"}
                </button>
              )}

              {(selectedBooking.status === "completed" ||
                selectedBooking.status === "cancelled") && (
                <p className="text-sm text-white/45">
                  This booking is closed and cannot be changed.
                </p>
              )}

            </div>

          </div>
        </div>
      )}

    </main>
  );
}