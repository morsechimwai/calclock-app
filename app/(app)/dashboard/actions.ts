"use server"

import {
  getEmployeesCount,
  getFingerprintsCount,
  getFingerprints,
  type Fingerprint,
} from "@/lib/db"

export type DashboardStats = {
  totalEmployees: number
  totalFingerprints: number
  lastUpdatedDate: string | null
  totalDaysWithData: number
  checkInStats: Array<{ hour: string; count: number }>
  checkOutStats: Array<{ hour: string; count: number }>
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

export async function getDashboardStats(year?: number | null): Promise<DashboardStats> {
  const totalEmployees = getEmployeesCount()

  // Get fingerprints - filter by year if provided
  let fingerprints = getFingerprints()

  if (year) {
    // Filter by year
    fingerprints = fingerprints.filter((fp) => {
      const fpYear = parseInt(fp.date.split("-")[0])
      return fpYear === year
    })
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

