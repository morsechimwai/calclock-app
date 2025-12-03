"use client"

import { useState, useTransition, useEffect } from "react"
import { getDashboardStats } from "./actions"
import { DashboardStatsCards } from "@/components/dashboard-stats-cards"
import { DashboardCharts } from "@/components/dashboard-charts"
import type { DashboardStats } from "./actions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export default function DashboardPage() {
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isPending, startTransition] = useTransition()

  // Get current year and available years
  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i)

  function loadStats(year: string) {
    startTransition(async () => {
      const yearNum = year === "all" ? null : parseInt(year)
      const data = await getDashboardStats(yearNum)
      setStats(data)
    })
  }

  // Load stats on mount
  useEffect(() => {
    loadStats(selectedYear)
  }, [selectedYear])

  function handleYearChange(year: string) {
    setSelectedYear(year)
    loadStats(year)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">ภาพรวม</h1>
          <p className="text-base text-zinc-600">
            ภาพรวมระบบและสถิติการใช้งาน
            {selectedYear !== "all" && (
              <span className="ml-2 text-zinc-500">(พ.ศ. {parseInt(selectedYear) + 543})</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="year-select" className="text-sm font-medium text-zinc-700">
            ดูข้อมูล:
          </Label>
          <Select value={selectedYear} onValueChange={handleYearChange} disabled={isPending}>
            <SelectTrigger id="year-select" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              {availableYears.map((year) => {
                const beYear = year + 543
                return (
                  <SelectItem key={year} value={year.toString()}>
                    พ.ศ. {beYear}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DashboardStatsCards stats={stats} />
      <DashboardCharts stats={stats} />
    </div>
  )
}
