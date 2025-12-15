"use client"

import { Users, Fingerprint, Calendar, Database } from "lucide-react"
import { formatThaiDateLong } from "@/lib/utils/format-thai-date"
import type { DashboardStats } from "@/app/(app)/dashboard/actions"

type Props = {
  stats: DashboardStats
}

export function DashboardStatsCards({ stats }: Props) {
  const formattedDate = stats.lastUpdatedDate
    ? (() => {
        const [year, month, day] = stats.lastUpdatedDate!.split("-").map(Number)
        return formatThaiDateLong(new Date(year, month - 1, day))
      })()
    : "ยังไม่มีข้อมูล"

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-medium text-zinc-600">จำนวนพนักงาน</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">
              {stats.totalEmployees.toLocaleString("th-TH")}
            </p>
          </div>
          <div className="rounded-full bg-zinc-100 p-3">
            <Users className="h-6 w-6 text-zinc-600" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-600">จำนวน Record</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">
              {stats.totalFingerprints.toLocaleString("th-TH")}
            </p>
          </div>
          <div className="rounded-full bg-zinc-100 p-3">
            <Database className="h-6 w-6 text-zinc-600" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-600">อัพเดทล่าสุด</p>
            <p className="mt-2 text-lg font-semibold text-zinc-900">{formattedDate}</p>
          </div>
          <div className="rounded-full bg-zinc-100 p-3">
            <Calendar className="h-6 w-6 text-zinc-600" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-600">วันที่มีข้อมูล</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">
              {stats.totalDaysWithData.toLocaleString("th-TH")}
            </p>
            <p className="mt-1 text-sm text-zinc-500">จำนวนวันที่แตกต่างกันที่มีการบันทึกเวลา</p>
          </div>
          <div className="rounded-full bg-zinc-100 p-3">
            <Fingerprint className="h-6 w-6 text-zinc-600" />
          </div>
        </div>
      </div>
    </div>
  )
}
