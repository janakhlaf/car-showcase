import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { AdminLayout } from "@/components/admin/admin-layout";
import { adminApi } from "@/lib/admin-auth";

import {
  Users,
  CarFront,
  Store,
  CalendarDays,
  ClipboardCheck,
  UserCheck,
} from "lucide-react";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";


/* =========================================================
   TYPES
========================================================= */

type DashboardStats = {
  totalUsers: number;
  totalVehicles: number;
  totalSellers: number;
  testDriveRequests: number;
  pendingVehicleReviews: number;
  pendingSellerRequests: number;

  mostRequestedVehicle: {
    id: number;
    name: string;
    requestCount: number;
  } | null;

  bookingStatuses: {
    status: string;
    total: number;
  }[];

  topVehicles: {
  id: number;
  name: string;
  requestCount: number;
}[];

testDriveActivity: {
  date: string;
  label: string;
  requests: number;
}[];
};


/* =========================================================
   CHART COLORS
========================================================= */

const STATUS_COLORS = [
  "#d7b36a",
  "#7dd3fc",
  "#86efac",
  "#f87171",
  "#c4b5fd",
];


/* =========================================================
   ADMIN DASHBOARD
========================================================= */

export function AdminDashboardPage() {
  const [stats, setStats] =
    useState<DashboardStats | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  /* =========================================================
     LOAD DASHBOARD DATA
  ========================================================= */

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await adminApi.get(
            "/api/admin/dashboard-stats"
          );

        console.log(
          "DASHBOARD RESPONSE:",
          response.data
        );

        setStats(
          response.data?.data ??
          response.data
        );

      } catch (error) {
        console.error(
          "Dashboard stats error:",
          error
        );

        setError(
          "Could not load dashboard statistics."
        );

      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-10 lg:px-8">

          <div className="flex min-h-[400px] items-center justify-center">

            <div className="text-center">

              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#d7b36a]" />

              <p className="mt-4 text-sm text-white/40">
                Loading dashboard...
              </p>

            </div>

          </div>

        </div>
      </AdminLayout>
    );
  }


  /* =========================================================
     ERROR
  ========================================================= */

  if (error || !stats) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-10 lg:px-8">

          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">

            <p className="font-medium text-red-400">
              Dashboard Error
            </p>

            <p className="mt-2 text-sm text-white/50">
              {error ||
                "Dashboard statistics are unavailable."}
            </p>

          </div>

        </div>
      </AdminLayout>
    );
  }


  /* =========================================================
     DASHBOARD
  ========================================================= */

  return (
    <AdminLayout>

      <div className="mx-auto max-w-7xl px-5 pb-16 pt-10 lg:px-8">


        {/* ================= HEADER ================= */}

        <div className="mb-8">

          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d7b36a]">
            Admin Overview
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-white/40">
            Overview of users, vehicles, sellers and test drive activity.
          </p>

        </div>


        {/* ================= STAT CARDS ================= */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={
              <Users className="h-5 w-5" />
            }
          />

          <StatCard
            title="Total Vehicles"
            value={stats.totalVehicles}
            icon={
              <CarFront className="h-5 w-5" />
            }
          />

          <StatCard
            title="Total Sellers"
            value={stats.totalSellers}
            icon={
              <Store className="h-5 w-5" />
            }
          />

          <StatCard
            title="Test Drive Requests"
            value={stats.testDriveRequests}
            icon={
              <CalendarDays className="h-5 w-5" />
            }
          />

          <StatCard
            title="Pending Vehicle Reviews"
            value={stats.pendingVehicleReviews}
            icon={
              <ClipboardCheck className="h-5 w-5" />
            }
          />

          <StatCard
            title="Pending Seller Requests"
            value={stats.pendingSellerRequests}
            icon={
              <UserCheck className="h-5 w-5" />
            }
          />

        </div>


        {/* ================= MOST REQUESTED ================= */}

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
            Most Requested Vehicle
          </p>

          {stats.mostRequestedVehicle ? (

            <div className="mt-4 flex items-end justify-between gap-4">

              <div>

                <h2 className="text-2xl font-semibold text-white">
                  {stats.mostRequestedVehicle.name}
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  Highest number of test drive requests
                </p>

              </div>


              <div className="text-right">

                <p className="text-3xl font-bold text-[#d7b36a]">
                  {stats.mostRequestedVehicle.requestCount}
                </p>

                <p className="text-xs uppercase tracking-wider text-white/30">
                  Requests
                </p>

              </div>

            </div>

          ) : (

            <p className="mt-4 text-sm text-white/40">
              No test drive requests yet.
            </p>

          )}

        </div>


        {/* ================= CHARTS ================= */}

        <div className="mt-6 grid gap-4 xl:grid-cols-2">


          {/* TEST DRIVE STATUS CHART */}

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
                Test Drive Status
              </p>

              <h3 className="mt-2 text-lg font-semibold text-white">
                Requests by Status
              </h3>
            </div>


            {stats.bookingStatuses.length > 0 ? (

              <div className="mt-5 h-[320px] w-full">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <PieChart>

  <Pie
    data={stats.bookingStatuses}
    dataKey="total"
    nameKey="status"
    cx="50%"
    cy="45%"
    innerRadius={72}
    outerRadius={105}
    paddingAngle={4}
    label={({ value }) => `${value}`}
    labelLine={false}
  >
    {stats.bookingStatuses.map(
      (_, index) => (
        <Cell
          key={index}
          fill={
            STATUS_COLORS[
              index % STATUS_COLORS.length
            ]
          }
        />
      )
    )}
  </Pie>

  {/* الرقم الكلي داخل الدائرة */}
  <text
    x="50%"
    y="42%"
    textAnchor="middle"
    dominantBaseline="middle"
    fill="#ffffff"
    fontSize="28"
    fontWeight="700"
  >
    {stats.testDriveRequests}
  </text>

  <text
    x="50%"
    y="50%"
    textAnchor="middle"
    dominantBaseline="middle"
    fill="rgba(255,255,255,0.4)"
    fontSize="10"
    letterSpacing="1.5"
  >
    TOTAL REQUESTS
  </text>

  <Tooltip
    contentStyle={{
      backgroundColor: "#111113",
      border:
        "1px solid rgba(255,255,255,0.1)",
      borderRadius: "12px",
      color: "#fff",
    }}
    itemStyle={{
      color: "#fff",
    }}
  />

  <Legend
    verticalAlign="bottom"
    iconType="circle"
    formatter={(value) => (
      <span
        style={{
          color: "rgba(255,255,255,0.65)",
          textTransform: "capitalize",
        }}
      >
        {value}
      </span>
    )}
  />

</PieChart>

                </ResponsiveContainer>

              </div>

            ) : (

              <p className="mt-6 text-sm text-white/40">
                No booking data yet.
              </p>

            )}

          </div>


          {/* TOP REQUESTED VEHICLES CHART */}

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

            <div>

              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
                Vehicle Demand
              </p>

              <h3 className="mt-2 text-lg font-semibold text-white">
                Top Requested Vehicles
              </h3>

            </div>


            {stats.topVehicles.length > 0 ? (

              <div className="mt-5 h-[320px] w-full">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
  data={stats.topVehicles}
  layout="vertical"
  margin={{
    top: 5,
    right: 35,
    left: 20,
    bottom: 5,
  }}
>

  <CartesianGrid
    strokeDasharray="3 3"
    stroke="rgba(255,255,255,0.06)"
    horizontal={false}
  />

  <XAxis
    type="number"
    allowDecimals={false}
    axisLine={false}
    tickLine={false}
    tick={{
      fill: "rgba(255,255,255,0.35)",
      fontSize: 11,
    }}
  />

  <YAxis
    type="category"
    dataKey="name"
    width={125}
    axisLine={false}
    tickLine={false}
    tick={{
      fill: "rgba(255,255,255,0.65)",
      fontSize: 11,
    }}
  />

  <Tooltip
    cursor={{
      fill: "rgba(255,255,255,0.03)",
    }}
    contentStyle={{
      backgroundColor: "#111113",
      border:
        "1px solid rgba(255,255,255,0.1)",
      borderRadius: "12px",
      color: "#fff",
    }}
    labelStyle={{
      color: "#d7b36a",
    }}
  />

  <Bar
    dataKey="requestCount"
    name="Requests"
    fill="#d7b36a"
    radius={[0, 7, 7, 0]}
    maxBarSize={32}
    label={{
      position: "right",
      fill: "#ffffff",
      fontSize: 11,
    }}
  />

</BarChart>

                </ResponsiveContainer>

              </div>

            ) : (

              <p className="mt-6 text-sm text-white/40">
                No vehicle requests yet.
              </p>

            )}

          </div>

        </div>
        {/* ================= TEST DRIVE ACTIVITY ================= */}

<div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">

  <div className="flex items-start justify-between gap-4">

    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
        Test Drive Activity
      </p>

      <h3 className="mt-2 text-lg font-semibold text-white">
        Requests Over The Last 7 Days
      </h3>

      <p className="mt-1 text-sm text-white/35">
        Daily test drive request activity
      </p>
    </div>

    <div className="rounded-xl border border-[#d7b36a]/20 bg-[#d7b36a]/10 px-4 py-2 text-right">
      <p className="text-xl font-bold text-[#d7b36a]">
        {stats.testDriveActivity.reduce(
          (total, day) => total + day.requests,
          0
        )}
      </p>

      <p className="text-[10px] uppercase tracking-wider text-white/35">
        Last 7 Days
      </p>
    </div>

  </div>

  <div className="mt-8 h-[320px] w-full">

    <ResponsiveContainer
      width="100%"
      height="100%"
    >

      <LineChart
        data={stats.testDriveActivity}
        margin={{
          top: 10,
          right: 20,
          left: -15,
          bottom: 5,
        }}
      >

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.06)"
          vertical={false}
        />

        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{
            fill: "rgba(255,255,255,0.4)",
            fontSize: 11,
          }}
        />

        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{
            fill: "rgba(255,255,255,0.35)",
            fontSize: 11,
          }}
        />

        <Tooltip
          contentStyle={{
            backgroundColor: "#111113",
            border:
              "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            color: "#fff",
          }}
          labelStyle={{
            color: "#d7b36a",
          }}
        />

        <Line
  type="monotone"
  dataKey="requests"
  name="Requests"
  stroke="#d7b36a"
  strokeWidth={3}
  label={{
    position: "top",
    fill: "#d7b36a",
    fontSize: 12,
    fontWeight: 600,
  }}
  dot={{
    r: 5,
    fill: "#d7b36a",
    stroke: "#0b0b0d",
    strokeWidth: 2,
  }}
  activeDot={{
    r: 7,
  }}
/>

      </LineChart>

    </ResponsiveContainer>

  </div>

</div>

      </div>

    </AdminLayout>
  );
}


/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: ReactNode;
}) {
  return (

    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#d7b36a]/20 hover:bg-white/[0.05]">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-xs uppercase tracking-[0.18em] text-white/35">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold">
            {value.toLocaleString()}
          </p>

        </div>


        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d7b36a]/10 text-[#d7b36a]">
          {icon}
        </div>

      </div>

    </div>
  );
}