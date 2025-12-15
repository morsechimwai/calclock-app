"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import type { AttendanceRanking } from "@/app/(app)/dashboard/actions"
import { generateAttendanceRankingPrintHTML } from "@/lib/utils/generate-attendance-ranking-print-html"

type Props = {
  data: AttendanceRanking[]
  filterText?: string
  totalDaysWithData: number
}

export function AttendanceRankingTable({ data, filterText = "", totalDaysWithData }: Props) {
  function handlePrint() {
    if (data.length === 0) {
      return
    }

    const htmlContent = generateAttendanceRankingPrintHTML(data, filterText, totalDaysWithData)
    const printWindow = window.open("", "_blank")

    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
    }
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-zinc-600">
        ยังไม่มีข้อมูลการเข้างาน
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-600">
          เกณฑ์การประเมิน: อัตราการเข้าสาย ≤ 10% = ดี, &gt; 10% = ควรปรับปรุง
        </div>
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="h-4 w-4" />
          พิมพ์
        </Button>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-zinc-200 bg-zinc-50 hover:bg-zinc-50">
                <TableHead className="w-[200px] border-r border-zinc-200 px-4 py-3 text-base font-semibold text-zinc-900">
                  ชื่อ-นามสกุล
                </TableHead>
                <TableHead className="w-[150px] border-r border-zinc-200 px-4 py-3 text-base font-semibold text-zinc-900 text-center">
                  จำนวนวันทำงาน
                  <div className="text-xs font-normal text-zinc-500 mt-1">
                    (จาก {totalDaysWithData} วันทำงาน)
                  </div>
                </TableHead>
                <TableHead className="w-[150px] border-r border-zinc-200 px-4 py-3 text-base font-semibold text-zinc-900 text-center">
                  จำนวนวันเข้าสาย
                </TableHead>
                <TableHead className="w-[150px] px-4 py-3 text-base font-semibold text-zinc-900 text-center">
                  เกณฑ์
                  <div className="text-xs font-normal text-zinc-500 mt-1">(≤10% = ดี)</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((ranking) => (
                <TableRow
                  key={ranking.fingerprint}
                  className="border-b border-zinc-200 hover:bg-zinc-50/50"
                >
                  <TableCell className="border-r border-zinc-200 px-4 py-3 text-base text-zinc-900">
                    {ranking.employeeName || `ไม่พบข้อมูล (รหัส: ${ranking.fingerprint})`}
                  </TableCell>
                  <TableCell className="border-r border-zinc-200 px-4 py-3 text-base text-zinc-900 text-center font-mono font-medium">
                    {totalDaysWithData > 0 ? (
                      <>
                        {ranking.workDays} วัน (
                        {((ranking.workDays / totalDaysWithData) * 100).toFixed(1)}%)
                      </>
                    ) : (
                      `${ranking.workDays} วัน`
                    )}
                  </TableCell>
                  <TableCell className="border-r border-zinc-200 px-4 py-3 text-base text-zinc-900 text-center font-mono font-medium">
                    {ranking.lateDays} วัน
                  </TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
