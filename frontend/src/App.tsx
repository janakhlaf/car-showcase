import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";

import { HomePage } from "@/pages/HomePage";
import { CarsPage } from "@/pages/CarsPage";
import { CarDetailPage } from "@/pages/CarDetailPage";

import {
  AdminPage,
  AdminLoginPage,
  NewCarPage,
  EditCarPage,
} from "@/pages/AdminPages";
import { AdminUserForm } from "@/components/admin/admin-user-form";

import { AdminUsersPage } from "@/components/admin/admin-users-page";


export default function App() {
  return (
    <BrowserRouter>
      <Providers>

        <Navbar />

        <main id="content">
          <Routes>

            <Route
              path="/"
              element={<HomePage />}
            />

            <Route
              path="/cars"
              element={<CarsPage />}
            />

            <Route
              path="/cars/:id"
              element={<CarDetailPage />}
            />

            <Route
              path="/admin/login"
              element={<AdminLoginPage />}
            />

            <Route
              path="/admin"
              element={<AdminPage />}
            />

            <Route
              path="/admin/users"
              element={<AdminUsersPage />}
            />

            <Route
              path="/admin/cars/new"
              element={<NewCarPage />}
            />

            <Route
              path="/admin/cars/:id"
              element={<EditCarPage />}
            />
            <Route path="/admin/users/new" element={<AdminUserForm/>}/>

          </Routes>
        </main>

        <Footer />

      </Providers>
    </BrowserRouter>
  );
}