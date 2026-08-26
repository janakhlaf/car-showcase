import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  Loader2,
} from "lucide-react";

import {
  CarForm,
} from "@/components/admin/car-form";

import {
  userApi,
} from "@/lib/user-auth";

import type {
  Brand,
  CarWithBrand,
} from "@/db/schema";


type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone: string;
  sellerStatus: string;
};


/*
|--------------------------------------------------------------------------
| SELLER AUTH + BRANDS
|--------------------------------------------------------------------------
*/

async function getSellerPageData() {
  const profileResponse =
    await userApi.get(
      "/api/auth/profile"
    );

  const user: UserProfile | undefined =
    profileResponse.data
      ?.data
      ?.user;

  if (
    !user ||
    user.sellerStatus !==
      "approved"
  ) {
    throw new Error(
      "SELLER_NOT_APPROVED"
    );
  }


  const brandsResponse =
    await userApi.get(
      "/api/brands"
    );

  const brands: Brand[] =
    brandsResponse.data
      ?.data ?? [];

  return {
    user,
    brands,
  };
}


/*
|--------------------------------------------------------------------------
| LOADING
|--------------------------------------------------------------------------
*/

function SellerPageLoader() {
  return (
    <section className="min-h-screen bg-obsidian-950 pt-32 text-white">
      <div className="flex justify-center py-24">

        <Loader2 className="size-7 animate-spin text-champagne-300" />

      </div>
    </section>
  );
}


/*
|--------------------------------------------------------------------------
| NEW VEHICLE
|--------------------------------------------------------------------------
*/

export function SellerNewCarPage() {
  const navigate =
    useNavigate();

  const [
    brands,
    setBrands,
  ] =
    useState<Brand[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);


  useEffect(() => {
    async function loadPage() {
      try {

        const data =
          await getSellerPageData();

        setBrands(
          data.brands
        );

      } catch (error) {

        console.error(
          "SELLER ADD VEHICLE PAGE ERROR:",
          error
        );

        if (
          error instanceof Error &&
          error.message ===
            "SELLER_NOT_APPROVED"
        ) {
          navigate(
            "/profile"
          );

          return;
        }

        navigate(
          "/seller"
        );

      } finally {

        setLoading(
          false
        );
      }
    }

    loadPage();

  }, [navigate]);


  if (loading) {
    return (
      <SellerPageLoader />
    );
  }


  return (
    <CarForm
      mode="create"
      brands={brands}
      ownerType="seller"
    />
  );
}


/*
|--------------------------------------------------------------------------
| EDIT VEHICLE
|--------------------------------------------------------------------------
*/

export function SellerEditCarPage() {
  const navigate =
    useNavigate();

  const {
    id,
  } =
    useParams();


  const [
    brands,
    setBrands,
  ] =
    useState<Brand[]>([]);

  const [
    car,
    setCar,
  ] =
    useState<CarWithBrand | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);


  useEffect(() => {
    async function loadPage() {
      try {

        /*
        |--------------------------------------------------------------------------
        | VALIDATE ID
        |--------------------------------------------------------------------------
        */

        const carId =
          Number(id);

        if (
          !carId ||
          carId <= 0
        ) {
          navigate(
            "/seller"
          );

          return;
        }


        /*
        |--------------------------------------------------------------------------
        | CHECK SELLER + LOAD BRANDS
        |--------------------------------------------------------------------------
        */

        const data =
          await getSellerPageData();

        setBrands(
          data.brands
        );


        /*
        |--------------------------------------------------------------------------
        | LOAD SELLER VEHICLE
        |--------------------------------------------------------------------------
        */

        const carResponse =
          await userApi.get(
            `/api/sellers/cars/${carId}`
          );

        const loadedCar =
          carResponse.data
            ?.data;


        if (!loadedCar) {
          navigate(
            "/seller"
          );

          return;
        }


        /*
        |--------------------------------------------------------------------------
        | NORMALIZE DATA FOR CarForm
        |--------------------------------------------------------------------------
        */

        const normalizedCar: CarWithBrand = {
          ...loadedCar,

          id:
            Number(
              loadedCar.id
            ),

          brandId:
            Number(
              loadedCar.brandId
            ),

          year:
            Number(
              loadedCar.year
            ),

          price:
            Number(
              loadedCar.price
            ),

          featured:
            Boolean(
              loadedCar.featured
            ),

          images:
            Array.isArray(
              loadedCar.images
            )
              ? loadedCar.images
              : [],

          specs:
            loadedCar.specs ?? {},

          features:
            Array.isArray(
              loadedCar.features
            )
              ? loadedCar.features
              : [],
        };


        setCar(
          normalizedCar
        );

      } catch (error) {

        console.error(
          "SELLER EDIT VEHICLE PAGE ERROR:",
          error
        );

        if (
          error instanceof Error &&
          error.message ===
            "SELLER_NOT_APPROVED"
        ) {
          navigate(
            "/profile"
          );

          return;
        }

        navigate(
          "/seller"
        );

      } finally {

        setLoading(
          false
        );
      }
    }

    loadPage();

  }, [
    id,
    navigate,
  ]);


  if (loading) {
    return (
      <SellerPageLoader />
    );
  }


  if (!car) {
    return null;
  }


  return (
    <CarForm
      mode="edit"
      initial={car}
      brands={brands}
      ownerType="seller"
    />
  );
}