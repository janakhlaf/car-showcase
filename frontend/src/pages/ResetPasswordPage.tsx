import { useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Loader2,
  LockKeyhole,
} from "lucide-react";
import { toast } from "sonner";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const email = searchParams.get("email") ?? "";
  const otp = searchParams.get("otp") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (password.length < 8) {
      toast.error(
        "Password must be at least 8 characters"
      );
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        "/api/auth/reset-password",
        {
          email,
          otp,
          password,
        }
      );

      toast.success("Password reset successfully", {
        description:
          "You can now sign in with your new password.",
      });

      navigate(
        `/login?email=${encodeURIComponent(email)}`
      );
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ??
          "Could not reset password"
        : "Could not reset password";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-obsidian-950 px-5 pt-32 pb-24 text-white">
      <div className="mx-auto w-full max-w-md">

        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase transition-colors hover:text-champagne-300"
        >
          <ArrowLeft className="size-4" />
          Back to Sign In
        </Link>

        <div className="mt-8 text-center">

          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-champagne-400/30 bg-champagne-400/10 text-champagne-300">
            <LockKeyhole
              className="size-6"
              strokeWidth={1.5}
            />
          </span>

          <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">
            Reset Password
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Create a new password for your
            account.
          </p>

          {email && (
            <p className="mt-2 text-sm text-champagne-300">
              {email}
            </p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass mt-8 rounded-3xl p-6 md:p-8"
        >

          {/* NEW PASSWORD */}

          <label className="block">
            <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
              New Password
            </span>

            <span className="relative mt-2 block">
              <LockKeyhole
                className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500"
                aria-hidden
              />

              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter new password"
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm outline-none placeholder:text-zinc-600 focus:border-champagne-400/60 disabled:opacity-60"
              />
            </span>
          </label>

          {/* CONFIRM PASSWORD */}

          <label className="mt-5 block">
            <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
              Confirm New Password
            </span>

            <span className="relative mt-2 block">
              <LockKeyhole
                className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500"
                aria-hidden
              />

              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Confirm new password"
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm outline-none placeholder:text-zinc-600 focus:border-champagne-400/60 disabled:opacity-60"
              />
            </span>
          </label>

          {/* RESET BUTTON */}

          <button
            type="submit"
            disabled={loading}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-champagne-400 py-3.5 text-sm font-bold tracking-[0.14em] text-obsidian-950 uppercase transition-colors hover:bg-champagne-300 disabled:opacity-60"
          >
            {loading && (
              <Loader2 className="size-4 animate-spin" />
            )}

            {loading
              ? "Resetting..."
              : "Reset Password"}
          </button>
        </form>
      </div>
    </main>
  );
}