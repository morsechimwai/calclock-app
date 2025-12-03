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
import { Checkbox } from "@/components/ui/checkbox"
import { TimePicker } from "@/components/ui/time-picker"
import type { Shift } from "@/lib/db"
import { formatThaiDateLong } from "@/lib/utils/format-thai-date"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string | null
  shift: Shift | null | undefined
  onSave: (data: {
    date: string
    checkIn: string
    checkOut: string
    isHoliday: boolean
    enableOvertime: boolean
  }) => void
  onDelete: (date: string) => void
}

export function ShiftDialog({ open, onOpenChange, date, shift, onSave, onDelete }: Props) {
  // Initialize state based on shift or defaults
  const getInitialState = () => {
    if (shift) {
      return {
        checkIn: shift.checkIn.slice(0, 5),
        checkOut: shift.checkOut.slice(0, 5),
        isHoliday: shift.isHoliday,
        enableOvertime: shift.enableOvertime !== undefined ? shift.enableOvertime : false,
      }
    }
    return {
      checkIn: "08:00",
      checkOut: "17:00",
      isHoliday: false,
      enableOvertime: false,
    }
  }

  const [checkIn, setCheckIn] = useState(() => getInitialState().checkIn)
  const [checkOut, setCheckOut] = useState(() => getInitialState().checkOut)
  const [isHoliday, setIsHoliday] = useState(() => getInitialState().isHoliday)
  const [enableOvertime, setEnableOvertime] = useState(() => getInitialState().enableOvertime)

  // Reset form when dialog opens/closes or shift changes
  useEffect(() => {
    if (!open) {
      // Reset when dialog closes
      setCheckIn("08:00")
      setCheckOut("17:00")
      setIsHoliday(false)
      setEnableOvertime(false)
      return
    }

    // Update when dialog opens with shift data
    if (shift) {
      setCheckIn(shift.checkIn.slice(0, 5))
      setCheckOut(shift.checkOut.slice(0, 5))
      setIsHoliday(shift.isHoliday)
      setEnableOvertime(shift.enableOvertime !== undefined ? shift.enableOvertime : false)
    } else {
      setCheckIn("08:00")
      setCheckOut("17:00")
      setIsHoliday(false)
      setEnableOvertime(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shift?.date, shift?.checkIn, shift?.checkOut, shift?.isHoliday, shift?.enableOvertime])

  function handleSubmit() {
    if (!date) return

    // Convert HH:MM to HH:MM:SS
    const checkInTime =
      checkIn.includes(":") && checkIn.split(":").length === 2 ? `${checkIn}:00` : checkIn
    const checkOutTime =
      checkOut.includes(":") && checkOut.split(":").length === 2 ? `${checkOut}:00` : checkOut

    onSave({
      date,
      checkIn: checkInTime,
      checkOut: checkOutTime,
      isHoliday,
      enableOvertime,
    })
  }

  function handleDelete() {
    if (!date) return
    onDelete(date)
  }

  function handleCancel() {
    // Reset form before closing
    setCheckIn("08:00")
    setCheckOut("17:00")
    setIsHoliday(false)
    setEnableOvertime(true)
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
      <DialogContent className="max-w-[580px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">กำหนดเวลาเข้า-ออก</DialogTitle>
          <DialogDescription className="text-sm text-zinc-500">{formattedDate}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Time Selection - Proximity: จัดกลุ่มเวลาเข้า-ออกใกล้กัน */}
          <div className="rounded-lg bg-zinc-50 p-5">
            <div className="grid grid-cols-2 gap-6">
              <TimePicker label="เวลาเข้า" value={checkIn} onChange={setCheckIn} id="check-in" />
              <TimePicker label="เวลาออก" value={checkOut} onChange={setCheckOut} id="check-out" />
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

          {/* Actions - Fitts's Law: ปุ่มใหญ่พอและจัดกลุ่มตามการใช้งาน */}
          <div className="flex items-center justify-between pt-4 border-t">
            {shift ? (
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
