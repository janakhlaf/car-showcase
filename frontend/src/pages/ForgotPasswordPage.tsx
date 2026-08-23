import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Loader2,
  Mail,
  ArrowLeft,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<"email" | "whatsapp">("email");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);

    try {
      await axios.post(
        "/api/auth/forgot-password",
        {
          email: email.trim(),
          method,
        }
      );

      toast.success("Verification code sent", {
        description:
          method === "email"
            ? "Check your email for the 6-digit OTP code."
            : "Check your WhatsApp for the 6-digit OTP code.",
      });
      navigate(
        `/verify-otp?email=${encodeURIComponent(email.trim())}`
        );

    } catch (error) {
      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.error ??
            "Could not send verification code"
          : "Could not send verification code";

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
            <Mail
              className="size-6"
              strokeWidth={1.5}
            />
          </span>

          <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">
            Forgot Password
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Enter the email associated with your
            account and we'll send you a verification
            code.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass mt-8 rounded-3xl p-6 md:p-8"
        >
          <label className="block">
            <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
              Email
            </span>

            <span className="relative mt-2 block">
              <Mail
                className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500"
                aria-hidden
              />

              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm outline-none placeholder:text-zinc-600 focus:border-champagne-400/60 disabled:opacity-60"
              />
            </span>
          </label>

          <div className="mt-5">
            <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
              Send code via
            </span>

            <div className="mt-2 grid grid-cols-2 gap-3">

              <button
                type="button"
                disabled={loading}
                onClick={() => setMethod("email")}
                className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all ${
                  method === "email"
                    ? "border-champagne-400/60 bg-champagne-400/10 text-champagne-300"
                    : "border-white/10 bg-obsidian-900/80 text-zinc-500 hover:border-white/20"
                }`}
              >
                <Mail className="size-4" />
                Email
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => setMethod("whatsapp")}
                className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all ${
                  method === "whatsapp"
                    ? "border-champagne-400/60 bg-champagne-400/10 text-champagne-300"
                    : "border-white/10 bg-obsidian-900/80 text-zinc-500 hover:border-white/20"
                }`}
              >
                <MessageCircle className="size-4" />
                WhatsApp
              </button>

            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-champagne-400 py-3.5 text-sm font-bold tracking-[0.14em] text-obsidian-950 uppercase transition-colors hover:bg-champagne-300 disabled:opacity-60"
          >
            {loading && (
              <Loader2 className="size-4 animate-spin" />
            )}

            {loading
              ? "Sending Code..."
              : "Send Code"}
          </button>
        </form>
      </div>
    </main>
  );
}