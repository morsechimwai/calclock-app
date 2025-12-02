"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { formatThaiDateLong } from "@/lib/utils/format-thai-date"
import type { PayrollData } from "@/app/(app)/payroll/actions"
import { addFingerprintTime, removeFingerprintTime } from "@/app/(app)/payroll/actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Fingerprint, Plus, X } from "lucide-react"

type Props = {
  data: PayrollData[]
  onRefresh?: () => void
}

// Default work hours
const DEFAULT_CHECK_IN = "08:00"
const DEFAULT_CHECK_OUT = "17:00"
const STANDARD_WORK_HOURS = 8 // 8 hours per day
const LUNCH_BREAK = 0.5 // 0.5 hours (12:30 - 13:00)

// Convert time string (HH:MM) to minutes
function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number)
  return hour * 60 + minute
}

// Convert minutes to hours (decimal)
function minutesToHours(minutes: number): number {
  return minutes / 60
}

// Check if there's a lunch break (between 12:30 and 13:00)
function hasLunchBreak(times: string[]): boolean {
  const lunchStart = timeToMinutes("12:30")
  const lunchEnd = timeToMinutes("13:00")

  return times.some((time) => {
    const [hour, minute] = time.split(":").map(Number)
    const timeMinutes = hour * 60 + minute
    return timeMinutes >= lunchStart && timeMinutes <= lunchEnd
  })
}

// Calculate check-in and check-out times from fingerprint data
function calculateWorkHours(times: string[]): { checkIn: string; checkOut: string } {
  if (times.length === 0) {
    return { checkIn: DEFAULT_CHECK_IN, checkOut: DEFAULT_CHECK_OUT }
  }

  // Sort times
  const sortedTimes = times
    .map((time) => {
      const [hour, minute] = time.split(":")
      return `${hour}:${minute}`
    })
    .sort()

  // First time is check-in, last time is check-out
  const checkIn = sortedTimes[0]
  const checkOut = sortedTimes.length > 1 ? sortedTimes[sortedTimes.length - 1] : DEFAULT_CHECK_OUT

  return { checkIn, checkOut }
}

// Calculate work days and OT hours
function calculateWorkDaysAndOT(
  checkIn: string,
  checkOut: string,
  times: string[]
): {
  workDays: number
  otHours: number
} {
  const checkInMinutes = timeToMinutes(checkIn)
  const checkOutMinutes = timeToMinutes(checkOut)

  // Total minutes worked
  let totalMinutes = checkOutMinutes - checkInMinutes

  // Subtract lunch break if exists
  const hasLunch = hasLunchBreak(times)
  if (hasLunch) {
    totalMinutes -= LUNCH_BREAK * 60
  }

  const totalHours = minutesToHours(totalMinutes)

  // Calculate work days and OT
  let workDays: number
  let otHours: number

  if (totalHours >= STANDARD_WORK_HOURS) {
    // Worked 8+ hours: workDays = 1, OT = lunch break (0.5) + excess hours
    workDays = 1
    const excessHours = totalHours - STANDARD_WORK_HOURS
    otHours = (hasLunch ? LUNCH_BREAK : 0) + excessHours
  } else {
    // Worked less than 8 hours: workDays = proportion, OT = lunch break only if exists
    workDays = totalHours / STANDARD_WORK_HOURS
    otHours = hasLunch ? LUNCH_BREAK : 0
  }

  // Round to 1 decimal place
  workDays = Math.round(workDays * 10) / 10
  otHours = Math.round(otHours * 10) / 10

  return { workDays, otHours }
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
              <TableHead className="w-[120px] px-4 py-3 text-sm font-semibold text-zinc-900 text-center">
                ชั่วโมงโอที
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((employee) => {
              // Calculate totals for this employee
              let employeeWorkDays = 0
              let employeeOTHours = 0

              employee.entries.forEach((entry) => {
                const timeStrings = entry.times.map((t) => t.time)
                const { checkIn, checkOut } = calculateWorkHours(timeStrings)
                const { workDays, otHours } = calculateWorkDaysAndOT(checkIn, checkOut, timeStrings)
                employeeWorkDays += workDays
                employeeOTHours += otHours
              })

              // Round totals to 1 decimal place
              employeeWorkDays = Math.round(employeeWorkDays * 10) / 10
              employeeOTHours = Math.round(employeeOTHours * 10) / 10

              return (
                <>
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

                    // Calculate work hours (use original time strings)
                    const timeStrings = entry.times.map((t) => t.time)
                    const { checkIn, checkOut } = calculateWorkHours(timeStrings)

                    // Calculate work days and OT hours
                    const { workDays, otHours } = calculateWorkDaysAndOT(
                      checkIn,
                      checkOut,
                      timeStrings
                    )

                    return (
                      <TableRow
                        key={`${employee.fingerprint}-${entry.date}-${entryIndex}`}
                        className="border-b border-zinc-200 hover:bg-zinc-50/50"
                      >
                        {entryIndex === 0 && (
                          <TableCell
                            rowSpan={employee.entries.length + 1}
                            className="align-top border-r border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-900 bg-zinc-50/30"
                          >
                            {employee.employeeName || `ไม่พบข้อมูล (รหัส: ${employee.fingerprint})`}
                          </TableCell>
                        )}
                        <TableCell className="border-r border-zinc-200 px-4 py-3 text-sm text-zinc-700">
                          {formattedDate}
                        </TableCell>
                        <TableCell className="border-r border-zinc-200 px-4 py-3 text-sm text-zinc-700 font-mono">
                          <div className="flex flex-wrap items-center gap-2">
                            {timesFormatted.length > 0 ? (
                              <>
                                {timesFormatted.map((timeData) => (
                                  <div
                                    key={timeData.id}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-md ${
                                      timeData.isManual
                                        ? "bg-amber-50 border border-amber-200"
                                        : "bg-zinc-100"
                                    }`}
                                  >
                                    <Fingerprint className="size-4" />
                                    <span>{timeData.time}</span>
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
                                ))}
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
                          {workDays.toFixed(1)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-zinc-700 text-center font-mono">
                          {otHours > 0 ? otHours.toFixed(1) : "0"}
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
                    <TableCell className="px-4 py-3 text-sm font-semibold text-zinc-900 text-center font-mono">
                      {employeeOTHours.toFixed(1)}
                    </TableCell>
                  </TableRow>
                </>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog for adding time */}
      <Dialog open={addTimeDialogOpen} onOpenChange={setAddTimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มเวลาใหม่</DialogTitle>
            <DialogDescription>
              {selectedEntry && (
                <div className="space-y-1 mt-2">
                  <div className="text-sm font-medium text-zinc-900">
                    พนักงาน:{" "}
                    {selectedEntry.employeeName ||
                      `ไม่พบข้อมูล (รหัส: ${selectedEntry.fingerprint})`}
                  </div>
                  <div className="text-sm text-zinc-600">วันที่: {selectedEntry.formattedDate}</div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="time-picker" className="px-1">
                Time
              </Label>
              <Input
                type="time"
                id="time-picker"
                step="60"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddTimeDialogOpen(false)
                setSelectedEntry(null)
                setNewTime("10:30")
              }}
              disabled={isPending}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleSubmitAddTime} disabled={isPending || !newTime.trim()}>
              {isPending ? "กำลังเพิ่ม..." : "เพิ่มเวลา"}
            </Button>
          </DialogFooter>
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
