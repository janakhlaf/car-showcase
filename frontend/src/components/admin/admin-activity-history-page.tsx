import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "@/lib/admin-auth";

type ActivityLog = {
  id: number;
  actor_id: number | null;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  description: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export function AdminActivityHistoryPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        setError("");

        const response =
          await adminApi.get("/api/activity-logs");

        setLogs(
          response.data.data.data ?? []
        );
      } catch (err) {
  console.error(err);

  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    (err as any).response?.status === 401
  ) {
    navigate("/admin/login");
    return;
  }

  setError(
    "Could not load activity history."
  );
} finally {
        setLoading(false);
      }
    }

    loadLogs();
}, [navigate]);

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-7xl">

        <h1 className="text-3xl font-semibold">
          Activity History
        </h1>

        <p className="mt-2 text-muted-foreground">
          System activity and important account changes.
        </p>

        {loading && (
          <p className="mt-8">
            Loading activity history...
          </p>
        )}

        {error && (
          <p className="mt-8 text-red-500">
            {error}
          </p>
        )}

        {!loading &&
          !error &&
          logs.length === 0 && (
            <p className="mt-8">
              No activity found.
            </p>
          )}

        {!loading &&
          !error &&
          logs.length > 0 && (
            <div className="mt-8 overflow-x-auto">
              <table className="w-full border-collapse text-left">

                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3">
                      ID
                    </th>

                    <th className="px-4 py-3">
                      Actor
                    </th>

                    <th className="px-4 py-3">
                      Action
                    </th>

                    <th className="px-4 py-3">
                      Entity
                    </th>

                    <th className="px-4 py-3">
                      Description
                    </th>

                    <th className="px-4 py-3">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-white/5"
                    >
                      <td className="px-4 py-3">
                        {log.id}
                      </td>

                      <td className="px-4 py-3">
                        <div>
                          {log.actor_role}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          ID: {log.actor_id ?? "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {log.action}
                      </td>

                      <td className="px-4 py-3">
                        <div>
                          {log.entity_type}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          ID: {log.entity_id ?? "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {log.description}
                      </td>

                      <td className="px-4 py-3">
                        {new Date(
                          log.created_at
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}

      </div>
    </div>
  );
}