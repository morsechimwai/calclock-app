"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { formatThaiDateLong } from "@/lib/utils/format-thai-date"
import type { PayrollData } from "@/app/(app)/payroll/actions"
import { addFingerprintTime, removeFingerprintTime } from "@/app/(app)/payroll/actions"
import {
  calculateWorkDaysAndOT,
  getCheckInCheckOut,
  getShiftForDate,
  isConsecutiveDay7,
  type Shift,
} from "@/lib/utils/payroll-calculator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { TimePicker } from "@/components/ui/time-picker"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Fingerprint, Plus, X, ClockAlert } from "lucide-react"

type Props = {
  data: PayrollData[]
  onRefresh?: () => void
}

export function PayrollTable({ data, onRefresh }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [addTimeDialogOpen, setAddTimeDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<{
    fingerprint: string
    date: string
    employeeName: string | null
    formattedDate: string
  } | null>(null)
  const [newTime, setNewTime] = useState("10:30")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [timeToDelete, setTimeToDelete] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-zinc-600">
        ไม่พบข้อมูลในช่วงวันที่ที่เลือก
      </div>
    )
  }

  function handleAddTime(
    fingerprint: string,
    date: string,
    employeeName: string | null,
    formattedDate: string
  ) {
    setSelectedEntry({ fingerprint, date, employeeName, formattedDate })
    setNewTime("10:30")
    setAddTimeDialogOpen(true)
  }

  function handleSubmitAddTime() {
    if (!selectedEntry || !newTime.trim()) return

    const timeValue = newTime.trim()
    // Input type="time" returns HH:MM format, convert to HH:MM:SS
    const formattedTime = timeValue.includes(":")
      ? timeValue.split(":").length === 2
        ? `${timeValue}:00`
        : timeValue
      : `${timeValue}:00`

    startTransition(async () => {
      const result = await addFingerprintTime(
        selectedEntry.fingerprint,
        selectedEntry.date,
        formattedTime
      )
      if (result.success) {
        setAddTimeDialogOpen(false)
        setSelectedEntry(null)
        setNewTime("10:30:00")
        router.refresh()
        onRefresh?.()
      } else {
        alert(result.error || "เกิดข้อผิดพลาดในการเพิ่มเวลา")
      }
    })
  }

  function handleRemoveTimeClick(id: number) {
    setTimeToDelete(id)
    setDeleteConfirmOpen(true)
  }

  function handleConfirmDelete() {
    if (!timeToDelete) return

    startTransition(async () => {
      const result = await removeFingerprintTime(timeToDelete)
      if (result.success) {
        setDeleteConfirmOpen(false)
        setTimeToDelete(null)
        router.refresh()
        onRefresh?.()
      } else {
        alert(result.error || "เกิดข้อผิดพลาดในการลบเวลา")
        setDeleteConfirmOpen(false)
        setTimeToDelete(null)
      }
    })
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-zinc-200 bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="w-[200px] border-r border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900">
                ชื่อ-นามสกุล
              </TableHead>
              <TableHead className="w-[150px] border-r border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900">
                วันที่
              </TableHead>
              <TableHead className="border-r border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900">
                ข้อมูลลายนิ้วมือ
              </TableHead>
              <TableHead className="w-[120px] border-r border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900 text-center">
                วันทํางาน
              </TableHead>
              <TableHead className="w-[120px] border-r border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900 text-center">
                พักกลางวัน (โอที)
              </TableHead>
              <TableHead className="w-[120px] px-4 py-3 text-sm font-semibold text-zinc-900 text-center">
                ล่วงเวลา (โอที)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((employee) => {
              // Create shift map from array
              const shiftMap = new Map<string, Shift>()
              employee.shifts.forEach((shift) => {
                shiftMap.set(shift.date, shift)
              })

              // Get all dates for this employee to check consecutive days
              const employeeDates = employee.entries.map((e) => e.date).sort()

              // Calculate totals for this employee
              let employeeWorkDays = 0
              let employeeOTHours = 0
              let employeeLunchBreakOT = 0

              employee.entries.forEach((entry) => {
                // Only calculate if there are exactly 2 time entries
                if (entry.times.length === 2) {
                  const timeStrings = entry.times.map((t) => t.time)
                  const { checkIn, checkOut } = getCheckInCheckOut(timeStrings)
                  const shift = getShiftForDate(entry.date, shiftMap)
                  const isConsecutive7 = isConsecutiveDay7(entry.date, employeeDates)
                  const { workDays, otHours, lunchBreakOT } = calculateWorkDaysAndOT(
                    checkIn,
                    checkOut,
                    shift.checkIn,
                    shift.checkOut,
                    shift.isHoliday,
                    isConsecutive7,
                    timeStrings,
                    shift.enableOvertime
                  )
                  employeeWorkDays += workDays
                  employeeOTHours += otHours
                  employeeLunchBreakOT += lunchBreakOT
                }
              })

              // Round totals to 1 decimal place
              employeeWorkDays = Math.round(employeeWorkDays * 10) / 10
              employeeOTHours = Math.round(employeeOTHours * 10) / 10
              employeeLunchBreakOT = Math.round(employeeLunchBreakOT * 10) / 10

              return (
                <React.Fragment key={employee.fingerprint}>
                  {employee.entries.map((entry, entryIndex) => {
                    // Parse date string (YYYY-MM-DD) to Date object
                    const [year, month, day] = entry.date.split("-").map(Number)
                    const date = new Date(year, month - 1, day)
                    const formattedDate = formatThaiDateLong(date)

                    // Format times (HH:MM:SS) to HH:MM (already sorted in actions)
                    const timesFormatted = entry.times.map((t) => {
                      const [hour, minute] = t.time.split(":")
                      return { time: `${hour}:${minute}`, id: t.id, isManual: t.isManual }
                    })

                    // Only calculate if there are exactly 2 time entries
                    const hasTwoTimes = entry.times.length === 2
                    const timeStrings = entry.times.map((t) => t.time)
                    const { checkIn, checkOut } = getCheckInCheckOut(timeStrings)
                    const shift = getShiftForDate(entry.date, shiftMap)
                    const isConsecutive7 = isConsecutiveDay7(entry.date, employeeDates)

                    // Calculate work days and OT hours (only if 2 times)
                    const { workDays, otHours, lunchBreakOT, isLateWarning } = hasTwoTimes
                      ? calculateWorkDaysAndOT(
                          checkIn,
                          checkOut,
                          shift.checkIn,
                          shift.checkOut,
                          shift.isHoliday,
                          isConsecutive7,
                          timeStrings,
                          shift.enableOvertime
                        )
                      : { workDays: 0, otHours: 0, lunchBreakOT: 0, isLateWarning: false }

                    // Check if this is a holiday
                    const isHoliday = shift.isHoliday

                    // Check if OT is from enableOvertime (not consecutive day 7 or holiday)
                    // Show blue OT tag only when enableOvertime is explicitly enabled
                    const hasOvertimeFromEnableOT =
                      shift.enableOvertime && !isConsecutive7 && !isHoliday

                    return (
                      <TableRow
                        key={`${employee.fingerprint}-${entry.date}-${entryIndex}`}
                        className={`border-b border-zinc-200 ${
                          isConsecutive7
                            ? "bg-green-50 hover:bg-green-100"
                            : isHoliday
                            ? "bg-amber-50 hover:bg-amber-100"
                            : "hover:bg-zinc-50/50"
                        }`}
                      >
                        {entryIndex === 0 && (
                          <TableCell
                            rowSpan={employee.entries.length + 1}
                            className="align-top border-r border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-900 bg-white"
                          >
                            {employee.employeeName || `ไม่พบข้อมูล (รหัส: ${employee.fingerprint})`}
                          </TableCell>
                        )}
                        <TableCell className="border-r border-zinc-200 px-4 py-3 text-sm text-zinc-700">
                          <div className="flex items-center gap-2">
                            <span>{formattedDate}</span>
                            {(isConsecutive7 || isHoliday || hasOvertimeFromEnableOT) && (
                              <span
                                className={`px-2 py-0.5 rounded text-white text-xs font-semibold ${
                                  isConsecutive7
                                    ? "bg-green-600"
                                    : isHoliday
                                    ? "bg-amber-600"
                                    : "bg-blue-600"
                                }`}
                              >
                                OT
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="border-r border-zinc-200 px-4 py-3 text-sm text-zinc-700 font-mono">
                          <div className="flex flex-wrap items-center gap-2">
                            {timesFormatted.length > 0 ? (
                              <>
                                {timesFormatted.map((timeData, timeIndex) => {
                                  // Check if this is the check-in time and has late warning
                                  const isCheckInTime = timeIndex === 0
                                  const showLateWarning = isCheckInTime && isLateWarning

                                  return (
                                    <div
                                      key={timeData.id}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-md ${
                                        showLateWarning
                                          ? "bg-red-50 border border-red-200"
                                          : timeData.isManual
                                          ? "bg-amber-50 border border-amber-200"
                                          : "bg-zinc-100"
                                      }`}
                                    >
                                      {showLateWarning ? (
                                        <ClockAlert className="size-4 text-red-600" />
                                      ) : (
                                        <Fingerprint className="size-4" />
                                      )}
                                      <span
                                        className={
                                          showLateWarning ? "text-red-600 font-medium" : ""
                                        }
                                      >
                                        {timeData.time}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleRemoveTimeClick(timeData.id)}
                                        disabled={isPending}
                                        title="ลบเวลา"
                                      >
                                        <X className="size-3" />
                                      </Button>
                                    </div>
                                  )
                                })}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1 text-xs"
                                  onClick={() =>
                                    handleAddTime(
                                      employee.fingerprint,
                                      entry.date,
                                      employee.employeeName,
                                      formattedDate
                                    )
                                  }
                                  disabled={isPending}
                                  title="เพิ่มเวลา"
                                >
                                  <Plus className="size-3" />
                                  เพิ่มเวลา
                                </Button>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center px-2 py-1 rounded-md bg-zinc-100">
                                  <Fingerprint className="size-4 mr-1" />-
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1 text-xs"
                                  onClick={() =>
                                    handleAddTime(
                                      employee.fingerprint,
                                      entry.date,
                                      employee.employeeName,
                                      formattedDate
                                    )
                                  }
                                  disabled={isPending}
                                  title="เพิ่มเวลา"
                                >
                                  <Plus className="size-3" />
                                  เพิ่มเวลา
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="border-r border-zinc-200 px-4 py-3 text-sm text-zinc-700 text-center font-mono">
                          {hasTwoTimes ? workDays.toFixed(1) : "-"}
                        </TableCell>
                        <TableCell className="border-r border-zinc-200 px-4 py-3 text-sm text-zinc-700 text-center font-mono">
                          {hasTwoTimes ? (lunchBreakOT > 0 ? lunchBreakOT.toFixed(1) : "0") : "-"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-zinc-700 text-center font-mono">
                          {hasTwoTimes ? (otHours > 0 ? otHours.toFixed(1) : "0") : "-"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {/* Summary row for this employee */}
                  <TableRow className="border-t-2 border-zinc-300 bg-zinc-100 hover:bg-zinc-100">
                    <TableCell
                      colSpan={2}
                      className="border-r border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900"
                    >
                      รวม
                    </TableCell>
                    <TableCell className="border-r border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900 text-center font-mono">
                      {employeeWorkDays.toFixed(1)}
                    </TableCell>
                    <TableCell className="border-r border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900 text-center font-mono">
                      {employeeLunchBreakOT.toFixed(1)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-semibold text-zinc-900 text-center font-mono">
                      {employeeOTHours.toFixed(1)}
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog for adding time */}
      <Dialog open={addTimeDialogOpen} onOpenChange={setAddTimeDialogOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">เพิ่มเวลาใหม่</DialogTitle>
            {selectedEntry && (
              <DialogDescription className="space-y-1 pt-2">
                <div className="text-sm font-medium text-zinc-900">
                  พนักงาน:{" "}
                  {selectedEntry.employeeName || `ไม่พบข้อมูล (รหัส: ${selectedEntry.fingerprint})`}
                </div>
                <div className="text-sm text-zinc-500">วันที่: {selectedEntry.formattedDate}</div>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Time Picker */}
            <div className="rounded-lg bg-zinc-50 p-5">
              <TimePicker label="เวลา" value={newTime} onChange={setNewTime} id="time-picker" />
            </div>

            {/* Quick Time Selection */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                เลือกเวลาด่วน
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  "07:00",
                  "08:00",
                  "10:30",
                  "12:00",
                  "16:00",
                  "17:00",
                  "18:00",
                  "19:00",
                  "20:00",
                ].map((time) => (
                  <Button
                    key={time}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewTime(time)}
                    className="hover:bg-zinc-100 font-medium font-mono"
                    disabled={isPending}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setAddTimeDialogOpen(false)
                setSelectedEntry(null)
                setNewTime("10:30")
              }}
              disabled={isPending}
              className="min-w-[100px]"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleSubmitAddTime}
              disabled={isPending || !newTime.trim()}
              className="min-w-[100px] bg-zinc-900 hover:bg-zinc-800"
            >
              {isPending ? "กำลังเพิ่ม..." : "เพิ่มเวลา"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog for delete confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบเวลา</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบเวลานี้หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isPending}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
            >
              {isPending ? "กำลังลบ..." : "ลบ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
