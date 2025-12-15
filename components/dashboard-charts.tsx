"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { DashboardStats } from "@/app/(app)/dashboard/actions"

type Props = {
  stats: DashboardStats
}

export function DashboardCharts({ stats }: Props) {
  // Prepare data for charts
  const checkInData = stats.checkInStats.map((item) => ({
    time: item.hour,
    count: item.count,
  }))

  const checkOutData = stats.checkOutStats.map((item) => ({
    time: item.hour,
    count: item.count,
  }))

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Check-in Chart */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">สถิติการเข้างาน</h3>
        {checkInData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={checkInData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(228 228 231)" />
              <XAxis
                dataKey="time"
                stroke="rgb(113 113 122)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="rgb(113 113 122)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid rgb(228 228 231)",
                  borderRadius: "0.5rem",
                }}
              />
              <Bar dataKey="count" fill="rgb(24 24 27)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-zinc-500">
            ยังไม่มีข้อมูลการเข้างาน
          </div>
        )}
      </div>

      {/* Check-out Chart */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">สถิติการเลิกงาน</h3>
        {checkOutData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={checkOutData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(228 228 231)" />
              <XAxis
                dataKey="time"
                stroke="rgb(113 113 122)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="rgb(113 113 122)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid rgb(228 228 231)",
                  borderRadius: "0.5rem",
                }}
              />
              <Bar dataKey="count" fill="rgb(24 24 27)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-zinc-500">
            ยังไม่มีข้อมูลการเลิกงาน
          </div>
        )}
      </div>
    </div>
  )
}



