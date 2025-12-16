"use client"

import { useState, useEffect, useRef } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import type { DateSelectArg, EventClickArg, CalendarApi } from "@fullcalendar/core"
import {
  getShiftsAction,
  createOrUpdateShiftAction,
  deleteShiftAction,
  getShiftAssignmentsWithEmployeesAction,
} from "./actions"
import type { Shift, Employee } from "@/lib/db"
import { ShiftDialog } from "@/components/shift-dialog"
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

export default function ShiftPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteShiftId, setDeleteShiftId] = useState<number | null>(null)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [shiftEmployeesMap, setShiftEmployeesMap] = useState<Record<number, Employee[]>>({})
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

  // Setup Popover for employee list on employee count click
  useEffect(() => {
    if (isLoading) return

    const handleEmployeeCountClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Check if clicked on employee count element or its parent
      const employeeCountElement = target.closest("[data-employee-count]") as HTMLElement
      if (!employeeCountElement) return

      // Check if clicked specifically on the employee count span
      const clickedOnCount = target.closest('span[style*="display: inline-flex"]')
      if (!clickedOnCount) return

      e.stopPropagation() // Prevent FullCalendar event click

      const employeeCount = parseInt(
        employeeCountElement.getAttribute("data-employee-count") || "0"
      )
      if (employeeCount === 0) return

      const employeesJson = employeeCountElement.getAttribute("data-employees")
      if (!employeesJson) return

      try {
        const employees: Employee[] = JSON.parse(employeesJson)
        if (employees.length === 0) return

        // Remove existing popovers
        document.querySelectorAll("[data-employee-popover]").forEach((el) => el.remove())

        // Create popover content
        const popover = document.createElement("div")
        popover.setAttribute("data-employee-popover", "true")
        popover.className = "z-50 w-72 rounded-md border border-zinc-200 bg-white p-4 shadow-md"
        popover.style.position = "fixed"
        popover.style.top = `${e.clientY + 10}px`
        popover.style.left = `${e.clientX + 10}px`

        const title = document.createElement("div")
        title.className = "text-sm font-semibold text-zinc-900 mb-3"
        title.textContent = `พนักงานในกะ (${employees.length} คน)`
        popover.appendChild(title)

        const list = document.createElement("div")
        list.className = "space-y-2 max-h-60 overflow-y-auto"
        employees.forEach((emp) => {
          const item = document.createElement("div")
          item.className = "text-sm text-zinc-700 py-1"
          item.textContent = emp.name
          list.appendChild(item)
        })
        popover.appendChild(list)

        document.body.appendChild(popover)

        // Remove popover when clicking outside
        const removePopover = (clickEvent: MouseEvent) => {
          if (!popover.contains(clickEvent.target as Node)) {
            popover.remove()
            document.removeEventListener("click", removePopover)
          }
        }
        setTimeout(() => {
          document.addEventListener("click", removePopover)
        }, 100)
      } catch (error) {
        console.error("Error parsing employees:", error)
      }
    }

    // Use event delegation
    document.addEventListener("click", handleEmployeeCountClick, true)

    return () => {
      document.removeEventListener("click", handleEmployeeCountClick, true)
    }
  }, [isLoading])

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

      // Load employee assignments for all shifts
      const employeesMap: Record<number, Employee[]> = {}
      await Promise.all(
        data.map(async (shift) => {
          const result = await getShiftAssignmentsWithEmployeesAction(shift.id)
          if (result.success) {
            employeesMap[shift.id] = result.employees
          }
        })
      )
      setShiftEmployeesMap(employeesMap)
    } catch (error) {
      console.error("Error loading shifts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleDateSelect(selectInfo: DateSelectArg) {
    const date = selectInfo.startStr.split("T")[0]
    setSelectedDate(date)
    setSelectedShiftId(null) // New shift
    setDialogOpen(true)
    selectInfo.view.calendar.unselect()
  }

  function handleEventClick(clickInfo: EventClickArg) {
    const shiftId = clickInfo.event.extendedProps?.shiftId as number | undefined
    const date = clickInfo.event.startStr?.split("T")[0]
    if (date && shiftId) {
      setSelectedDate(date)
      setSelectedShiftId(shiftId)
      setDialogOpen(true)
    }
  }

  async function handleSaveShift(data: {
    id?: number
    date: string
    name?: string | null
    checkIn: string
    checkOut: string
    isHoliday: boolean
    enableOvertime: boolean
    employeeIds: number[]
  }) {
    const result = await createOrUpdateShiftAction({
      id: data.id,
      date: data.date,
      name: data.name,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      isHoliday: data.isHoliday,
      enableOvertime: data.enableOvertime,
      employeeIds: data.employeeIds,
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

  function handleDeleteClick(shiftId: number) {
    setDeleteShiftId(shiftId)
    setDeleteDialogOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteShiftId) return

    const result = await deleteShiftAction(deleteShiftId)
    if (result.success) {
      await loadShifts()
      setDialogOpen(false)
      setSelectedDate(null)
      setSelectedShiftId(null)
      setDeleteDialogOpen(false)
      setDeleteShiftId(null)
    } else {
      setErrorMessage(result.error || "เกิดข้อผิดพลาดในการลบข้อมูล")
      setErrorDialogOpen(true)
      setDeleteDialogOpen(false)
    }
  }

  async function handleDeleteShift(id: number) {
    handleDeleteClick(id)
  }

  // Convert shifts to calendar events
  const events = shifts.flatMap((shift) => {
    const isHoliday = shift.isHoliday
    const enableOvertime = shift.enableOvertime !== undefined ? shift.enableOvertime : false
    const checkInTime = shift.checkIn.slice(0, 5)
    const checkOutTime = shift.checkOut.slice(0, 5)
    const shiftNameText = shift.name ? ` [${shift.name}]` : ""
    const timeText = `${checkInTime} - ${checkOutTime}${shiftNameText}`
    const employees = shiftEmployeesMap[shift.id] || []
    const employeeCount = employees.length

    if (isHoliday) {
      // For holidays, create single event with time, OT, and SD indicator
      const holidayEvents: Array<{
        id: string
        title: string
        start: string
        allDay: boolean
        backgroundColor: string
        borderColor: string
        textColor: string
        extendedProps: {
          shiftId: number
          checkIn: string
          checkOut: string
          isHoliday: boolean
          shiftName?: string | null
          enableOvertime?: boolean
          employeeCount?: number
          employees?: Employee[]
        }
      }> = [
        {
          id: shift.id.toString(),
          title: timeText,
          start: shift.date,
          allDay: true,
          backgroundColor: "rgb(244 244 245)", // zinc-100 for time (light like work day)
          borderColor: "rgb(228 228 231)", // zinc-200
          textColor: "rgb(24 24 27)", // zinc-900
          extendedProps: {
            shiftId: shift.id,
            checkIn: checkInTime,
            checkOut: checkOutTime,
            isHoliday: true,
            shiftName: shift.name,
            enableOvertime: enableOvertime,
            employeeCount,
            employees,
          },
        },
      ]

      return holidayEvents
    }

    // For work days, create single event with time and OT indicator (if enabled)
    const workEvents: Array<{
      id: string
      title: string
      start: string
      allDay: boolean
      backgroundColor: string
      borderColor: string
      textColor: string
      extendedProps: {
        shiftId: number
        checkIn: string
        checkOut: string
        isHoliday: boolean
        shiftName?: string | null
        enableOvertime?: boolean
        employeeCount?: number
        employees?: Employee[]
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
          shiftId: shift.id,
          checkIn: checkInTime,
          checkOut: checkOutTime,
          isHoliday: false,
          shiftName: shift.name,
          enableOvertime: enableOvertime,
          employeeCount,
          employees,
        },
      },
    ]

    return workEvents
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">จัดการเวลาเข้างาน</h1>
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
              const {
                checkIn,
                checkOut,
                isHoliday,
                shiftName,
                enableOvertime,
                employeeCount,
                employees,
              } = eventInfo.event.extendedProps as {
                checkIn?: string
                checkOut?: string
                isHoliday?: boolean
                shiftName?: string | null
                enableOvertime?: boolean
                employeeCount?: number
                employees?: Employee[]
              }
              const shiftNameText = shiftName ? ` [${shiftName}]` : ""
              const timeText =
                checkIn && checkOut
                  ? `${checkIn} - ${checkOut}${shiftNameText}`
                  : eventInfo.event.title

              // Holiday event or Work day event
              const otIndicator = enableOvertime
                ? `<span style="display: inline-flex; align-items: center; padding: 2px 6px; background-color: rgb(219 234 254); border-radius: 4px; font-size: 0.75rem; font-weight: 500; color: rgb(30 64 175);">OT</span>`
                : ""
              const sdIndicator = isHoliday
                ? `<span style="display: inline-flex; align-items: center; padding: 2px 6px; background-color: rgb(254 243 199); border-radius: 4px; font-size: 0.75rem; font-weight: 500; color: rgb(180 83 9);">SD</span>`
                : ""
              const employeeInfo =
                employeeCount && employeeCount > 0
                  ? `<span style="display: inline-flex; align-items: center; gap: 2px; font-size: 0.75rem; color: rgb(113 113 122);">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      <span>${employeeCount} คน</span>
                    </span>`
                  : ""

              const secondLine =
                otIndicator || employeeInfo || sdIndicator
                  ? `
                <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                  ${employeeInfo || ""}
                  ${otIndicator || ""}
                  ${sdIndicator || ""}
                </div>
              `
                  : ""

              return {
                html: `
                  <div style="display: flex; flex-direction: column; padding: 2px 0;" data-employee-count="${
                    employeeCount || 0
                  }" data-employees='${JSON.stringify(employees || [])}'>
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span style="font-size: 0.875rem; line-height: 1.25; font-weight: 500; font-family: monospace;">${timeText}</span>
                    </div>
                    ${secondLine}
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
        shiftId={selectedShiftId}
        onSave={handleSaveShift}
        onDelete={handleDeleteShift}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบข้อมูล</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบกะนี้หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้
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
