import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Lock } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { adminApi } from "@/lib/admin-auth";

export function ChangePasswordPage() {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword.length < 8) {
      return toast.error(
        "New password must be at least 8 characters"
      );
    }

    if (newPassword !== confirmPassword) {
      return toast.error(
        "New passwords do not match"
      );
    }

    setSaving(true);

    try {
      await adminApi.post(
        "/api/admin/change-password",
        {
          currentPassword,
          newPassword,
          confirmPassword,
        }
      );

      sessionStorage.setItem(
        "adminMustChangePassword",
        "false"
      );

      sessionStorage.removeItem(
        "adminAccessToken"
      );

      sessionStorage.removeItem(
        "adminRefreshToken"
      );

      toast.success(
        "Password changed successfully"
      );

      navigate("/admin/login");

    } catch (error) {
      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.error ??
            "Could not change password"
          : "Could not change password";

      toast.error(message);

    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-5">
      <div className="w-full">
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-champagne-400/30 bg-champagne-400/10 text-champagne-300">
            <KeyRound
              className="size-6"
              strokeWidth={1.5}
            />
          </span>

          <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">
            Change Password
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Create your own password before accessing the admin dashboard.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="glass mt-8 rounded-3xl p-6 md:p-8"
        >
          <label className="block">
            <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
              Current temporary password
            </span>

            <span className="relative mt-2 block">
              <Lock className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500" />

              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) =>
                  setCurrentPassword(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm outline-none focus:border-champagne-400/60"
              />
            </span>
          </label>

          <label className="mt-5 block">
            <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
              New password
            </span>

            <span className="relative mt-2 block">
              <Lock className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500" />

              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm outline-none focus:border-champagne-400/60"
              />
            </span>
          </label>

          <label className="mt-5 block">
            <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
              Confirm new password
            </span>

            <span className="relative mt-2 block">
              <Lock className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500" />

              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm outline-none focus:border-champagne-400/60"
              />
            </span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-champagne-400 py-3.5 text-sm font-bold tracking-[0.14em] text-obsidian-950 uppercase transition-colors hover:bg-champagne-300 disabled:opacity-60"
          >
            <KeyRound className="size-4" />

            {saving
              ? "Changing..."
              : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}