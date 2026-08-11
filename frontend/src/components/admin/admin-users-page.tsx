import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin-auth";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .get("/api/admin/users")
      .then((response) => {
        setUsers(response.data.data ?? []);
      })
      .catch(() => {
        toast.error("Could not load admin users");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-5 pt-28 pb-16 lg:px-8">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-xs font-semibold tracking-[0.32em] text-champagne-400 uppercase">
            Admin Studio
          </p>

          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">
            User{" "}
            <span className="font-accent text-gradient-gold font-normal italic">
              management
            </span>
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Manage accounts that can access the admin dashboard.
          </p>
        </div>

        <Link
          to="/admin/users/new"
          className="inline-flex items-center gap-2 rounded-full bg-champagne-400 px-6 py-3 text-sm font-bold tracking-[0.12em] text-obsidian-950 uppercase transition-colors hover:bg-champagne-300"
        >
          <Plus className="size-4" />
          Add user
        </Link>
      </header>

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.07]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.02] text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
              <th className="px-5 py-4 font-semibold">Name</th>
              <th className="px-5 py-4 font-semibold">Email</th>
              <th className="px-5 py-4 font-semibold">Created</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-5 py-12 text-center text-zinc-500"
                >
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-5 py-12 text-center text-zinc-500"
                >
                  No admin users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-white/[0.05] last:border-0"
                >
                  <td className="px-5 py-4 font-semibold text-zinc-100">
                    <span className="inline-flex items-center gap-2">
                      <Users className="size-4 text-champagne-400" />
                      {user.name}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-zinc-400">
                    {user.email}
                  </td>

                  <td className="px-5 py-4 text-zinc-500">
                    {user.createdAt}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}