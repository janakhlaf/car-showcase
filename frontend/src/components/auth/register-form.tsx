import { useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import axios from "axios";
import {
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

export function RegisterForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);

  async function onSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error(
        "Password must be at least 8 characters"
      );
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        "/api/auth/register",
        {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        }
      );

      toast.success("Account created", {
        description:
          "You can now sign in to your account.",
      });

      const redirect = searchParams.get("redirect");

const loginUrl =
  `/login?email=${encodeURIComponent(email.trim())}` +
  (redirect
    ? `&redirect=${encodeURIComponent(redirect)}`
    : "");

navigate(loginUrl);
    } catch (error) {
      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.error ??
            "Could not create account"
          : "Could not create account";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-champagne-400/30 bg-champagne-400/10 text-champagne-300">
          <UserPlus
            className="size-6"
            strokeWidth={1.5}
          />
        </span>

        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">
          Create Account
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Create your account to book and manage
          test drives.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="glass mt-8 rounded-3xl p-6 md:p-8"
      >
        {/* FULL NAME */}

        <label className="block">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
            Full Name
          </span>

          <span className="relative mt-2 block">
            <User
              className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />

            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Your full name"
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm outline-none placeholder:text-zinc-600 focus:border-champagne-400/60 disabled:opacity-60"
            />
          </span>
        </label>

        {/* EMAIL */}

        <label className="mt-5 block">
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

        {/* PHONE */}

        <label className="mt-5 block">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
            Phone Number
          </span>

          <span className="relative mt-2 block">
            <Phone
              className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />

            <input
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value)
              }
              placeholder="Phone number"
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
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Minimum 8 characters"
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm outline-none placeholder:text-zinc-600 focus:border-champagne-400/60 disabled:opacity-60"
            />
          </span>
        </label>

        {/* CONFIRM PASSWORD */}

        <label className="mt-5 block">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
            Confirm Password
          </span>

          <span className="relative mt-2 block">
            <Lock
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
              placeholder="Repeat your password"
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm outline-none placeholder:text-zinc-600 focus:border-champagne-400/60 disabled:opacity-60"
            />
          </span>
        </label>

        {/* SUBMIT */}

        <button
          type="submit"
          disabled={loading}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-champagne-400 py-3.5 text-sm font-bold tracking-[0.14em] text-obsidian-950 uppercase transition-colors hover:bg-champagne-300 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserPlus className="size-4" />
          )}

          {loading
            ? "Creating Account..."
            : "Create Account"}
        </button>

        {/* SIGN IN */}

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link
            to={
              searchParams.get("redirect")
                ? `/login?redirect=${encodeURIComponent(
                    searchParams.get("redirect")!
                  )}`
                : "/login"
            }
            className="font-semibold text-champagne-300 transition-colors hover:text-champagne-200"
          >
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}