"use client"

import { useState, useEffect } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import type { DateSelectArg, EventClickArg } from "@fullcalendar/core"
import { getShiftsAction, createOrUpdateShiftAction, deleteShiftAction } from "./actions"
import type { Shift } from "@/lib/db"
import { ShiftDialog } from "@/components/shift-dialog"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon } from "lucide-react"

// Thai locale configuration
const thaiLocale = {
  code: "th",
  week: {
    dow: 0, // Sunday is the first day of the week
    doy: 4, // The week that contains Jan 4th is the first week of the year
  },
  buttonText: {
    prev: "ก่อนหน้า",
    next: "ถัดไป",
    today: "วันนี้",
    month: "เดือน",
    week: "สัปดาห์",
    day: "วัน",
  },
  allDayText: "ทั้งวัน",
  moreLinkText: "เพิ่มเติม",
  noEventsText: "ไม่มีกิจกรรม",
  weekText: "สัปดาห์",
}

// Thai month names
const thaiMonths = [
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

// Thai day names
const thaiDays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]


export default function ShiftPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    loadShifts()
  }, [])

  async function loadShifts() {
    setIsLoading(true)
    try {
      const data = await getShiftsAction()
      setShifts(data)
    } catch (error) {
      console.error("Error loading shifts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleDateSelect(selectInfo: DateSelectArg) {
    const date = selectInfo.startStr.split("T")[0]
    setSelectedDate(date)
    setDialogOpen(true)
    selectInfo.view.calendar.unselect()
  }

  function handleEventClick(clickInfo: EventClickArg) {
    const date = clickInfo.event.startStr?.split("T")[0]
    if (date) {
      setSelectedDate(date)
      setDialogOpen(true)
    }
  }

  async function handleSaveShift(data: {
    date: string
    checkIn: string
    checkOut: string
    isHoliday: boolean
  }) {
    const result = await createOrUpdateShiftAction({
      date: data.date,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      isHoliday: data.isHoliday,
    })

    if (result.success && result.data) {
      await loadShifts()
      setDialogOpen(false)
      setSelectedDate(null)
    } else {
      alert(result.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล")
    }
  }

  async function handleDeleteShift(date: string) {
    if (!confirm("คุณต้องการลบข้อมูลวันนี้หรือไม่?")) return

    const result = await deleteShiftAction(date)
    if (result.success) {
      await loadShifts()
      setDialogOpen(false)
      setSelectedDate(null)
    } else {
      alert(result.error || "เกิดข้อผิดพลาดในการลบข้อมูล")
    }
  }

  // Convert shifts to calendar events
  const events = shifts.map((shift) => {
    const isHoliday = shift.isHoliday
    const title = isHoliday
      ? "วันหยุดนักขัตฤกษ์"
      : `${shift.checkIn.slice(0, 5)} - ${shift.checkOut.slice(0, 5)}`

    return {
      id: shift.id.toString(),
      title,
      start: shift.date,
      allDay: true,
      // Use zinc colors from theme
      backgroundColor: isHoliday ? "rgb(251 191 36)" : "rgb(24 24 27)", // amber-400 for holiday, zinc-900 for work
      borderColor: isHoliday ? "rgb(245 158 11)" : "rgb(24 24 27)",
      textColor: "white",
    }
  })

  const selectedShift = selectedDate
    ? shifts.find((s) => s.date === selectedDate)
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">กำหนดเวลาเข้า-ออก</h1>
        <p className="text-base text-zinc-600">
          คลิกที่วันที่เพื่อกำหนดเวลาเข้า-ออก หรือกำหนดเป็นวันหยุดนักขัตฤกษ์
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-zinc-600">กำลังโหลด...</div>
          </div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            events={events}
            select={handleDateSelect}
            eventClick={handleEventClick}
            locale={thaiLocale}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "",
            }}
            datesSet={(arg) => {
              // Update title and day headers via DOM
              requestAnimationFrame(() => {
                // Update title with correct month
                const titleEl = document.querySelector(".fc-toolbar-title")
                if (titleEl && arg.start) {
                  try {
                    const date = arg.start instanceof Date ? arg.start : new Date(arg.start)
                    if (!isNaN(date.getTime())) {
                      const year = date.getFullYear()
                      const beYear = year + 543
                      const monthIndex = date.getMonth()
                      const month = thaiMonths[monthIndex]
                      const expectedText = `${month} พ.ศ. ${beYear}`
                      if (titleEl.textContent !== expectedText) {
                        titleEl.textContent = expectedText
                      }
                    }
                  } catch (e) {
                    console.error("Error updating title:", e)
                  }
                }

                // Update day headers
                // Since dow: 1 (Monday first), the order should be: จ, อ, พ, พฤ, ศ, ส, อา
                const thaiDaysOrdered = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"] // Monday to Sunday
                const dayHeaders = document.querySelectorAll(".fc-col-header-cell-cushion")
                dayHeaders.forEach((el, index) => {
                  // With dow: 1, index 0 = Monday (จ), index 1 = Tuesday (อ), etc.
                  if (index < thaiDaysOrdered.length) {
                    const thaiDay = thaiDaysOrdered[index]
                    if (el.textContent !== thaiDay) {
                      el.textContent = thaiDay
                    }
                  }
                })
              })
            }}
            dayHeaderFormat={(arg) => {
              try {
                // With dow: 1, FullCalendar will pass dates in order: Mon, Tue, Wed, Thu, Fri, Sat, Sun
                // We need to map them correctly
                let date: Date
                if (arg && typeof arg === "object") {
                  if ("date" in arg && arg.date) {
                    date = arg.date instanceof Date ? arg.date : new Date(arg.date)
                  } else if (arg instanceof Date) {
                    date = arg
                  } else {
                    return ""
                  }
                } else {
                  return ""
                }

                if (isNaN(date.getTime())) return ""

                // Since dow: 1, the order is Mon(1), Tue(2), Wed(3), Thu(4), Fri(5), Sat(6), Sun(0)
                // Map: 1->จ, 2->อ, 3->พ, 4->พฤ, 5->ศ, 6->ส, 0->อา
                const dayMap: Record<number, string> = {
                  0: "อา", // Sunday
                  1: "จ",  // Monday
                  2: "อ",  // Tuesday
                  3: "พ",  // Wednesday
                  4: "พฤ", // Thursday
                  5: "ศ",  // Friday
                  6: "ส",  // Saturday
                }

                return dayMap[date.getDay()] || ""
              } catch (e) {
                console.error("Error in dayHeaderFormat:", e, arg)
                return ""
              }
            }}
            firstDay={0}
            datesSet={(arg) => {
              // Update title and day headers via DOM
              requestAnimationFrame(() => {
                // Update title with correct month
                // Use a date in the middle of the visible range to determine the month
                const titleEl = document.querySelector(".fc-toolbar-title")
                if (titleEl && arg.start && arg.end) {
                  try {
                    const startDate = arg.start instanceof Date ? arg.start : new Date(arg.start)
                    const endDate = arg.end instanceof Date ? arg.end : new Date(arg.end)

                    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                      // Calculate middle date
                      const timeDiff = endDate.getTime() - startDate.getTime()
                      const midTime = startDate.getTime() + timeDiff / 2
                      const midDate = new Date(midTime)

                      // Use the 15th of the month to ensure we get the correct month
                      const displayDate = new Date(midDate.getFullYear(), midDate.getMonth(), 15)

                      const year = displayDate.getFullYear()
                      const beYear = year + 543
                      const monthIndex = displayDate.getMonth()
                      const month = thaiMonths[monthIndex]
                      const expectedText = `${month} พ.ศ. ${beYear}`
                      if (titleEl.textContent !== expectedText) {
                        titleEl.textContent = expectedText
                      }
                    }
                  } catch (e) {
                    console.error("Error updating title:", e)
                  }
                }

                // Update day headers
                // Since dow: 0 (Sunday first), the order should be: อา, จ, อ, พ, พฤ, ศ, ส
                const thaiDaysOrdered = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] // Sunday to Saturday
                const dayHeaders = document.querySelectorAll(".fc-col-header-cell-cushion")
                dayHeaders.forEach((el, index) => {
                  // With dow: 0, index 0 = Sunday (อา), index 1 = Monday (จ), etc.
                  if (index < thaiDaysOrdered.length) {
                    const thaiDay = thaiDaysOrdered[index]
                    if (el.textContent !== thaiDay) {
                      el.textContent = thaiDay
                    }
                  }
                })
              })
            }}
            height="auto"
            contentHeight="auto"
          />
        )}
      </div>

      <ShiftDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={selectedDate}
        shift={selectedShift}
        onSave={handleSaveShift}
        onDelete={handleDeleteShift}
      />
    </div>
  )
}

