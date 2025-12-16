"use client"

import { useState, useTransition, useEffect } from "react"
import { getDashboardStats, getAttendanceRanking } from "./actions"
import { DashboardStatsCards } from "@/components/dashboard-stats-cards"
import { DashboardCharts } from "@/components/dashboard-charts"
import { AttendanceRankingTable } from "@/components/attendance-ranking-table"
import type { DashboardStats, AttendanceRanking } from "./actions"
import { DateRangeFilter, type DateRangeFilterValue } from "@/components/date-range-filter"
import { formatThaiDateLong } from "@/lib/utils/format-thai-date"

export default function DashboardPage() {
  const currentYear = new Date().getFullYear()
  const [filterValue, setFilterValue] = useState<DateRangeFilterValue>({
    type: "year",
    year: currentYear,
  })
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [rankings, setRankings] = useState<AttendanceRanking[]>([])
  const [onlyWithEmployee, setOnlyWithEmployee] = useState(false)
  const [isPending, startTransition] = useTransition()

  function loadStats(filter: DateRangeFilterValue, onlyWithEmployeeFilter: boolean) {
    startTransition(async () => {
      const [statsData, rankingsData] = await Promise.all([
        getDashboardStats(
          filter.type,
          filter.date,
          filter.month,
          filter.type === "year" ? filter.year : filter.type === "month" ? filter.year : null
        ),
        getAttendanceRanking(
          filter.type,
          filter.date,
          filter.month,
          filter.type === "year" ? filter.year : filter.type === "month" ? filter.year : null,
          onlyWithEmployeeFilter
        ),
      ])
      setStats(statsData)
      setRankings(rankingsData)
    })
  }

  // Load stats when filter changes
  useEffect(() => {
    loadStats(filterValue, onlyWithEmployee)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterValue.type,
    filterValue.date?.getTime(),
    filterValue.month,
    filterValue.year,
    onlyWithEmployee,
  ])

  function handleFilterChange(value: DateRangeFilterValue) {
    setFilterValue(value)
  }

  function getFilterText(filter: DateRangeFilterValue): string {
    switch (filter.type) {
      case "all":
        return "ทั้งหมด"
      case "day":
        return filter.date ? `วันที่ ${formatThaiDateLong(filter.date)}` : ""
      case "month": {
        if (!filter.month || !filter.year) return ""
        const monthNames = [
          "มกราคม",
          "กุมภาพันธ์",
          "มีนาคม",
          "เมษายน",
          "พฤษภาคม",
          "มิถุนายน",
          "กรกฎาคม",
          "สิงหาคม",
          "กันยายน",
          "ตุลาคม",
          "พฤศจิกายน",
          "ธันวาคม",
        ]
        return `เดือน ${monthNames[filter.month - 1]} ${filter.year + 543}`
      }
      case "year": {
        if (!filter.year) return ""
        return `ปี พ.ศ. ${filter.year + 543}`
      }
      default:
        return ""
    }
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-600">กำลังโหลด...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-zinc-900">
            สรุปการเข้างานของพนักงาน
          </h1>
          <p className="text-sm text-zinc-600">สรุปการเข้างานของพนักงานตามช่วงเวลา</p>
        </div>
        <DateRangeFilter value={filterValue} onChange={handleFilterChange} disabled={isPending} />
      </div>

      <DashboardStatsCards stats={stats} />
      <DashboardCharts stats={stats} />

      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">อันดับการเข้างาน</h2>
          <p className="mt-1 text-sm text-zinc-600">เรียงลำดับตามจำนวนวันทำงาน (มากไปน้อย)</p>
        </div>
        <AttendanceRankingTable
          data={rankings}
          filterText={getFilterText(filterValue)}
          totalDaysWithData={stats.totalDaysWithData}
          onlyWithEmployee={onlyWithEmployee}
          onFilterChange={setOnlyWithEmployee}
        />
      </div>
    </div>
  )
}
