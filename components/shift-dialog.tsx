"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
        enableOvertime: shift.enableOvertime !== undefined ? shift.enableOvertime : true,
      }
    }
    return {
      checkIn: "08:00",
      checkOut: "17:00",
      isHoliday: false,
      enableOvertime: true,
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
      setEnableOvertime(true)
      return
    }

    // Update when dialog opens with shift data
    if (shift) {
      setCheckIn(shift.checkIn.slice(0, 5))
      setCheckOut(shift.checkOut.slice(0, 5))
      setIsHoliday(shift.isHoliday)
      setEnableOvertime(shift.enableOvertime !== undefined ? shift.enableOvertime : true)
    } else {
      setCheckIn("08:00")
      setCheckOut("17:00")
      setIsHoliday(false)
      setEnableOvertime(true)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>กำหนดเวลาเข้า-ออก</DialogTitle>
          <DialogDescription>
            <span className="mt-2 block">
              <span className="text-sm font-medium text-zinc-900">วันที่: {formattedDate}</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-holiday"
              checked={isHoliday}
              onCheckedChange={(checked) => setIsHoliday(checked === true)}
            />
            <Label
              htmlFor="is-holiday"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              วันหยุดนักขัตฤกษ์ (นับเป็นชั่วโมงโอทีทั้งวัน)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="check-in">เวลาเข้า</Label>
            <Input
              type="time"
              id="check-in"
              step="60"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="check-out">เวลาออก</Label>
            <Input
              type="time"
              id="check-out"
              step="60"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="enable-overtime"
              checked={enableOvertime}
              onCheckedChange={(checked) => setEnableOvertime(checked === true)}
            />
            <Label
              htmlFor="enable-overtime"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              เปิดล่วงเวลา (ถ้าปิดจะนับจบแค่เวลาเลิกงานที่กำหนดไว้)
            </Label>
          </div>
        </div>

        <DialogFooter>
          {shift && (
            <Button variant="destructive" onClick={handleDelete}>
              ลบ
            </Button>
          )}
          <Button variant="outline" onClick={handleCancel}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
