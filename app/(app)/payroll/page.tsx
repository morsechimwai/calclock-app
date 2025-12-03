"use client"

import { useState, useTransition } from "react"
import { type DateRange } from "react-day-picker"
import { PayrollDateRangePicker } from "@/components/payroll-date-range-picker"
import { PayrollTable } from "@/components/payroll-table"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { getPayrollData, type PayrollData } from "./actions"
import { formatThaiDateLong } from "@/lib/utils/format-thai-date"

export default function PayrollPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [payrollData, setPayrollData] = useState<PayrollData[]>([])
  const [isPending, startTransition] = useTransition()
  const [hasLoaded, setHasLoaded] = useState(false)

  function handleLoadData() {
    if (!dateRange?.from || !dateRange?.to) {
      return
    }

    startTransition(async () => {
      // Format date as YYYY-MM-DD using local timezone
      const formatDate = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const day = String(date.getDate()).padStart(2, "0")
        return `${year}-${month}-${day}`
      }

      const startDate = formatDate(dateRange.from!)
      const endDate = formatDate(dateRange.to!)
      const data = await getPayrollData(startDate, endDate)
      setPayrollData(data)
      setHasLoaded(true)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">คำนวณชั่วโมงทำงาน</h1>
          <p className="text-base text-zinc-600">
            เลือกช่วงวันที่ที่ต้องการ แล้วกดคำนวณชั่วโมงทำงาน
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
            <span className="px-2 py-0.5 rounded text-white text-xs font-semibold bg-green-600">
              OT
            </span>
            <span className="text-sm font-medium text-green-900">OT วันที่ 7</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <span className="px-2 py-0.5 rounded text-white text-xs font-semibold bg-blue-600">
              OT
            </span>
            <span className="text-sm font-medium text-blue-900">OT จากเปิดล่วงเวลา</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <span className="px-2 py-0.5 rounded text-white text-xs font-semibold bg-amber-600">
              OT
            </span>
            <span className="text-sm font-medium text-amber-900">OT วันหยุดนักขัตฤกษ์</span>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="date-range">ช่วงวันที่</Label>
            <PayrollDateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>

          <Button
            onClick={handleLoadData}
            disabled={!dateRange?.from || !dateRange?.to || isPending}
            className="px-4 py-2 text-base font-semibold"
          >
            {isPending ? "กำลังคำนวณ..." : "คำนวณชั่วโมงทำงาน"}
          </Button>
        </div>
      </div>

      {hasLoaded && (
        <div className="space-y-4">
          {payrollData.length > 0 ? (
            <PayrollTable
              data={payrollData}
              onRefresh={() => {
                if (dateRange?.from && dateRange?.to) {
                  startTransition(async () => {
                    const formatDate = (date: Date) => {
                      const year = date.getFullYear()
                      const month = String(date.getMonth() + 1).padStart(2, "0")
                      const day = String(date.getDate()).padStart(2, "0")
                      return `${year}-${month}-${day}`
                    }

                    const startDate = formatDate(dateRange.from!)
                    const endDate = formatDate(dateRange.to!)
                    const data = await getPayrollData(startDate, endDate)
                    setPayrollData(data)
                  })
                }
              }}
            />
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center">
              <div className="mx-auto max-w-md space-y-3">
                <div className="flex justify-center">
                  <svg
                    className="h-16 w-16 text-zinc-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-zinc-900">ไม่พบข้อมูลบันทึก</h3>
                  <p className="text-sm text-zinc-600">
                    ไม่พบข้อมูลบันทึกเวลาตั้งแต่{" "}
                    <span className="font-medium text-zinc-900">
                      {dateRange?.from && formatThaiDateLong(dateRange.from)}
                    </span>{" "}
                    ถึง{" "}
                    <span className="font-medium text-zinc-900">
                      {dateRange?.to && formatThaiDateLong(dateRange.to)}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500 pt-2">
                    กรุณาตรวจสอบว่ามีการนำเข้าข้อมูลจากเครื่องสแกนลายนิ้วมือในช่วงเวลาที่เลือกหรือไม่
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
