import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, LockKeyhole, Save } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

import { adminApi } from "@/lib/admin-auth";

type Permission = {
  id: number;
  name: string;
  label: string;
  category: string;
  createdAt: string;
};

type Role = {
  id: number;
  name: string;
  label: string;
  isSystem: boolean;
  createdAt: string;
  permissionIds: number[];
};

type RolesResponse = {
  roles: Role[];
  permissions: Permission[];
};

export function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingRoleId, setEditingRoleId] =
    useState<number | null>(null);

  const [draftPermissionIds, setDraftPermissionIds] =
    useState<number[]>([]);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadRoles() {
      try {
        const response =
          await adminApi.get("/api/admin/roles");

        const data =
          response.data.data as RolesResponse;

        setRoles(data.roles ?? []);
        setPermissions(data.permissions ?? []);
      } catch (error) {
        const message =
          axios.isAxiosError(error)
            ? error.response?.data?.error ??
              "Could not load roles"
            : "Could not load roles";

        toast.error(message);
      } finally {
        setLoading(false);
      }
    }

    loadRoles();
  }, []);

  const vehiclePermissions = useMemo(
  () =>
    permissions.filter((permission) =>
      permission.name.startsWith("cars.")
    ),
  [permissions]
);

const groupedPermissions = useMemo(() => {
  const groups: Record<string, Permission[]> = {};

  for (const permission of vehiclePermissions) {
    if (!groups[permission.category]) {
      groups[permission.category] = [];
    }

    groups[permission.category].push(permission);
  }

  return groups;
}, [vehiclePermissions]);

  function startEditing(role: Role) {
  if (role.isSystem) {
    return;
  }

  const vehiclePermissionIds =
    vehiclePermissions.map(
      (permission) => permission.id
    );

  setEditingRoleId(role.id);

  setDraftPermissionIds(
    role.permissionIds.filter((id) =>
      vehiclePermissionIds.includes(id)
    )
  );
}

  function cancelEditing() {
    setEditingRoleId(null);
    setDraftPermissionIds([]);
  }

  function togglePermission(permissionId: number) {
    setDraftPermissionIds((current) => {
      if (current.includes(permissionId)) {
        return current.filter(
          (id) => id !== permissionId
        );
      }

      return [
        ...current,
        permissionId
      ];
    });
  }

  async function savePermissions(roleId: number) {
    setSaving(true);

    try {
      await adminApi.put(
        `/api/admin/roles/${roleId}/permissions`,
        {
          permissionIds: draftPermissionIds,
        }
      );

      setRoles((currentRoles) =>
        currentRoles.map((role) =>
          role.id === roleId
            ? {
                ...role,
                permissionIds:
                  draftPermissionIds,
              }
            : role
        )
      );

      toast.success(
        "Role permissions updated"
      );

      setEditingRoleId(null);
      setDraftPermissionIds([]);

    } catch (error) {
      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.error ??
            "Could not update role permissions"
          : "Could not update role permissions";

      toast.error(message);

    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-5 pt-28 pb-16 lg:px-8">
        <p className="text-sm text-zinc-500">
          Loading roles...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pt-28 pb-16 lg:px-8">
      <header>
        <p className="font-display text-xs font-semibold tracking-[0.32em] text-champagne-400 uppercase">
          Admin Studio
        </p>

        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">
          Roles{" "}
          <span className="font-accent text-gradient-gold font-normal italic">
            & Permissions
          </span>
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Control what each admin role can do inside the dashboard.
        </p>
      </header>

      <div className="mt-8 grid gap-6">
        {roles.map((role) => {
          const isEditing =
            editingRoleId === role.id;

          return (
            <section
              key={role.id}
              className="glass rounded-3xl p-6 md:p-8"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <span className="grid size-12 place-items-center rounded-2xl border border-champagne-400/20 bg-champagne-400/10 text-champagne-300">
                    {role.isSystem ? (
                      <LockKeyhole className="size-5" />
                    ) : (
                      <ShieldCheck className="size-5" />
                    )}
                  </span>

                  <div>
                    <h2 className="font-display text-2xl font-bold">
                      {role.label}
                    </h2>

                    <p className="mt-1 text-sm text-zinc-500">
                      {role.isSystem
                        ? "Full system access. Locked."
                        : `${
    role.permissionIds.filter((id) =>
      vehiclePermissions.some(
        (permission) =>
          permission.id === id
      )
    ).length
  } active permissions`}
                    </p>
                  </div>
                </div>

                {!role.isSystem && !isEditing && (
                  <button
                    type="button"
                    onClick={() =>
                      startEditing(role)
                    }
                    className="rounded-full border border-white/10 px-5 py-2.5 text-xs font-semibold tracking-[0.14em] text-zinc-300 uppercase transition-colors hover:border-champagne-400/40 hover:text-champagne-300"
                  >
                    Edit Permissions
                  </button>
                )}
              </div>

              {role.isSystem && (
                <div className="mt-6 rounded-2xl border border-champagne-400/15 bg-champagne-400/[0.04] p-5">
                  <p className="text-sm text-zinc-400">
                    Super Admin always has full access and its permissions cannot be disabled.
                  </p>
                </div>
              )}

              {isEditing && (
                <div className="mt-7 border-t border-white/[0.07] pt-7">
                  <div className="grid gap-7">
                    {Object.entries(
                      groupedPermissions
                    ).map(
                      ([category, items]) => (
                        <div key={category}>
                          <p className="text-[11px] font-semibold tracking-[0.22em] text-zinc-500 uppercase">
                            {category}
                          </p>

                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {items.map(
                              (permission) => {
                                const enabled =
                                  draftPermissionIds.includes(
                                    permission.id
                                  );

                                return (
                                  <button
                                    key={
                                      permission.id
                                    }
                                    type="button"
                                    onClick={() =>
                                      togglePermission(
                                        permission.id
                                      )
                                    }
                                    className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-4 text-left transition-colors hover:border-white/15"
                                  >
                                    <span>
                                      <span className="block text-sm font-semibold text-zinc-200">
                                        {
                                          permission.label
                                        }
                                      </span>

                                      <span className="mt-1 block text-xs text-zinc-600">
                                        {
                                          permission.name
                                        }
                                      </span>
                                    </span>

                                    <span
                                      className={[
                                        "relative h-6 w-11 rounded-full transition-colors",
                                        enabled
                                          ? "bg-champagne-400"
                                          : "bg-zinc-800",
                                      ].join(" ")}
                                    >
                                      <span
                                        className={[
                                          "absolute top-1 size-4 rounded-full bg-white transition-all",
                                          enabled
                                            ? "left-6"
                                            : "left-1",
                                        ].join(" ")}
                                      />
                                    </span>
                                  </button>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={saving}
                      className="rounded-full border border-white/10 px-5 py-3 text-xs font-semibold tracking-[0.14em] text-zinc-400 uppercase hover:text-zinc-200 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        savePermissions(role.id)
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-champagne-400 px-6 py-3 text-xs font-bold tracking-[0.14em] text-obsidian-950 uppercase transition-colors hover:bg-champagne-300 disabled:opacity-60"
                    >
                      <Save className="size-4" />

                      {saving
                        ? "Saving..."
                        : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}