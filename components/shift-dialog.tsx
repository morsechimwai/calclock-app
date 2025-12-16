"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { TimePicker } from "@/components/ui/time-picker"
import type { Shift, Employee } from "@/lib/db"
import { formatThaiDateLong } from "@/lib/utils/format-thai-date"
import {
  getEmployeesAction,
  getShiftAssignmentsAction,
  getShiftByIdAction,
  getAssignedEmployeeIdsByDateAction,
} from "@/app/(app)/shift/actions"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string | null
  shiftId: number | null
  onSave: (data: {
    id?: number
    date: string
    name?: string | null
    checkIn: string
    checkOut: string
    isHoliday: boolean
    enableOvertime: boolean
    employeeIds: number[]
  }) => void
  onDelete: (id: number) => void
}

export function ShiftDialog({ open, onOpenChange, date, shiftId, onSave, onDelete }: Props) {
  const [shift, setShift] = useState<Shift | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([])
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  const [shiftName, setShiftName] = useState<string>("")
  const [checkIn, setCheckIn] = useState<string>("08:00")
  const [checkOut, setCheckOut] = useState<string>("17:00")
  const [isHoliday, setIsHoliday] = useState<boolean>(false)
  const [enableOvertime, setEnableOvertime] = useState<boolean>(false)

  // Load shift data when shiftId changes
  useEffect(() => {
    if (!open || !shiftId || !date) {
      setShift(null)
      return
    }

    async function loadShift() {
      if (!shiftId) return
      try {
        const shiftData = await getShiftByIdAction(shiftId)
        setShift(shiftData)
        if (shiftData) {
          setShiftName(shiftData.name || "")
        }
      } catch (error) {
        console.error("Error loading shift:", error)
      }
    }

    loadShift()
  }, [open, shiftId, date])

  // Load employees and assignments when dialog opens
  useEffect(() => {
    if (!open || !date) {
      setSelectedEmployeeIds([])
      setAvailableEmployees([])
      return
    }

    async function loadData() {
      if (!date) return
      const currentDate = date // TypeScript guard
      setIsLoadingEmployees(true)
      try {
        const [employeesData, assignmentsData, assignedEmployeeIdsData] = await Promise.all([
          getEmployeesAction(),
          shiftId
            ? getShiftAssignmentsAction(shiftId)
            : Promise.resolve({ success: true, employeeIds: [] }),
          getAssignedEmployeeIdsByDateAction(currentDate, shiftId ?? undefined),
        ])

        setEmployees(employeesData)

        // Filter out employees that are already assigned to other shifts on the same date
        const assignedEmployeeIds = assignedEmployeeIdsData.success
          ? assignedEmployeeIdsData.employeeIds
          : []
        const filteredEmployees = employeesData.filter(
          (emp) => !assignedEmployeeIds.includes(emp.id)
        )
        setAvailableEmployees(filteredEmployees)

        // Set selected employees (only if they are still available)
        if (assignmentsData.success) {
          const validSelectedIds = assignmentsData.employeeIds.filter((id) =>
            filteredEmployees.some((emp) => emp.id === id)
          )
          setSelectedEmployeeIds(validSelectedIds)
        }
      } catch (error) {
        console.error("Error loading employees:", error)
      } finally {
        setIsLoadingEmployees(false)
      }
    }

    loadData()
  }, [open, shiftId, date])

  // Reset form when dialog opens/closes or shift changes
  useEffect(() => {
    if (!open) {
      // Reset when dialog closes
      setCheckIn("08:00")
      setCheckOut("17:00")
      setIsHoliday(false)
      setEnableOvertime(false)
      setSelectedEmployeeIds([])
      setShiftName("")
      return
    }

    // Update when dialog opens with shift data
    if (shift) {
      setCheckIn(shift.checkIn.slice(0, 5))
      setCheckOut(shift.checkOut.slice(0, 5))
      setIsHoliday(shift.isHoliday)
      setEnableOvertime(shift.enableOvertime !== undefined ? shift.enableOvertime : false)
      setShiftName(shift.name || "")
    } else {
      setCheckIn("08:00")
      setCheckOut("17:00")
      setIsHoliday(false)
      setEnableOvertime(false)
      setShiftName("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shift?.id, shift?.checkIn, shift?.checkOut, shift?.isHoliday, shift?.enableOvertime])

  function handleSubmit() {
    if (!date) return

    // Convert HH:MM to HH:MM:SS
    const checkInTime =
      checkIn.includes(":") && checkIn.split(":").length === 2 ? `${checkIn}:00` : checkIn
    const checkOutTime =
      checkOut.includes(":") && checkOut.split(":").length === 2 ? `${checkOut}:00` : checkOut

    onSave({
      id: shiftId || undefined,
      date,
      name: shiftName.trim() || null,
      checkIn: checkInTime,
      checkOut: checkOutTime,
      isHoliday,
      enableOvertime,
      employeeIds: selectedEmployeeIds,
    })
  }

  function handleEmployeeToggle(employeeId: number) {
    setSelectedEmployeeIds((prev) => {
      if (prev.includes(employeeId)) {
        return prev.filter((id) => id !== employeeId)
      } else {
        return [...prev, employeeId]
      }
    })
  }

  function handleSelectAll() {
    if (selectedEmployeeIds.length === availableEmployees.length) {
      setSelectedEmployeeIds([])
    } else {
      setSelectedEmployeeIds(availableEmployees.map((emp) => emp.id))
    }
  }

  function handleDelete() {
    if (!shiftId) return
    onDelete(shiftId)
  }

  function handleCancel() {
    // Reset form before closing
    setCheckIn("08:00")
    setCheckOut("17:00")
    setIsHoliday(false)
    setEnableOvertime(true)
    setSelectedEmployeeIds([])
    setShiftName("")
    onOpenChange(false)
  }

  if (!date) return null

  const formattedDate = (() => {
    const [year, month, day] = date.split("-").map(Number)
    return formatThaiDateLong(new Date(year, month - 1, day))
  })()

  const quickTimes = ["06:00", "07:00", "08:00", "16:00", "17:00", "18:00", "19:00"]

  const handleQuickTime = (time: string, type: "in" | "out") => {
    if (type === "in") {
      setCheckIn(time)
    } else {
      setCheckOut(time)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">กำหนดเวลาเข้า-ออก</DialogTitle>
          <DialogDescription className="text-sm text-zinc-500">{formattedDate}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Shift Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="shift-name"
                  className="text-xs font-semibold text-zinc-700 uppercase tracking-wide"
                >
                  ชื่อกะ (ไม่บังคับ)
                </Label>
                <Input
                  id="shift-name"
                  placeholder="เช่น กะเช้า, กะดึก, กะพิเศษ"
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  className="max-w-md"
                />
                <p className="text-xs text-zinc-500">
                  ตั้งชื่อกะเพื่อแยกกะที่แตกต่างกันในวันเดียวกัน
                </p>
              </div>

              {/* Time Selection - Proximity: จัดกลุ่มเวลาเข้า-ออกใกล้กัน */}
              <div className="rounded-lg bg-zinc-50 p-5">
                <div className="grid grid-cols-2 gap-6">
                  <TimePicker
                    label="เวลาเข้า"
                    value={checkIn}
                    onChange={setCheckIn}
                    id="check-in"
                  />
                  <TimePicker
                    label="เวลาออก"
                    value={checkOut}
                    onChange={setCheckOut}
                    id="check-out"
                  />
                </div>
              </div>

              {/* Quick Time Selection - Common Region: แยกเป็นกลุ่มชัดเจน */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                  เลือกเวลาด่วน
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Quick times for Check In */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-zinc-500 px-1">เวลาเข้า</div>
                    <div className="grid grid-cols-2 gap-2">
                      {quickTimes.slice(0, 3).map((time) => (
                        <Button
                          key={`in-${time}`}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickTime(time, "in")}
                          className="hover:bg-zinc-100 font-medium font-mono"
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Quick times for Check Out */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-zinc-500 px-1">เวลาออก</div>
                    <div className="grid grid-cols-2 gap-2">
                      {quickTimes.slice(3).map((time) => (
                        <Button
                          key={`out-${time}`}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickTime(time, "out")}
                          className="hover:bg-zinc-100 font-medium font-mono"
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              {/* Employee Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                    เลือกพนักงาน
                  </Label>
                  {availableEmployees.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="h-7 text-xs"
                    >
                      {selectedEmployeeIds.length === availableEmployees.length
                        ? "ยกเลิกทั้งหมด"
                        : "เลือกทั้งหมด"}
                    </Button>
                  )}
                </div>
                {isLoadingEmployees ? (
                  <div className="text-sm text-zinc-500 py-4 text-center">กำลังโหลด...</div>
                ) : availableEmployees.length === 0 ? (
                  <div className="text-sm text-zinc-500 py-4 text-center">
                    {employees.length === 0
                      ? "ไม่มีพนักงานในระบบ"
                      : "พนักงานทั้งหมดถูกกำหนดให้กะอื่นในวันนี้แล้ว"}
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto rounded-lg border border-zinc-200 p-3 space-y-2">
                    {availableEmployees.map((employee) => (
                      <label
                        key={employee.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-50 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selectedEmployeeIds.includes(employee.id)}
                          onCheckedChange={() => handleEmployeeToggle(employee.id)}
                        />
                        <span className="text-sm text-zinc-900 flex-1">{employee.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                {availableEmployees.length < employees.length && (
                  <div className="text-xs text-zinc-500 mt-2 px-1">
                    พนักงาน {employees.length - availableEmployees.length}{" "}
                    คนถูกกำหนดให้กะอื่นในวันนี้แล้ว
                  </div>
                )}
              </div>

              {/* Options - Clean minimal design */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Holiday Option */}
                  <label className="flex items-start gap-3 p-4 rounded-lg border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer transition-all group">
                    <Checkbox
                      id="is-holiday"
                      checked={isHoliday}
                      onCheckedChange={(checked) => setIsHoliday(checked === true)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="text-sm font-semibold text-zinc-900">วันหยุดนักขัตฤกษ์</div>
                      <div className="text-xs text-zinc-500 leading-relaxed">
                        นับเป็นชั่วโมงโอทีทั้งวัน
                      </div>
                    </div>
                  </label>

                  {/* Overtime Option */}
                  <label className="flex items-start gap-3 p-4 rounded-lg border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer transition-all group">
                    <Checkbox
                      id="enable-overtime"
                      checked={enableOvertime}
                      onCheckedChange={(checked) => setEnableOvertime(checked === true)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="text-sm font-semibold text-zinc-900">เปิดล่วงเวลา (OT)</div>
                      <div className="text-xs text-zinc-500 leading-relaxed">
                        ถ้าปิดจะนับจบเวลาเลิกงาน
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Actions - Fitts's Law: ปุ่มใหญ่พอและจัดกลุ่มตามการใช้งาน */}
          <div className="flex items-center justify-between pt-4 border-t">
            {shiftId ? (
              <Button
                variant="outline"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                ลบข้อมูล
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} className="min-w-[100px]">
                ยกเลิก
              </Button>
              <Button
                onClick={handleSubmit}
                className="min-w-[100px] bg-zinc-900 hover:bg-zinc-800"
              >
                บันทึก
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
