import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Car,
  Plus,
  Loader2,
  Store,
  Pencil,
  Trash2,
  Box,
  X,
  CalendarDays,
  Palette,
  BadgeDollarSign,
} from "lucide-react";

import { userApi } from "@/lib/user-auth";
import { ModelViewer } from "@/components/three/model-viewer";


type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone: string;
  sellerStatus: string;
};


type SellerCar = {
  id: number;

  sellerId:
    | number
    | null;

  approvalStatus:
    | "pending"
    | "approved"
    | "rejected";

  rejectionReason?:
    | string
    | null;

  name: string;

  brandId: number;
  brandName: string;

  year: number;
  price: number;

  color: string;
  colorHex: string;

  description: string;

  thumbnail: string;

  images: string[];

  modelPath?:
    | string
    | null;
};


/*
|--------------------------------------------------------------------------
| 3D PREVIEW MODAL
|--------------------------------------------------------------------------
*/

function Vehicle3DPreview({
  car,
  onClose,
}: {
  car: SellerCar;
  onClose: () => void;
}) {
  if (!car.modelPath) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-5 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="relative h-[88vh] w-full max-w-7xl overflow-hidden rounded-3xl border border-white/10 bg-obsidian-950 shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        {/* HEADER */}

        <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between border-b border-white/[0.07] bg-black/70 px-6 py-4 backdrop-blur-xl">

          <div className="min-w-0">

            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-champagne-400">
              Seller 3D Preview
            </p>

            <h2 className="mt-1 max-w-3xl truncate font-display text-lg font-semibold text-white">
              {car.name}
            </h2>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-400 transition hover:border-white/25 hover:bg-white/5 hover:text-white"
          >
            <X className="size-5" />
          </button>

        </div>


        {/* SAME VIEWER USED BY MAIN CAR PAGE */}

        <div className="h-full w-full pt-[73px]">

          <ModelViewer
            modelPath={car.modelPath}
            sketchfabUrl={null}
            color={car.colorHex}
            colorName={car.color}
            className="h-full w-full"
          />

        </div>

      </div>
    </div>
  );
}


/*
|--------------------------------------------------------------------------
| SELLER DASHBOARD
|--------------------------------------------------------------------------
*/

