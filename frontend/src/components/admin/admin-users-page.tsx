import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Users } from "lucide-react";import { toast } from "sonner";
import { adminApi } from "@/lib/admin-auth";
import axios from "axios";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: "super_admin" | "manage_admin" | "editor_admin";
  mustChangePassword: boolean;
  createdAt: string;
  isPrimaryAdmin: boolean;
};

type CurrentAdmin = {
  id: number;
  name: string;
  email: string;
  role: "super_admin" | "manage_admin" | "editor_admin";
  mustChangePassword: boolean;
  createdAt: string;
};

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentAdmin, setCurrentAdmin] =
    useState<CurrentAdmin | null>(null);

  const [loading, setLoading] = useState(true);
  const [changingRoleId, setChangingRoleId] =
  useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] =
  useState<number | null>(null);

  useEffect(() => {
    async function loadPage() {
      try {
        const meResponse =
          await adminApi.get("/api/admin/me");

        const me =
          meResponse.data.data as CurrentAdmin;

        setCurrentAdmin(me);

        if (me.role !== "super_admin") {
          setUsers([]);
          return;
        }

        const usersResponse =
          await adminApi.get("/api/admin/users");

        setUsers(
          usersResponse.data.data ?? []
        );
      } catch {
        toast.error(
          "Could not load admin users"
        );
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, []);
  async function changeRole(
  userId: number,
  newRole: AdminUser["role"]
) {
  setChangingRoleId(userId);

  try {
    await adminApi.patch(
      `/api/admin/users/${userId}/role`,
      {
        role: newRole,
      }
    );

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === userId
          ? {
              ...user,
              role: newRole,
            }
          : user
      )
    );

    toast.success("Admin role updated");

  } catch (error) {
    const message =
      axios.isAxiosError(error)
        ? error.response?.data?.error ??
          "Could not update admin role"
        : "Could not update admin role";

    toast.error(message);

  } finally {
    setChangingRoleId(null);
  }
}
async function deleteUser(
  userId: number,
  userName: string
) {
  const confirmed = window.confirm(
    `Delete admin "${userName}"? This action cannot be undone.`
  );

  if (!confirmed) return;

  setDeletingUserId(userId);

  try {
    await adminApi.delete(
      `/api/admin/users/${userId}`
    );

    setUsers((currentUsers) =>
      currentUsers.filter(
        (user) => user.id !== userId
      )
    );

    toast.success("Admin account deleted");

  } catch (error) {
    const message =
      axios.isAxiosError(error)
        ? error.response?.data?.error ??
          "Could not delete admin"
        : "Could not delete admin";

    toast.error(message);

  } finally {
    setDeletingUserId(null);
  }
}

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-5 pt-28 pb-16 lg:px-8">
        <p className="text-sm text-zinc-500">
          Loading...
        </p>
      </div>
    );
  }

  if (
    currentAdmin &&
    currentAdmin.role !== "super_admin"
  ) {
    return (
      <div className="mx-auto max-w-7xl px-5 pt-28 pb-16 lg:px-8">
        <div className="glass rounded-3xl p-8">
          <p className="font-display text-xs font-semibold tracking-[0.32em] text-champagne-400 uppercase">
            Admin Studio
          </p>

          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
            Access denied
          </h1>

          <p className="mt-3 text-sm text-zinc-500">
            Only Super Admin accounts can manage admin users.
          </p>
        </div>
      </div>
    );
  }

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

        {currentAdmin?.role ===
          "super_admin" && (
          <Link
            to="/admin/users/new"
            className="inline-flex items-center gap-2 rounded-full bg-champagne-400 px-6 py-3 text-sm font-bold tracking-[0.12em] text-obsidian-950 uppercase transition-colors hover:bg-champagne-300"
          >
            <Plus className="size-4" />
            Add user
          </Link>
        )}
      </header>

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.07]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.02] text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
              <th className="px-5 py-4 font-semibold">
                Name
              </th>

              <th className="px-5 py-4 font-semibold">
                Email
              </th>

              <th className="px-5 py-4 font-semibold">
                Role
              </th>

              <th className="px-5 py-4 font-semibold">
                Created
              </th>
              <th className="px-5 py-4 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
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

                  <td className="px-5 py-4">
                    {currentAdmin?.id === user.id ||user.isPrimaryAdmin ? (
                      <span className="text-zinc-400">
                        {user.role === "super_admin"
                          ? "Super Admin"
                          : user.role === "manage_admin"
                          ? "Manage Admin"
                          : "Editor Admin"}
                      </span>
                    ) : (
                      <select
                        value={user.role}
                        disabled={changingRoleId === user.id}
                        onChange={(e) =>
                          changeRole(
                            user.id,
                            e.target.value as AdminUser["role"]
                          )
                        }
                        className="rounded-xl border border-white/10 bg-obsidian-900 px-3 py-2 text-sm text-zinc-300 outline-none transition-colors hover:border-champagne-400/40 focus:border-champagne-400/60 disabled:opacity-50"
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
                    )}
                  </td>

                  <td className="px-5 py-4 text-zinc-500">
                      {user.createdAt}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {user.id !== currentAdmin?.id &&!user.isPrimaryAdmin && (
                        <button
                          type="button"
                          disabled={deletingUserId === user.id}
                          onClick={() => deleteUser(user.id, user.name)}
                          title="Delete admin"
                          className="inline-grid size-9 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
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