import { adminApi } from "@/lib/admin-auth";
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
