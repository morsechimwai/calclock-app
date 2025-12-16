"use server"

import {
  getEmployeesCount,
  getFingerprintsCount,
  getFingerprints,
  getEmployees,
  getShiftsByDateRange,
  getShiftForEmployeeByDate,
  type Fingerprint,
  type Employee,
  type Shift,
} from "@/lib/db"
import { getCheckInCheckOut, getShiftForDate, timeToMinutes } from "@/lib/utils/payroll-calculator"

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

// Calculate check-in and check-out times from fingerprint data
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

// Check if check-in is late (more than 10 minutes after shift check-in time)
// This compares the actual check-in time with the shift check-in time from "จัดการเวลาเข้างาน"
function isLate(checkInTime: string, shiftCheckIn: string): boolean {
  const checkInMinutes = timeToMinutes(checkInTime)
  const shiftCheckInMinutes = timeToMinutes(shiftCheckIn)
  const lateMinutes = checkInMinutes - shiftCheckInMinutes
  // Late if more than 10 minutes after shift check-in time
  return lateMinutes > 10 // LATE_THRESHOLD_MINUTES
}

export async function getAttendanceRanking(
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
        // Get shift for this employee and date from "จัดการเวลาเข้างาน" (shift management)
        // This uses the actual shift check-in time set for this specific employee and date
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

  // Sort by employee id ascending (id น้อยไปมาก)
  filteredRankings.sort((a, b) => {
    // ถ้ามี employeeId ทั้งคู่ เรียงตาม id
    if (a.employeeId !== null && b.employeeId !== null) {
      return a.employeeId - b.employeeId
    }
    // ถ้า a มี id แต่ b ไม่มี ให้ a มาก่อน
    if (a.employeeId !== null && b.employeeId === null) {
      return -1
    }
    // ถ้า b มี id แต่ a ไม่มี ให้ b มาก่อน
    if (a.employeeId === null && b.employeeId !== null) {
      return 1
    }
    // ถ้าทั้งคู่ไม่มี id เรียงตาม fingerprint (แปลงเป็น number ก่อน)
    const aNum = parseInt(a.fingerprint, 10)
    const bNum = parseInt(b.fingerprint, 10)
    // ถ้าแปลงเป็น number ได้ทั้งคู่ ให้เรียงตาม number
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum
    }
    // ถ้าแปลงไม่ได้ ให้เรียงตาม string
    return a.fingerprint.localeCompare(b.fingerprint)
  })

  return filteredRankings
}

export async function getDashboardStats(
  filterType?: "all" | "day" | "month" | "year",
  date?: Date,
  month?: number,
  year?: number | null
): Promise<DashboardStats> {
  const totalEmployees = getEmployeesCount()

  // Get fingerprints - filter by filter type if provided
  let fingerprints = getFingerprints()

  if (filterType === "year" && year) {
    // Filter by year
    fingerprints = fingerprints.filter((fp) => {
      const fpYear = parseInt(fp.date.split("-")[0])
      return fpYear === year
    })
  } else if (filterType === "month" && month && year) {
    // Filter by month and year
    fingerprints = fingerprints.filter((fp) => {
      const [fpYear, fpMonth] = fp.date.split("-").map(Number)
      return fpYear === year && fpMonth === month
    })
  } else if (filterType === "day" && date) {
    // Filter by specific date
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
        // Only count if there are at least 2 times (check-in and check-out)
        const { checkIn, checkOut } = calculateWorkHours(times)

        // Extract hour from check-in (HH:MM format)
        const checkInHour = checkIn.split(":")[0]
        checkInHourCounts.set(checkInHour, (checkInHourCounts.get(checkInHour) || 0) + 1)

        // Extract hour from check-out (HH:MM format)
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