export function SellerDashboardPage() {
  const navigate =
    useNavigate();

  const [
    user,
    setUser,
  ] =
    useState<UserProfile | null>(
      null
    );

  const [
    cars,
    setCars,
  ] =
    useState<SellerCar[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<number | null>(
      null
    );

  const [
    previewCar,
    setPreviewCar,
  ] =
    useState<SellerCar | null>(
      null
    );
    const [
  deleteCar,
  setDeleteCar,
] =
  useState<SellerCar | null>(
    null
  );


  /*
  |--------------------------------------------------------------------------
  | LOAD SELLER CARS
  |--------------------------------------------------------------------------
  */

  async function loadSellerCars() {
    const response =
      await userApi.get(
        "/api/sellers/cars"
      );

    const rows =
      response.data?.data ?? [];

    console.log(
      "SELLER CARS:",
      rows
    );

    setCars(rows);
  }


  /*
  |--------------------------------------------------------------------------
  | CHECK SELLER
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    async function loadDashboard() {
      try {

        const response =
          await userApi.get(
            "/api/auth/profile"
          );

        const currentUser =
          response.data
            ?.data
            ?.user;

        if (!currentUser) {
          navigate(
            "/login"
          );

          return;
        }

        if (
          currentUser
            .sellerStatus
          !==
          "approved"
        ) {
          navigate(
            "/profile"
          );

          return;
        }

        setUser(
          currentUser
        );

        await loadSellerCars();

      } catch (error) {

        console.error(
          "SELLER DASHBOARD ERROR:",
          error
        );

        navigate(
          "/login"
        );

      } finally {

        setLoading(
          false
        );
      }
    }

    loadDashboard();

  }, [navigate]);


  /*
  |--------------------------------------------------------------------------
  | DELETE
  |--------------------------------------------------------------------------
  */

  async function deleteVehicle(
  car: SellerCar
) {
  try {
    setDeletingId(
      car.id
    );

    await userApi.delete(
      `/api/sellers/cars/${car.id}`
    );

    setCars(
      (current) =>
        current.filter(
          (item) =>
            item.id !==
            car.id
        )
    );

    setDeleteCar(null);

  } catch (error) {

    console.error(
      "DELETE SELLER VEHICLE ERROR:",
      error
    );

    window.alert(
      "Could not delete vehicle."
    );

  } finally {

    setDeletingId(
      null
    );
  }
}


  /*
  |--------------------------------------------------------------------------
  | STATUS STYLE
  |--------------------------------------------------------------------------
  */

  function statusClasses(
    status:
      SellerCar["approvalStatus"]
  ) {

    if (
      status === "approved"
    ) {
      return (
        "border-emerald-500/30 " +
        "bg-emerald-500/10 " +
        "text-emerald-400"
      );
    }

    if (
      status === "rejected"
    ) {
      return (
        "border-red-500/30 " +
        "bg-red-500/10 " +
        "text-red-400"
      );
    }

    return (
      "border-amber-400/30 " +
      "bg-amber-400/10 " +
      "text-amber-300"
    );
  }


  function statusLabel(
    status:
      SellerCar["approvalStatus"]
  ) {

    if (
      status === "approved"
    ) {
      return "Live · Approved";
    }

    if (
      status === "rejected"
    ) {
      return "Rejected";
    }

    return "Pending Review";
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


  if (!user) {
    return null;
  }


  /*
  |--------------------------------------------------------------------------
  | PAGE
  |--------------------------------------------------------------------------
  */

  return (
    <>
      <section className="min-h-screen bg-obsidian-950 px-5 pb-24 pt-32 text-white">

        <div className="mx-auto max-w-6xl">


          {/* PAGE HEADER */}

          <div className="mb-10">

            <p className="font-display text-xs font-semibold uppercase tracking-[0.32em] text-champagne-400">
              Seller Studio
            </p>

            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
              My Vehicles
            </h1>

            <p className="mt-3 text-sm text-zinc-500">
              Welcome, {user.name}. Manage your
              vehicle listings and review their
              publication status.
            </p>

          </div>


          {/* ADD VEHICLE */}

          <div className="mb-8 flex flex-wrap items-center gap-3">

  <button
    type="button"
    onClick={() =>
      navigate("/seller/cars/new")
    }
    className="flex items-center gap-2 rounded-full bg-champagne-300 px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-black transition hover:bg-champagne-200"
  >
    <Plus className="size-4" />
    Add Vehicle
  </button>

  <button
    type="button"
    onClick={() =>
      navigate("/seller/test-drives")
    }
    className="flex items-center gap-2 rounded-full border border-champagne-400/30 px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-champagne-300 transition hover:bg-champagne-400/10"
  >
    <CalendarDays className="size-4" />
    Test Drive Requests
  </button>

</div>


          {/* INVENTORY */}

          <div className="rounded-[28px] border border-white/10 bg-white/[0.02] p-6 md:p-8">

            <div className="flex items-center gap-4">

              <span className="grid size-12 place-items-center rounded-2xl border border-champagne-400/20 bg-champagne-400/10 text-champagne-300">

                <Store className="size-5" />

              </span>

              <div>

                <h2 className="font-display text-lg font-semibold">
                  Seller Inventory
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Your submitted vehicles and their review status.
                </p>

              </div>

            </div>


            {/* EMPTY */}

            {cars.length === 0 ? (

              <div className="mt-8 flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10">

                <Car className="mb-4 size-8 text-zinc-600" />

                <p className="text-sm text-zinc-400">
                  No vehicles listed yet.
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  Add your first vehicle to get started.
                </p>

              </div>

            ) : (

              /*
              |--------------------------------------------------------------------------
              | VEHICLE CARDS
              |--------------------------------------------------------------------------
              */

              <div className="mt-8 space-y-5">

                {cars.map(
                  (car) => (

                    <article
                      key={car.id}
                      className="group overflow-hidden rounded-3xl border border-white/[0.08] bg-black/20 transition duration-300 hover:border-champagne-400/25"
                    >

                      <div className="grid md:grid-cols-[280px_1fr]">


                        {/* IMAGE */}

                        <div className="relative min-h-[250px] overflow-hidden bg-black">

                          <img
                            src={
                              car.thumbnail
                            }
                            alt={
                              car.name
                            }
                            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />

                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/25" />


                          {/* 3D BUTTON */}

                          <button
                            type="button"
                            disabled={
                              !car.modelPath
                            }
                            onClick={() =>
                              setPreviewCar(
                                car
                              )
                            }
                            className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-xl transition hover:border-champagne-400/50 hover:text-champagne-300 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Box className="size-3.5" />

                            Preview 360°
                          </button>

                        </div>


                        {/* INFORMATION */}

                        <div className="flex flex-col justify-between p-6 md:p-7">

                          <div>


                            {/* NAME + STATUS */}

                            <div className="flex flex-wrap items-start justify-between gap-4">

                              <div className="min-w-0">

                                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-champagne-400">
                                  {car.brandName}
                                </p>

                                <h3 className="mt-2 max-w-xl truncate font-display text-2xl font-semibold tracking-tight text-white">
                                  {car.name}
                                </h3>

                                <p className="mt-1 text-xs text-zinc-600">
                                  Listing #{car.id}
                                </p>

                              </div>


                              <span
                                className={`shrink-0 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] ${statusClasses(
                                  car.approvalStatus
                                )}`}
                              >
                                {statusLabel(
                                  car.approvalStatus
                                )}
                              </span>

                            </div>


                            {/* INFO CARDS */}

                            <div className="mt-7 grid gap-3 sm:grid-cols-3">


                              {/* YEAR */}

                              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">

                                <div className="flex items-center gap-2 text-zinc-600">

                                  <CalendarDays className="size-4" />

                                  <span className="text-[9px] font-semibold uppercase tracking-[0.2em]">
                                    Model Year
                                  </span>

                                </div>

                                <p className="mt-2 text-sm font-semibold text-zinc-200">
                                  {car.year}
                                </p>

                              </div>


                              {/* COLOR */}

                              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">

                                <div className="flex items-center gap-2 text-zinc-600">

                                  <Palette className="size-4" />

                                  <span className="text-[9px] font-semibold uppercase tracking-[0.2em]">
                                    Paint
                                  </span>

                                </div>

                                <div className="mt-2 flex items-center gap-2">

                                  <span
                                    className="size-3 rounded-full border border-white/20"
                                    style={{
                                      backgroundColor:
                                        car.colorHex,
                                    }}
                                  />

                                  <span className="text-sm font-semibold text-zinc-200">
                                    {car.color}
                                  </span>

                                </div>

                              </div>


                              {/* PRICE */}

                              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">

                                <div className="flex items-center gap-2 text-zinc-600">

                                  <BadgeDollarSign className="size-4" />

                                  <span className="text-[9px] font-semibold uppercase tracking-[0.2em]">
                                    Price
                                  </span>

                                </div>

                                <p className="mt-2 font-display text-lg font-semibold text-champagne-300">
                                  $
                                  {Number(
                                    car.price
                                  ).toLocaleString()}
                                </p>

                              </div>

                            </div>


                            {/* REJECTION MESSAGE */}

                            {car.approvalStatus ===
                              "rejected" &&
                              car.rejectionReason && (

                                <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">

                                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-400">
                                    Review Feedback
                                  </p>

                                  <p className="mt-2 text-sm text-red-300/80">
                                    {
                                      car.rejectionReason
                                    }
                                  </p>

                                </div>

                              )}

                          </div>


                          {/* BUTTONS */}

                          <div className="mt-7 flex flex-wrap items-center justify-end gap-3 border-t border-white/[0.06] pt-5">


                            {/* 360 */}

                            <button
                              type="button"
                              disabled={
                                !car.modelPath
                              }
                              onClick={() =>
                                setPreviewCar(
                                  car
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-400 transition hover:border-champagne-400/40 hover:text-champagne-300 disabled:opacity-40"
                            >
                              <Box className="size-4" />

                              Preview 360°
                            </button>
                            {/* TEST DRIVE AVAILABILITY */}

{car.approvalStatus === "approved" && (
  <button
    type="button"
    onClick={() =>
      navigate(
        `/seller/cars/${car.id}/availability`
      )
    }
    className="inline-flex items-center gap-2 rounded-xl border border-champagne-400/25 px-4 py-2.5 text-xs font-semibold text-champagne-300 transition hover:border-champagne-400/50 hover:bg-champagne-400/10"
  >
    <CalendarDays className="size-4" />

    Test Drive Availability
  </button>
)}
{/* TEST DRIVE REQUESTS */}

{car.approvalStatus === "approved" && (
  <button
    type="button"
    onClick={() =>
      navigate("/seller/test-drives")
    }
    className="inline-flex items-center gap-2 rounded-xl border border-champagne-400/25 px-4 py-2.5 text-xs font-semibold text-champagne-300 transition hover:border-champagne-400/50 hover:bg-champagne-400/10"
  >
    <CalendarDays className="size-4" />
    Test Drive Requests
  </button>
)}


                            {/* EDIT */}

                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/seller/cars/${car.id}/edit`
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:border-champagne-400/40 hover:text-champagne-300"
                            >
                              <Pencil className="size-4" />

                              Edit Vehicle
                            </button>


                            {/* DELETE */}

                            <button
                              type="button"
                              disabled={
                                deletingId ===
                                car.id
                              }
                              onClick={() =>
                                setDeleteCar(
                                  car
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-2.5 text-xs font-semibold text-red-400/80 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                            >

                              {deletingId ===
                              car.id ? (

                                <Loader2 className="size-4 animate-spin" />

                              ) : (

                                <Trash2 className="size-4" />

                              )}

                              Delete
                            </button>

                          </div>

                        </div>

                      </div>

                    </article>

                  )
                )}

              </div>

            )}

          </div>

        </div>

      </section>


      {/* SAME 3D VIEWER AS MAIN WEBSITE */}

      {previewCar && (
        <Vehicle3DPreview
          car={previewCar}
          onClose={() =>
            setPreviewCar(
              null
            )
          }
        />
      )}
      {deleteCar && (
  <div
    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 px-5 backdrop-blur-md"
    onClick={() => {
      if (!deletingId) {
        setDeleteCar(null);
      }
    }}
  >
    <div
      className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b0c] shadow-2xl"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <div className="p-7">

        <div className="flex items-start gap-4">

          <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-red-500/20 bg-red-500/10">
            <Trash2 className="size-5 text-red-400" />
          </div>

          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-red-400">
              Permanent Action
            </p>

            <h2 className="mt-2 font-display text-xl font-semibold text-white">
              Delete Vehicle?
            </h2>
          </div>

        </div>

        <p className="mt-6 text-sm leading-6 text-zinc-400">
          This vehicle will be permanently removed,
          including all uploaded images, color variants
          and 3D model files.
        </p>

        <div className="mt-5 rounded-2xl border border-red-500/10 bg-red-500/[0.05] px-4 py-3">
          <p className="text-xs text-red-300/80">
            This action cannot be undone.
          </p>
        </div>

      </div>

      <div className="flex justify-end gap-3 border-t border-white/10 px-7 py-5">

        <button
          type="button"
          disabled={
            deletingId === deleteCar.id
          }
          onClick={() =>
            setDeleteCar(null)
          }
          className="rounded-xl border border-white/10 px-5 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/5 disabled:opacity-40"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={
            deletingId === deleteCar.id
          }
          onClick={() =>
            deleteVehicle(deleteCar)
          }
          className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deletingId ===
          deleteCar.id ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="size-4" />
              Delete Vehicle
            </>
          )}
        </button>

      </div>

    </div>
  </div>
)}


    </>
  );
}