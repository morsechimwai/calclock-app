"use server"

import {
  getEmployeesCount,
  getFingerprints,
  getEmployees,
  getShiftsByDateRange,
  getShiftForEmployeeByDate,
  type Employee,
  type Shift,
} from "@/lib/db"
import { getCheckInCheckOut, getShiftForDate, timeToMinutes } from "@/lib/utils/payroll-calculator"
import { withActionHandler } from "@/lib/errors"

// Types
export type DashboardStats = {
  totalEmployees: number
  totalFingerprints: number
  lastUpdatedDate: string | null
  totalDaysWithData: number
  checkInStats: Array<{ hour: string; count: number }>
  checkOutStats: Array<{ hour: string; count: number }>
}

export type AttendanceRanking = {
  fingerprint: string
  employeeName: string | null
  employeeId: number | null
  workDays: number
  lateDays: number
  latePercentage: number
  rating: "ดี" | "ควรปรับปรุง"
}

// Helper functions
function calculateWorkHours(times: string[]): { checkIn: string; checkOut: string } {
  if (times.length === 0) {
    return { checkIn: "08:00", checkOut: "17:00" }
  }

  const sortedTimes = times
    .map((time) => {
      const [hour, minute] = time.split(":")
      return `${hour}:${minute}`
    })
    .sort()

  const checkIn = sortedTimes[0]
  const checkOut = sortedTimes.length > 1 ? sortedTimes[sortedTimes.length - 1] : "17:00"

  return { checkIn, checkOut }
}

function isLate(checkInTime: string, shiftCheckIn: string): boolean {
  const checkInMinutes = timeToMinutes(checkInTime)
  const shiftCheckInMinutes = timeToMinutes(shiftCheckIn)
  const lateMinutes = checkInMinutes - shiftCheckInMinutes
  return lateMinutes > 10
}

