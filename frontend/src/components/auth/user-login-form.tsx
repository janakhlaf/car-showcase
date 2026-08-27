import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import axios from "axios";
import {
  KeyRound,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

export function UserLoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | PREFILL EMAIL AFTER REGISTRATION
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const emailFromUrl =
      searchParams.get("email");

    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }
  }, [searchParams]);

  /*
  |--------------------------------------------------------------------------
  | LOGIN
  |--------------------------------------------------------------------------
  */

  async function onSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);

    try {
      const response = await axios.post(
        "/api/auth/login",
        {
          email: email.trim(),
          password,
        }
      );

      const data = response.data?.data;

      const accessToken =
        data?.accessToken;

      const refreshToken =
        data?.refreshToken;

      const user =
        data?.user;

      if (!accessToken || !user) {
        throw new Error(
          "Invalid login response"
        );
      }

      /*
      |--------------------------------------------------------------------------
      | SAVE USER SESSION
      |--------------------------------------------------------------------------
      */

      sessionStorage.setItem(
        "userAccessToken",
        accessToken
      );

      if (refreshToken) {
        sessionStorage.setItem(
          "userRefreshToken",
          refreshToken
        );
      }

      sessionStorage.setItem(
        "user",
        JSON.stringify(user)
      );
      window.dispatchEvent(
  new Event("user-auth-changed")
);

      /*
      |--------------------------------------------------------------------------
      | SUCCESS
      |--------------------------------------------------------------------------
      */

      toast.success("Welcome back", {
        description:
          "You are now signed in.",
      });

      /*
      |--------------------------------------------------------------------------
      | REDIRECT
      |--------------------------------------------------------------------------
      */

      const redirect =
        searchParams.get("redirect");

      if (
        redirect &&
        redirect.startsWith("/") &&
        !redirect.startsWith("//")
      ) {
        navigate(redirect);
        return;
      }

      navigate("/");
    } catch (error) {
      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.error ??
            "Sign in failed"
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
          <KeyRound
            className="size-6"
            strokeWidth={1.5}
          />
        </span>

        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">
          Sign In
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Sign in to manage your profile and
          test drives.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="glass mt-8 rounded-3xl p-6 md:p-8"
      >
        {/* EMAIL */}

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

        {/* PASSWORD */}

        <label className="mt-5 block">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
            Password
          </span>

          <span className="relative mt-2 block">
            <Lock
              className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />

            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm outline-none placeholder:text-zinc-600 focus:border-champagne-400/60 disabled:opacity-60"
            />
          </span>

          <div className="mt-2 text-right">
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-champagne-300 transition-colors hover:text-champagne-200"
            >
              Forgot Password?
            </Link>
          </div>
        </label>

        {/* SIGN IN */}

        <button
          type="submit"
          disabled={loading}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-champagne-400 py-3.5 text-sm font-bold tracking-[0.14em] text-obsidian-950 uppercase transition-colors hover:bg-champagne-300 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <KeyRound className="size-4" />
          )}

          {loading
            ? "Signing In..."
            : "Sign In"}
        </button>

        {/* CREATE ACCOUNT */}

        <p className="mt-6 text-center text-sm text-zinc-500">
          Don't have an account?{" "}
          <Link
  to={
    searchParams.get("redirect")
      ? `/register?redirect=${encodeURIComponent(
          searchParams.get("redirect")!
        )}`
      : "/register"
  }
>
            Create Account
          </Link>
        </p>
      </form>
    </div>
  );
}