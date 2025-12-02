"use client"

import { useState, useEffect, useRef } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import type { DateSelectArg, EventClickArg, CalendarApi } from "@fullcalendar/core"
import { getShiftsAction, createOrUpdateShiftAction, deleteShiftAction } from "./actions"
import type { Shift } from "@/lib/db"
import { ShiftDialog } from "@/components/shift-dialog"
import { Button } from "@/components/ui/button"
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

export default function ShiftPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteDate, setDeleteDate] = useState<string | null>(null)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const titleUpdateRef = useRef<string>("")
  const isUpdatingTitleRef = useRef(false)
  const calendarApiRef = useRef<CalendarApi | null>(null)

  // Unselect calendar when dialog closes
  useEffect(() => {
    if (!dialogOpen && calendarApiRef.current) {
      // Small delay to ensure calendar is ready
      setTimeout(() => {
        calendarApiRef.current?.unselect()
      }, 100)
    }
  }, [dialogOpen])

  useEffect(() => {
    loadShifts()
  }, [])

  // Setup MutationObserver to prevent title duplication
  useEffect(() => {
    const titleEl = document.querySelector(".fc-toolbar-title")
    if (!titleEl) return

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" || mutation.type === "characterData") {
          const currentText = titleEl.textContent?.trim() || ""
          const expectedText = titleUpdateRef.current

          // Only fix duplication, don't interfere with normal updates
          if (expectedText && currentText !== expectedText && !isUpdatingTitleRef.current) {
            // Check if it's a duplication (contains our expected text twice or more)
            const occurrences = (
              currentText.match(
                new RegExp(expectedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
              ) || []
            ).length
            if (occurrences > 1) {
              isUpdatingTitleRef.current = true
              titleEl.textContent = expectedText
              setTimeout(() => {
                isUpdatingTitleRef.current = false
              }, 100)
            }
          }
        }
      })
    })

    observer.observe(titleEl, {
      childList: true,
      characterData: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
    }
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
    enableOvertime: boolean
  }) {
    const result = await createOrUpdateShiftAction({
      date: data.date,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      isHoliday: data.isHoliday,
      enableOvertime: data.enableOvertime,
    })

    if (result.success && result.data) {
      await loadShifts()
      setDialogOpen(false)
      // Use the date that was just saved to set the calendar view
      const savedDate = new Date(data.date)
      setTimeout(() => {
        if (calendarApiRef.current) {
          calendarApiRef.current.gotoDate(savedDate)
          calendarApiRef.current.unselect()
        }
      }, 150)
      setSelectedDate(null)
    } else {
      setErrorMessage(result.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล")
      setErrorDialogOpen(true)
    }
  }

  function handleDeleteClick(date: string) {
    setDeleteDate(date)
    setDeleteDialogOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteDate) return

    const result = await deleteShiftAction(deleteDate)
    if (result.success) {
      await loadShifts()
      setDialogOpen(false)
      // Use the date that was just deleted to set the calendar view
      const deletedDate = new Date(deleteDate)
      setTimeout(() => {
        if (calendarApiRef.current) {
          calendarApiRef.current.gotoDate(deletedDate)
          calendarApiRef.current.unselect()
        }
      }, 150)
      setSelectedDate(null)
      setDeleteDialogOpen(false)
      setDeleteDate(null)
    } else {
      setErrorMessage(result.error || "เกิดข้อผิดพลาดในการลบข้อมูล")
      setErrorDialogOpen(true)
      setDeleteDialogOpen(false)
    }
  }

  async function handleDeleteShift(date: string) {
    handleDeleteClick(date)
  }

  // Convert shifts to calendar events
  const events = shifts.flatMap((shift) => {
    const isHoliday = shift.isHoliday
    const enableOvertime = shift.enableOvertime !== undefined ? shift.enableOvertime : false
    const checkInTime = shift.checkIn.slice(0, 5)
    const checkOutTime = shift.checkOut.slice(0, 5)
    const timeText = `${checkInTime} - ${checkOutTime}`

    if (isHoliday) {
      // For holidays, create events: holiday label + time + OT indicator (if enabled)
      const holidayEvents: Array<{
        id: string
        title: string
        start: string
        allDay: boolean
        backgroundColor: string
        borderColor: string
        textColor: string
        extendedProps: {
          checkIn: string
          checkOut: string
          isHoliday: boolean
          isHolidayLabel?: boolean
          isHolidayTime?: boolean
          isOT?: boolean
        }
      }> = [
        {
          id: `${shift.id}-holiday-label`,
          title: "วันหยุดนักขัตฤกษ์",
          start: shift.date,
          allDay: true,
          backgroundColor: "rgb(254 243 199)", // amber-100 for holiday label (light amber)
          borderColor: "rgb(251 191 36)", // amber-400
          textColor: "rgb(180 83 9)", // amber-800
          extendedProps: {
            checkIn: checkInTime,
            checkOut: checkOutTime,
            isHoliday: true,
            isHolidayLabel: true,
          },
        },
        {
          id: `${shift.id}-holiday-time`,
          title: timeText,
          start: shift.date,
          allDay: true,
          backgroundColor: "rgb(244 244 245)", // zinc-100 for time (light like work day)
          borderColor: "rgb(228 228 231)", // zinc-200
          textColor: "rgb(24 24 27)", // zinc-900
          extendedProps: {
            checkIn: checkInTime,
            checkOut: checkOutTime,
            isHoliday: true,
            isHolidayTime: true,
          },
        },
      ]

      // Add OT indicator if overtime is enabled
      if (enableOvertime) {
        holidayEvents.push({
          id: `${shift.id}-holiday-ot`,
          title: "OT",
          start: shift.date,
          allDay: true,
          backgroundColor: "rgb(219 234 254)", // blue-100
          borderColor: "rgb(96 165 250)", // blue-400
          textColor: "rgb(30 64 175)", // blue-800
          extendedProps: {
            checkIn: checkInTime,
            checkOut: checkOutTime,
            isHoliday: true,
            isOT: true,
          },
        })
      }

      return holidayEvents
    }

    // For work days, create events: time + OT indicator (if enabled)
    const workEvents: Array<{
      id: string
      title: string
      start: string
      allDay: boolean
      backgroundColor: string
      borderColor: string
      textColor: string
      extendedProps: {
        checkIn: string
        checkOut: string
        isHoliday: boolean
        isOT?: boolean
      }
    }> = [
      {
        id: shift.id.toString(),
        title: timeText,
        start: shift.date,
        allDay: true,
        backgroundColor: "rgb(244 244 245)", // zinc-100 for work
        borderColor: "rgb(228 228 231)", // zinc-200
        textColor: "rgb(24 24 27)", // zinc-900
        extendedProps: {
          checkIn: checkInTime,
          checkOut: checkOutTime,
          isHoliday: false,
        },
      },
    ]

    // Add OT indicator if overtime is enabled
    if (enableOvertime) {
      workEvents.push({
        id: `${shift.id}-ot`,
        title: "OT",
        start: shift.date,
        allDay: true,
        backgroundColor: "rgb(219 234 254)", // blue-100
        borderColor: "rgb(96 165 250)", // blue-400
        textColor: "rgb(30 64 175)", // blue-800
        extendedProps: {
          checkIn: checkInTime,
          checkOut: checkOutTime,
          isHoliday: false,
          isOT: true,
        },
      })
    }

    return workEvents
  })

  const selectedShift = selectedDate ? shifts.find((s) => s.date === selectedDate) : null

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
            eventContent={(eventInfo) => {
              const { checkIn, checkOut, isHolidayLabel, isHolidayTime, isOT } = eventInfo.event
                .extendedProps as {
                checkIn?: string
                checkOut?: string
                isHolidayLabel?: boolean
                isHolidayTime?: boolean
                isOT?: boolean
              }
              const timeText =
                checkIn && checkOut ? `${checkIn} - ${checkOut}` : eventInfo.event.title

              // Holiday label event (yellow)
              if (isHolidayLabel) {
                return {
                  html: `
                    <div style="display: flex; align-items: center; gap: 4px; padding: 2px 0;">
                      <span style="font-size: 0.875rem; line-height: 1.25; font-weight: 500;">วันหยุดนักขัตฤกษ์</span>
                    </div>
                  `,
                }
              }

              // OT indicator event (blue)
              if (isOT) {
                return {
                  html: `
                    <div style="display: flex; align-items: center; gap: 4px; padding: 2px 0;">
                      <span style="font-size: 0.875rem; line-height: 1.25; font-weight: 500;">OT</span>
                    </div>
                  `,
                }
              }

              // Holiday time event (white text on dark background)
              if (isHolidayTime) {
                return {
                  html: `
                    <div style="display: flex; align-items: center; gap: 4px; padding: 2px 0;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span style="font-size: 0.875rem; line-height: 1.25; font-weight: 500;">${timeText}</span>
                    </div>
                  `,
                }
              }

              // Work day event
              return {
                html: `
                  <div style="display: flex; align-items: center; gap: 4px; padding: 2px 0;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span style="font-size: 0.875rem; line-height: 1.25; font-weight: 500;">${timeText}</span>
                  </div>
                `,
              }
            }}
            ref={(ref) => {
              if (ref) {
                calendarApiRef.current = ref.getApi()
              }
            }}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "",
            }}
            dayHeaderFormat={(arg) => {
              try {
                // With dow: 1, FullCalendar will pass dates in order: Mon, Tue, Wed, Thu, Fri, Sat, Sun
                // We need to map them correctly
                let date: Date
                if (arg && typeof arg === "object") {
                  if ("date" in arg && arg.date) {
                    date = arg.date instanceof Date ? arg.date : new Date(arg.date.toString())
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
                  1: "จ", // Monday
                  2: "อ", // Tuesday
                  3: "พ", // Wednesday
                  4: "พฤ", // Thursday
                  5: "ศ", // Friday
                  6: "ส", // Saturday
                }

                return dayMap[date.getDay()] || ""
              } catch (e) {
                console.error("Error in dayHeaderFormat:", e, arg)
                return ""
              }
            }}
            firstDay={0}
            datesSet={() => {
              // Update title and day headers via DOM
              // Use double requestAnimationFrame to ensure FullCalendar has fully rendered
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบข้อมูล</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบข้อมูลวันนี้หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>เกิดข้อผิดพลาด</AlertDialogTitle>
            <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialogOpen(false)}>ตกลง</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