// Action Handlers (internal)
async function getAttendanceRankingHandler(
  filterType?: "all" | "day" | "month" | "year",
  date?: Date,
  month?: number,
  year?: number | null,
  onlyWithEmployee: boolean = false
): Promise<AttendanceRanking[]> {
  // Get all employees
  const employees = getEmployees()
  const employeeMap = new Map<string, Employee>()
  employees.forEach((emp) => {
    employeeMap.set(emp.fingerprint, emp)
  })

  // Get fingerprints - filter by filter type if provided
  let fingerprints = getFingerprints()

  // Get date range for shift lookup
  let startDate = ""
  let endDate = ""

  if (filterType === "year" && year) {
    startDate = `${year}-01-01`
    endDate = `${year}-12-31`
    fingerprints = fingerprints.filter((fp) => {
      const fpYear = parseInt(fp.date.split("-")[0])
      return fpYear === year
    })
  } else if (filterType === "month" && month && year) {
    const monthStr = String(month).padStart(2, "0")
    startDate = `${year}-${monthStr}-01`
    const lastDay = new Date(year, month, 0).getDate()
    endDate = `${year}-${monthStr}-${lastDay}`
    fingerprints = fingerprints.filter((fp) => {
      const [fpYear, fpMonth] = fp.date.split("-").map(Number)
      return fpYear === year && fpMonth === month
    })
  } else if (filterType === "day" && date) {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`
    startDate = dateStr
    endDate = dateStr
    fingerprints = fingerprints.filter((fp) => fp.date === dateStr)
  } else {
    // For "all", get min and max dates from fingerprints
    if (fingerprints.length > 0) {
      const dates = fingerprints.map((fp) => fp.date).sort()
      startDate = dates[0]
      endDate = dates[dates.length - 1]
    }
  }

  // Get shifts for the date range
  const shifts = startDate && endDate ? getShiftsByDateRange(startDate, endDate) : []
  const shiftMap = new Map<string, Shift>()
  shifts.forEach((shift) => {
    shiftMap.set(shift.date, shift)
  })

  // Build employee-shift map for quick lookup
  const employeeShiftMap: Record<string, Shift> = {}
  if (startDate && endDate) {
    employees.forEach((emp) => {
      // Get all dates in range for this employee
      const dates = fingerprints
        .filter((fp) => fp.fingerprint === emp.fingerprint)
        .map((fp) => fp.date)
        .filter((date, index, self) => self.indexOf(date) === index) // unique dates

      dates.forEach((date) => {
        const shift = getShiftForEmployeeByDate(emp.id, date)
        if (shift) {
          employeeShiftMap[`${emp.id}-${date}`] = shift
        }
      })
    })
  }

  // Group fingerprints by fingerprint and date
  const groupedByFingerprint = new Map<string, Map<string, string[]>>()

  fingerprints.forEach((fp) => {
    if (!groupedByFingerprint.has(fp.fingerprint)) {
      groupedByFingerprint.set(fp.fingerprint, new Map())
    }
    const dateMap = groupedByFingerprint.get(fp.fingerprint)!
    if (!dateMap.has(fp.date)) {
      dateMap.set(fp.date, [])
    }
    const times = dateMap.get(fp.date)!
    if (!times.includes(fp.time)) {
      times.push(fp.time)
    }
  })

  // Calculate ranking for each employee
  const rankings: AttendanceRanking[] = []

  groupedByFingerprint.forEach((dateMap, fingerprint) => {
    let workDays = 0
    let lateDays = 0

    const employee = employeeMap.get(fingerprint)
    dateMap.forEach((times, date) => {
      // Only count if there are exactly 2 time entries (check-in and check-out)
      if (times.length === 2) {
        workDays++
        const { checkIn } = getCheckInCheckOut(times)
        // Get shift for this employee and date
        let shift: {
          checkIn: string
          checkOut: string
          isHoliday: boolean
          enableOvertime: boolean
        }
        if (employee?.id) {
          const shiftKey = `${employee.id}-${date}`
          const assignedShift = employeeShiftMap[shiftKey]
          if (assignedShift) {
            shift = {
              checkIn: assignedShift.checkIn.slice(0, 5),
              checkOut: assignedShift.checkOut.slice(0, 5),
              isHoliday: assignedShift.isHoliday,
              enableOvertime:
                assignedShift.enableOvertime !== undefined ? assignedShift.enableOvertime : false,
            }
          } else {
            shift = getShiftForDate(date, shiftMap)
          }
        } else {
          shift = getShiftForDate(date, shiftMap)
        }
        // Check if check-in is late (more than 10 minutes after shift check-in time)
        if (isLate(checkIn, shift.checkIn)) {
          lateDays++
        }
      }
    })

    const latePercentage = workDays > 0 ? Math.round((lateDays / workDays) * 100 * 10) / 10 : 0
    const rating: "ดี" | "ควรปรับปรุง" = latePercentage <= 10 ? "ดี" : "ควรปรับปรุง"

    rankings.push({
      fingerprint,
      employeeName: employee?.name ?? null,
      employeeId: employee?.id ?? null,
      workDays,
      lateDays,
      latePercentage,
      rating,
    })
  })

  // Filter by employee name if requested
  let filteredRankings = rankings
  if (onlyWithEmployee) {
    filteredRankings = rankings.filter(
      (r) => r.employeeName !== null && r.employeeName.trim() !== ""
    )
  }

  // Sort by employee id ascending
  filteredRankings.sort((a, b) => {
    if (a.employeeId !== null && b.employeeId !== null) {
      return a.employeeId - b.employeeId
    }
    if (a.employeeId !== null && b.employeeId === null) {
      return -1
    }
    if (a.employeeId === null && b.employeeId !== null) {
      return 1
    }
    const aNum = parseInt(a.fingerprint, 10)
    const bNum = parseInt(b.fingerprint, 10)
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum
    }
    return a.fingerprint.localeCompare(b.fingerprint)
  })

  return filteredRankings
}

async function getDashboardStatsHandler(
  filterType?: "all" | "day" | "month" | "year",
  date?: Date,
  month?: number,
  year?: number | null
): Promise<DashboardStats> {
  const totalEmployees = getEmployeesCount()

  // Get fingerprints - filter by filter type if provided
  let fingerprints = getFingerprints()

  if (filterType === "year" && year) {
    fingerprints = fingerprints.filter((fp) => {
      const fpYear = parseInt(fp.date.split("-")[0])
      return fpYear === year
    })
  } else if (filterType === "month" && month && year) {
    fingerprints = fingerprints.filter((fp) => {
      const [fpYear, fpMonth] = fp.date.split("-").map(Number)
      return fpYear === year && fpMonth === month
    })
  } else if (filterType === "day" && date) {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`
    fingerprints = fingerprints.filter((fp) => fp.date === dateStr)
  }

  const totalFingerprints = fingerprints.length

  // Find last updated date
  let lastUpdatedDate: string | null = null
  if (fingerprints.length > 0) {
    const sortedByDate = [...fingerprints].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`)
      const dateB = new Date(`${b.date}T${b.time}`)
      return dateB.getTime() - dateA.getTime()
    })
    lastUpdatedDate = sortedByDate[0].date
  }

  // Group fingerprints by date and fingerprint
  const groupedByDate = new Map<string, Map<string, string[]>>()

  fingerprints.forEach((fp) => {
    if (!groupedByDate.has(fp.date)) {
      groupedByDate.set(fp.date, new Map())
    }
    const dateMap = groupedByDate.get(fp.date)!
    if (!dateMap.has(fp.fingerprint)) {
      dateMap.set(fp.fingerprint, [])
    }
    const times = dateMap.get(fp.fingerprint)!
    if (!times.includes(fp.time)) {
      times.push(fp.time)
    }
  })

  // Calculate check-in and check-out stats
  const checkInHourCounts = new Map<string, number>()
  const checkOutHourCounts = new Map<string, number>()

  groupedByDate.forEach((dateMap) => {
    dateMap.forEach((times) => {
      if (times.length >= 2) {
        const { checkIn, checkOut } = calculateWorkHours(times)

        const checkInHour = checkIn.split(":")[0]
        checkInHourCounts.set(checkInHour, (checkInHourCounts.get(checkInHour) || 0) + 1)

        const checkOutHour = checkOut.split(":")[0]
        checkOutHourCounts.set(checkOutHour, (checkOutHourCounts.get(checkOutHour) || 0) + 1)
      }
    })
  })

  // Count unique dates with data
  const totalDaysWithData = groupedByDate.size

  // Convert to arrays and sort
  const checkInStats = Array.from(checkInHourCounts.entries())
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour))

  const checkOutStats = Array.from(checkOutHourCounts.entries())
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour))

  return {
    totalEmployees,
    totalFingerprints,
    lastUpdatedDate,
    totalDaysWithData,
    checkInStats,
    checkOutStats,
  }
}

// Export wrapped actions (Result Pattern)
export const getAttendanceRankingAction = withActionHandler(getAttendanceRankingHandler)
export const getDashboardStatsAction = withActionHandler(getDashboardStatsHandler)
