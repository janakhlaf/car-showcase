import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";

import { HomePage } from "@/pages/HomePage";
import { CarsPage } from "@/pages/CarsPage";
import { CarDetailPage } from "@/pages/CarDetailPage";
import { ChangePasswordPage } from "@/components/admin/change-password-page";
import { VerifyOtpPage } from "./pages/VerifyOtpPage";

import {
  AdminPage,
  AdminLoginPage,
  NewCarPage,
  EditCarPage,
  AdminTestDrivesPage,

} from "@/pages/AdminPages";
import { AdminUserForm } from "@/components/admin/admin-user-form";

import { AdminUsersPage } from "@/components/admin/admin-users-page";
import { AdminProfilePage } from "@/components/admin/admin-profile-page";
import { AdminRolesPage } from "@/components/admin/admin-roles-page";
import { WebsiteContentPage } from "@/components/admin/website-content-page";
import { RegisterPage } from "@/pages/RegisterPage";
import { LoginPage } from "@/pages/LoginPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { BookTestDrivePage } from "@/pages/BookTestDrivePage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import {
  MyTestDrivesPage,
} from "@/pages/MyTestDrivesPage";
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
              path="/register"
              element={<RegisterPage />}
            />
            <Route
                path="/login"
                element={<LoginPage />}
              />
              <Route
                path="/forgot-password"
                element={<ForgotPasswordPage />}
              />
              <Route path="/verify-otp" element={<VerifyOtpPage />} />

              <Route
                path="/reset-password"
                element={<ResetPasswordPage />}
              />

              <Route
                path="/profile"
                element={<ProfilePage />}
              />

            <Route
              path="/admin/login"
              element={<AdminLoginPage />}
            />

            <Route
              path="/admin/change-password"
              element={<ChangePasswordPage />}
            />

            <Route
              path="/admin"
              element={<AdminPage />}
            />
            <Route
              path="/admin/test-drives"
              element={<AdminTestDrivesPage />}
            />

            <Route path="/admin/profile" element={<AdminProfilePage/>}/>

            <Route
              path="/admin/users"
              element={<AdminUsersPage />}
            />

            <Route
              path="/admin/roles"
              element={<AdminRolesPage />}
            />

            <Route
              path="/admin/content"
              element={<WebsiteContentPage />}
            />

            <Route
              path="/admin/cars/new"
              element={<NewCarPage />}
            />

            <Route
              path="/admin/cars/:id"
              element={<EditCarPage />}
            />
            <Route
              path="/cars/:id/test-drive"
              element={<BookTestDrivePage />}
            />
            <Route path="/admin/users/new" element={<AdminUserForm/>}/>
            <Route
              path="/my-test-drives"
              element={<MyTestDrivesPage />}
            />

          </Routes>
          
        </main>

        <Footer />

      </Providers>
    </BrowserRouter>
  );
}