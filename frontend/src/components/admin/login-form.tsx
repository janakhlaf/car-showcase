

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { KeyRound, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);

  try {
    const response = await axios.post(
      "/api/admin/login",
      {
        email,
        password,
      }
    );

    const accessToken = response.data.data.accessToken;
const refreshToken = response.data.data.refreshToken;
const admin = response.data.data.admin;

sessionStorage.setItem(
  "adminAccessToken",
  accessToken
);

sessionStorage.setItem(
  "adminRefreshToken",
  refreshToken
);

sessionStorage.setItem(
  "adminEmail",
  admin.email
);

sessionStorage.setItem(
  "adminName",
  admin.name
);

    toast.success("Welcome back", {
      description:
        "Signed in to the admin dashboard.",
    });

    navigate("/admin");

  } catch (error) {
    const message = axios.isAxiosError(error)
      ? (
          error.response?.data?.error
          ?? "Sign in failed"
        )
      : "Sign in failed";

    toast.error(message);

  } finally {
    setLoading(false);
  }
}

  return (
    <div className="w-full">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-champagne-400/30 bg-champagne-400/10 text-champagne-300">
          <ShieldCheck className="size-6" strokeWidth={1.5} />
        </span>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">Admin Studio</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Sign in to manage the collection.
        </p>
      </div>

      <form onSubmit={onSubmit} className="glass mt-8 rounded-3xl p-6 md:p-8">
        <label className="block">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Email</span>
          <span className="relative mt-2 block">
            <Mail className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@showroom.com"
              className="w-full rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm outline-none placeholder:text-zinc-600 focus:border-champagne-400/60"
            />
          </span>
        </label>

        <label className="mt-5 block">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Password</span>
          <span className="relative mt-2 block">
            <Lock className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm outline-none placeholder:text-zinc-600 focus:border-champagne-400/60"
            />
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-champagne-400 py-3.5 text-sm font-bold tracking-[0.14em] text-obsidian-950 uppercase transition-colors hover:bg-champagne-300 disabled:opacity-60"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          {loading ? "Verifying…" : "Sign in"}
        </button>

        <p className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-center text-xs leading-relaxed text-zinc-500">
          Demo credentials · <span className="font-semibold text-zinc-300">admin@showroom.com</span> /{" "}
          <span className="font-semibold text-zinc-300">admin123</span>
        </p>
      </form>
    </div>
  );
}
