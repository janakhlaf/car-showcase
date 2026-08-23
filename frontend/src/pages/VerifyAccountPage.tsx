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
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export function VerifyAccountPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const email =
    searchParams.get("email") ?? "";

  const redirect =
    searchParams.get("redirect");

  const [otp, setOtp] = useState("");
  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error(
        "Enter the 6-digit verification code"
      );
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        "/api/auth/verify-account",
        {
          email,
          otp,
        }
      );

      toast.success(
        "Account verified successfully",
        {
          description:
            "You can now sign in to your account.",
        }
      );

      const loginUrl =
        `/login?email=${encodeURIComponent(email)}` +
        (redirect
          ? `&redirect=${encodeURIComponent(
              redirect
            )}`
          : "");

      navigate(loginUrl);

    } catch (error) {
      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.error ??
            "Could not verify account"
          : "Could not verify account";

      toast.error(message);

    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-obsidian-950 px-5 pt-32 pb-24 text-white">
      <div className="mx-auto w-full max-w-md">

        <Link
          to="/register"
          className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase transition-colors hover:text-champagne-300"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>

        <div className="mt-8 text-center">

          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-champagne-400/30 bg-champagne-400/10 text-champagne-300">
            <ShieldCheck
              className="size-6"
              strokeWidth={1.5}
            />
          </span>

          <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">
            Verify Your Account
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            We sent a 6-digit verification
            code to your email.
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
          <label className="block">

            <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
              Verification Code
            </span>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={otp}
              onChange={(e) =>
                setOtp(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }
              placeholder="000000"
              disabled={loading}
              className="mt-2 w-full rounded-xl border border-white/10 bg-obsidian-900/80 px-4 py-4 text-center text-xl font-semibold tracking-[0.5em] outline-none placeholder:text-zinc-700 focus:border-champagne-400/60 disabled:opacity-60"
            />
          </label>

          <button
            type="submit"
            disabled={
              loading ||
              otp.length !== 6
            }
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-champagne-400 py-3.5 text-sm font-bold tracking-[0.14em] text-obsidian-950 uppercase transition-colors hover:bg-champagne-300 disabled:opacity-60"
          >
            {loading && (
              <Loader2 className="size-4 animate-spin" />
            )}

            {loading
              ? "Verifying..."
              : "Verify Account"}
          </button>
        </form>

      </div>
    </main>
  );
}