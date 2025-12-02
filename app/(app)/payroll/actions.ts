"use server"

import {
  getFingerprintsByDateRange,
  getEmployees,
  createFingerprint,
  deleteFingerprint,
  getShiftsByDateRange,
  type Fingerprint,
  type Employee,
  type Shift,
} from "@/lib/db"
import { revalidatePath } from "next/cache"

export type PayrollEntry = {
  fingerprint: string
  employeeName: string | null
  date: string
  times: Array<{
    time: string
    id: number
    isManual: boolean
  }>
}

export type PayrollData = {
  fingerprint: string
  employeeName: string | null
  entries: Array<{
    date: string
    times: Array<{
      time: string
      id: number
      isManual: boolean
    }>
  }>
  shifts: Array<Shift>
}

export async function getPayrollData(
  startDate: string,
  endDate: string
): Promise<PayrollData[]> {
  // Get fingerprints in date range
  const fingerprints = getFingerprintsByDateRange(startDate, endDate)

  // Get shifts in date range
  const shifts = getShiftsByDateRange(startDate, endDate)
  const shiftMap = new Map<string, Shift>()
  shifts.forEach((shift) => {
    shiftMap.set(shift.date, shift)
  })

  // Get all employees for name lookup
  const employees = getEmployees()
  const employeeMap = new Map<string, Employee>()
  employees.forEach((emp) => {
    employeeMap.set(emp.fingerprint, emp)
  })

  // Group by fingerprint and date
  const grouped = new Map<
    string,
    Map<string, Array<{ time: string; id: number; isManual: boolean }>>
  >()

  fingerprints.forEach((fp) => {
    if (!grouped.has(fp.fingerprint)) {
      grouped.set(fp.fingerprint, new Map())
    }
    const dateMap = grouped.get(fp.fingerprint)!
    if (!dateMap.has(fp.date)) {
      dateMap.set(fp.date, [])
    }
    // Only add time if it doesn't already exist (avoid duplicates)
    const times = dateMap.get(fp.date)!
    const timeExists = times.some((t) => t.time === fp.time)
    if (!timeExists) {
      times.push({ time: fp.time, id: fp.id, isManual: fp.isManual })
    }
  })

  // Convert to PayrollData array
  const result: PayrollData[] = []

  grouped.forEach((dateMap, fingerprint) => {
    const employee = employeeMap.get(fingerprint)
    const entries: Array<{
      date: string
      times: Array<{ time: string; id: number; isManual: boolean }>
    }> = []

    // Sort dates
    const sortedDates = Array.from(dateMap.keys()).sort()

    sortedDates.forEach((date) => {
      // Sort times properly (HH:MM:SS format)
      const times = dateMap.get(date)!.sort((a, b) => {
        // Compare time strings directly (HH:MM:SS format sorts correctly as string)
        return a.time.localeCompare(b.time)
      })
      entries.push({ date, times })
    })

    result.push({
      fingerprint,
      employeeName: employee?.name ?? null,
      entries,
      shifts: Array.from(shiftMap.values()),
    })
  })

  // Sort by fingerprint (ascending) - numeric sort if both are numbers, otherwise string sort
  result.sort((a, b) => {
    const aNum = Number(a.fingerprint)
    const bNum = Number(b.fingerprint)

    // If both are valid numbers, sort numerically
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum
    }

    // Otherwise sort as strings
    return a.fingerprint.localeCompare(b.fingerprint)
  })

  return result
}

export async function addFingerprintTime(
  fingerprint: string,
  date: string,
  time: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = createFingerprint({
      fingerprint,
      date,
      time,
      isManual: true,
    })

    if (!result) {
      return { success: false, error: "เวลาเดียวกันมีอยู่แล้ว" }
    }

    revalidatePath("/payroll")
    return { success: true }
  } catch (error) {
    console.error("Error adding fingerprint time:", error)
    return { success: false, error: "เกิดข้อผิดพลาดในการเพิ่มเวลา" }
  }
}

export async function removeFingerprintTime(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    deleteFingerprint(id)
    revalidatePath("/payroll")
    return { success: true }
  } catch (error) {
    console.error("Error removing fingerprint time:", error)
    return { success: false, error: "เกิดข้อผิดพลาดในการลบเวลา" }
  }
}

