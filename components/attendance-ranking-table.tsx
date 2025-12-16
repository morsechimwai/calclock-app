"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Printer, Columns } from "lucide-react"
import type { AttendanceRanking } from "@/app/(app)/dashboard/actions"
import { generateAttendanceRankingPrintHTML } from "@/lib/utils/generate-attendance-ranking-print-html"

type Props = {
  data: AttendanceRanking[]
  filterText?: string
  totalDaysWithData: number
  onlyWithEmployee: boolean
  onFilterChange: (onlyWithEmployee: boolean) => void
}

type ColumnKey = "workDays" | "lateDays" | "rating"

export function AttendanceRankingTable({
  data,
  filterText = "",
  totalDaysWithData,
  onlyWithEmployee,
  onFilterChange,
}: Props) {
  const [selectedFingerprints, setSelectedFingerprints] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set(["workDays", "lateDays", "rating"])
  )

  const allFingerprints = useMemo(() => new Set(data.map((item) => item.fingerprint)), [data])
  const isAllSelected = data.length > 0 && selectedFingerprints.size === data.length
  const isIndeterminate = selectedFingerprints.size > 0 && selectedFingerprints.size < data.length

  function handleToggleSelect(fingerprint: string) {
    setSelectedFingerprints((prev) => {
      const next = new Set(prev)
      if (next.has(fingerprint)) {
        next.delete(fingerprint)
      } else {
        next.add(fingerprint)
      }
      return next
    })
  }

  function handleToggleSelectAll() {
    if (isAllSelected) {
      setSelectedFingerprints(new Set())
    } else {
      setSelectedFingerprints(new Set(allFingerprints))
    }
  }

  function handleToggleColumn(column: ColumnKey) {
    setVisibleColumns((prev) => {
      const next = new Set(prev)
      if (next.has(column)) {
        next.delete(column)
      } else {
        next.add(column)
      }
      return next
    })
  }

  function handlePrint() {
    if (selectedFingerprints.size === 0) {
      return
    }

    const selectedData = data.filter((item) => selectedFingerprints.has(item.fingerprint))
    const htmlContent = generateAttendanceRankingPrintHTML(
      selectedData,
      filterText,
      totalDaysWithData
    )
    const printWindow = window.open("", "_blank")

    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-600">
          เกณฑ์การประเมิน: อัตราการเข้าสาย ≤ 10% = ดี, &gt; 10% = ควรปรับปรุง
        </div>
        <div className="flex items-center gap-2">
          {data.length > 0 && (
            <Button
              onClick={handlePrint}
              variant="outline"
              className="gap-2"
              disabled={selectedFingerprints.size === 0}
            >
              <Printer className="h-4 w-4" />
              พิมพ์ ({selectedFingerprints.size})
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Columns className="h-4 w-4" />
                คอลัมน์
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>เลือกคอลัมน์ที่แสดง</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.has("workDays")}
                onCheckedChange={() => handleToggleColumn("workDays")}
              >
                จำนวนวันทำงาน
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.has("lateDays")}
                onCheckedChange={() => handleToggleColumn("lateDays")}
              >
                จำนวนวันเข้าสาย
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.has("rating")}
                onCheckedChange={() => handleToggleColumn("rating")}
              >
                เกณฑ์
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Select
            value={onlyWithEmployee ? "with-name" : "all"}
            onValueChange={(value) => onFilterChange(value === "with-name")}
          >
            <SelectTrigger className="min-h-10">
              <SelectValue placeholder="เลือกการแสดงผล" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">แสดงทั้งหมด</SelectItem>
              <SelectItem value="with-name">แสดงเฉพาะพนักงานที่มีชื่อ-นามสกุล</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {data.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-zinc-200 bg-zinc-50 hover:bg-zinc-50">
                  <TableHead className="w-[50px] border-r border-zinc-200 px-4 py-3 text-center">
                    <Checkbox
                      checked={isIndeterminate ? "indeterminate" : isAllSelected}
                      onCheckedChange={handleToggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[200px] border-r border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900">
                    ชื่อ-นามสกุล
                  </TableHead>
                  {visibleColumns.has("workDays") && (
                    <TableHead
                      className={`w-[150px] px-4 py-3 text-sm font-semibold text-zinc-900 text-center ${
                        visibleColumns.has("lateDays") || visibleColumns.has("rating")
                          ? "border-r border-zinc-200"
                          : ""
                      }`}
                    >
                      จำนวนวันทำงาน
                      <div className="text-xs font-normal text-zinc-500 mt-1">
                        (จาก {totalDaysWithData} วันทำงาน)
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("lateDays") && (
                    <TableHead
                      className={`w-[150px] px-4 py-3 text-sm font-semibold text-zinc-900 text-center ${
                        visibleColumns.has("rating") ? "border-r border-zinc-200" : ""
                      }`}
                    >
                      จำนวนวันเข้าสาย
                    </TableHead>
                  )}
                  {visibleColumns.has("rating") && (
                    <TableHead className="w-[150px] px-4 py-3 text-sm font-semibold text-zinc-900 text-center">
                      เกณฑ์
                      <div className="text-xs font-normal text-zinc-500 mt-1">(≤10% = ดี)</div>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((ranking) => (
                  <TableRow
                    key={ranking.fingerprint}
                    className="border-b border-zinc-200 hover:bg-zinc-50/50"
                  >
                    <TableCell className="border-r border-zinc-200 px-4 py-3 text-center">
                      <Checkbox
                        checked={selectedFingerprints.has(ranking.fingerprint)}
                        onCheckedChange={() => handleToggleSelect(ranking.fingerprint)}
                      />
                    </TableCell>
                    <TableCell
                      className={`px-4 py-3 text-sm text-zinc-900 ${
                        visibleColumns.has("workDays") ||
                        visibleColumns.has("lateDays") ||
                        visibleColumns.has("rating")
                          ? "border-r border-zinc-200"
                          : ""
                      }`}
                    >
                      {ranking.employeeName || `ไม่พบข้อมูล (รหัส: ${ranking.fingerprint})`}
                    </TableCell>
                    {visibleColumns.has("workDays") && (
                      <TableCell
                        className={`px-4 py-3 text-sm text-zinc-900 text-center font-mono font-medium ${
                          visibleColumns.has("lateDays") || visibleColumns.has("rating")
                            ? "border-r border-zinc-200"
                            : ""
                        }`}
                      >
                        {ranking.workDays} วัน
                      </TableCell>
                    )}
                    {visibleColumns.has("lateDays") && (
                      <TableCell
                        className={`px-4 py-3 text-sm text-zinc-900 text-center font-mono font-medium ${
                          visibleColumns.has("rating") ? "border-r border-zinc-200" : ""
                        }`}
                      >
                        {ranking.workDays > 0 ? (
                          <>
                            {ranking.lateDays} วัน จาก {ranking.workDays} วันทำงาน (
                            {((ranking.lateDays / ranking.workDays) * 100).toFixed(2)}%)
                          </>
                        ) : (
                          `${ranking.lateDays} วัน`
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.has("rating") && (
                      <TableCell className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                            ranking.rating === "ดี"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {ranking.rating}
                        </span>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex justify-center items-center p-8">
            <span>ไม่พบข้อมูลการเข้างาน</span>
          </div>
        )}
      </div>
    </div>
  )
}
