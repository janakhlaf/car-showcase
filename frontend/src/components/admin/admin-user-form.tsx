import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  KeyRound,
  Mail,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { adminApi } from "@/lib/admin-auth";

type AdminRole =
  | "super_admin"
  | "manage_admin"
  | "editor_admin";

export function AdminUserForm() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] =
    useState<AdminRole>("editor_admin");

  const [saving, setSaving] = useState(false);

  async function onSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!name.trim()) {
      return toast.error("Name is required");
    }

    if (!email.trim()) {
      return toast.error("Email is required");
    }

    if (password.length < 8) {
      return toast.error(
        "Temporary password must be at least 8 characters"
      );
    }

    setSaving(true);

    try {
      await adminApi.post(
        "/api/admin/users",
        {
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        }
      );

      toast.success(
        "Admin user created. They must change their password on first login."
      );

      navigate("/admin/users");

    } catch (error) {
      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.error ??
            "Could not create user"
          : "Could not create user";

      toast.error(message);

    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pt-28 pb-16 lg:px-8">

      <div className="mb-8">
        <button
          type="button"
          onClick={() =>
            navigate("/admin/users")
          }
          className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase hover:text-champagne-300"
        >
          ← Users
        </button>

        <p className="mt-8 font-display text-xs font-semibold tracking-[0.32em] text-champagne-400 uppercase">
          Admin Studio
        </p>

        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
          Add{" "}
          <span className="font-accent text-gradient-gold font-normal italic">
            user
          </span>
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Create an admin account and assign its permissions.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="glass rounded-3xl p-6 md:p-8"
      >

        <label className="block">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
            Name
          </span>

          <span className="relative mt-2 block">
            <User className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500" />

            <input
              type="text"
              required
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="e.g. Ahmad Saleh"
              className="w-full rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm outline-none placeholder:text-zinc-600 focus:border-champagne-400/60"
            />
          </span>
        </label>

        <label className="mt-5 block">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
            Email
          </span>

          <span className="relative mt-2 block">
            <Mail className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500" />

            <input
              type="email"
              required
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="user@example.com"
              className="w-full rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm outline-none placeholder:text-zinc-600 focus:border-champagne-400/60"
            />
          </span>
        </label>

        <label className="mt-5 block">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
            Temporary password
          </span>

          <span className="relative mt-2 block">
            <KeyRound className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500" />

            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Minimum 8 characters"
              className="w-full rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm outline-none placeholder:text-zinc-600 focus:border-champagne-400/60"
            />
          </span>

          <p className="mt-2 text-xs text-zinc-600">
            The new admin will be required to change this password on first login.
          </p>
        </label>

        <label className="mt-5 block">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
            Admin role
          </span>

          <span className="relative mt-2 block">
            <ShieldCheck className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500" />

            <select
              value={role}
              onChange={(e) =>
                setRole(
                  e.target.value as AdminRole
                )
              }
              className="w-full appearance-none rounded-xl border border-white/10 bg-obsidian-900/80 py-3 pr-4 pl-11 text-sm outline-none focus:border-champagne-400/60"
            >
              <option value="super_admin">
                Super Admin
              </option>

              <option value="manage_admin">
                Manage Admin
              </option>

              <option value="editor_admin">
                Editor Admin
              </option>
            </select>
          </span>
        </label>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-6 text-zinc-500">
          {role === "super_admin" && (
            <p>
              Full access, including admin account management and all vehicle actions.
            </p>
          )}

          {role === "manage_admin" && (
            <p>
              Can add and delete vehicles, but cannot edit vehicles or manage admin accounts.
            </p>
          )}

          {role === "editor_admin" && (
            <p>
              Can edit vehicles only. Cannot add, delete, or manage admin accounts.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-champagne-400 py-3.5 text-sm font-bold tracking-[0.14em] text-obsidian-950 uppercase transition-colors hover:bg-champagne-300 disabled:opacity-60"
        >
          <UserPlus className="size-4" />

          {saving
            ? "Creating..."
            : "Create user"}
        </button>

      </form>
    </div>
  );
}