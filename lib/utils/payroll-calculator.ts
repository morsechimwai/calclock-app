import type { Shift } from "@/lib/db"

export type { Shift }

const STANDARD_WORK_HOURS = 8 // 8 hours per day
const LUNCH_BREAK_DEDUCTION = 1 // 1 hour to deduct from work hours
const LUNCH_BREAK_OT = 0.5 // 0.5 hours for OT calculation
const LATE_THRESHOLD_MINUTES = 10 // 10 minutes late threshold
const LATE_ROUND_UP_MINUTES = 30 // Round up to 30 minutes if late
const OT_THRESHOLD_MINUTES = 30 // 30 minutes OT threshold
const CONSECUTIVE_DAYS_FOR_OT = 7 // 7 consecutive days for full OT

// Convert time string (HH:MM or HH:MM:SS) to minutes
export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number)
  return hour * 60 + minute
}

// Convert minutes to time string (HH:MM)
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

// Convert minutes to hours (decimal)
export function minutesToHours(minutes: number): number {
  return minutes / 60
}

// Get shift for a date, with default values
export function getShiftForDate(
  date: string,
  shifts: Map<string, Shift>
): { checkIn: string; checkOut: string; isHoliday: boolean } {
  const shift = shifts.get(date)
  if (shift) {
    // Extract HH:MM from HH:MM:SS format
    const checkIn = shift.checkIn.slice(0, 5)
    const checkOut = shift.checkOut.slice(0, 5)
    return { checkIn, checkOut, isHoliday: shift.isHoliday }
  }
  return { checkIn: "08:00", checkOut: "17:00", isHoliday: false }
}

// Calculate effective check-in time based on late arrival rules
export function calculateEffectiveCheckIn(
  actualCheckIn: string,
  shiftCheckIn: string
): {
  effectiveCheckIn: string
  isLate: boolean
  isLateWarning: boolean
} {
  const actualMinutes = timeToMinutes(actualCheckIn)
  const shiftMinutes = timeToMinutes(shiftCheckIn)
  const lateMinutes = actualMinutes - shiftMinutes

  // If arrived before shift time, use shift time
  if (lateMinutes <= 0) {
    return {
      effectiveCheckIn: shiftCheckIn,
      isLate: false,
      isLateWarning: false,
    }
  }

  // If late not more than 10 minutes, allow full work hours (use shift time)
  if (lateMinutes > 0 && lateMinutes <= LATE_THRESHOLD_MINUTES) {
    return {
      effectiveCheckIn: shiftCheckIn,
      isLate: false,
      isLateWarning: false,
    }
  }

  // If late more than 10 minutes but not more than 30 minutes, round up to 30 minutes
  if (lateMinutes > LATE_THRESHOLD_MINUTES && lateMinutes <= LATE_ROUND_UP_MINUTES) {
    const roundedCheckIn = shiftMinutes + LATE_ROUND_UP_MINUTES
    return {
      effectiveCheckIn: minutesToTime(roundedCheckIn),
      isLate: false,
      isLateWarning: true, // Show red color and clock-alert icon
    }
  }

  // If late more than 30 minutes, round up to next hour
  // Example: 8:35 → 9:00, 8:45 → 9:00, 8:59 → 9:00
  const nextHour = Math.floor(actualMinutes / 60) + 1
  const roundedCheckIn = nextHour * 60
  return {
    effectiveCheckIn: minutesToTime(roundedCheckIn),
    isLate: true,
    isLateWarning: false,
  }
}

// Check if there's a lunch break (between 12:30 and 13:00)
export function hasLunchBreak(times: string[]): boolean {
  const lunchStart = timeToMinutes("12:30")
  const lunchEnd = timeToMinutes("13:00")

  return times.some((time) => {
    const timeMinutes = timeToMinutes(time)
    return timeMinutes >= lunchStart && timeMinutes <= lunchEnd
  })
}

// Check if employee worked 7 or more consecutive days (this date is the 7th day of a consecutive period)
// Count resets for each consecutive period
export function isConsecutiveDay7(
  date: string,
  employeeDates: string[]
): boolean {
  // Sort dates
  const sortedDates = [...employeeDates].sort()
  const currentDateIndex = sortedDates.indexOf(date)

  if (currentDateIndex < 0) return false

  // Find the consecutive period that contains this date
  // Start from current date and go backwards to find the start of the consecutive period
  let periodStartIndex = currentDateIndex
  for (let i = currentDateIndex - 1; i >= 0; i--) {
    const prevDate = sortedDates[i]
    const expectedDate = new Date(sortedDates[i + 1])
    expectedDate.setDate(expectedDate.getDate() - 1)
    const expectedDateStr = expectedDate.toISOString().split("T")[0]

    if (prevDate === expectedDateStr) {
      periodStartIndex = i
    } else {
      break
    }
  }

  // Find the end of the consecutive period
  let periodEndIndex = currentDateIndex
  for (let i = currentDateIndex + 1; i < sortedDates.length; i++) {
    const nextDate = sortedDates[i]
    const expectedDate = new Date(sortedDates[i - 1])
    expectedDate.setDate(expectedDate.getDate() + 1)
    const expectedDateStr = expectedDate.toISOString().split("T")[0]

    if (nextDate === expectedDateStr) {
      periodEndIndex = i
    } else {
      break
    }
  }

  // Calculate position in the consecutive period (1-based)
  const positionInPeriod = currentDateIndex - periodStartIndex + 1

  // Check if this is the 7th day (or 14th, 21st, etc. - every 7th day)
  return positionInPeriod % 7 === 0
}

// Calculate work days and OT hours based on new rules
export function calculateWorkDaysAndOT(
  actualCheckIn: string,
  actualCheckOut: string,
  shiftCheckIn: string,
  shiftCheckOut: string,
  isHoliday: boolean,
  isConsecutiveDay7: boolean,
  times: string[]
): {
  workDays: number
  otHours: number
  lunchBreakOT: number
  effectiveCheckIn: string
  isLateWarning: boolean
} {
  // Rule 6: Consecutive day 7 = count all work hours as OT (including lunch break if worked 8+ hours)
  if (isConsecutiveDay7) {
    // Calculate effective check-in (handles late arrival rules)
    const { effectiveCheckIn, isLateWarning } = calculateEffectiveCheckIn(
      actualCheckIn,
      shiftCheckIn
    )

    const effectiveCheckInMinutes = timeToMinutes(effectiveCheckIn)
    const actualCheckOutMinutes = timeToMinutes(actualCheckOut)

    // Calculate total work hours
    let totalMinutes = actualCheckOutMinutes - effectiveCheckInMinutes

    // Check if worked 8+ hours for lunch break
    const hasLunch = totalMinutes >= STANDARD_WORK_HOURS * 60

    // Subtract 1 hour lunch break if worked 8+ hours
    if (hasLunch) {
      totalMinutes -= LUNCH_BREAK_DEDUCTION * 60
    }

    // If worked 8+ hours, always include lunch break OT (0.5 hours)
    let lunchBreakOT = 0
    if (hasLunch) {
      lunchBreakOT = LUNCH_BREAK_OT
      // Don't add to otHours - it's a separate field
    }

    // All work hours (after subtracting lunch break) count as OT
    const totalHours = minutesToHours(totalMinutes)
    const otHours = totalHours

    return {
      workDays: 0,
      otHours: Math.round((otHours * 10)) / 10,
      lunchBreakOT: Math.round((lunchBreakOT * 10)) / 10,
      effectiveCheckIn,
      isLateWarning,
    }
  }

  // Rule 5: Holiday = count actual work hours as OT (not fixed 8 hours)
  if (isHoliday) {
    // Calculate effective check-in (handles late arrival rules)
    const { effectiveCheckIn, isLateWarning } = calculateEffectiveCheckIn(
      actualCheckIn,
      shiftCheckIn
    )

    const effectiveCheckInMinutes = timeToMinutes(effectiveCheckIn)
    const actualCheckOutMinutes = timeToMinutes(actualCheckOut)

    // Calculate total work hours (without subtracting lunch break for OT calculation)
    const totalMinutesWithoutLunch = actualCheckOutMinutes - effectiveCheckInMinutes

    // Check if worked 8+ hours for lunch break
    const hasLunch = totalMinutesWithoutLunch >= STANDARD_WORK_HOURS * 60

    // If worked 8+ hours, always include lunch break OT (0.5 hours)
    let lunchBreakOT = 0
    if (hasLunch) {
      lunchBreakOT = LUNCH_BREAK_OT
      // Don't add to otHours - it's a separate field
    }

    // All work hours (without subtracting lunch break) count as OT
    const totalHours = minutesToHours(totalMinutesWithoutLunch)

    return {
      workDays: 0,
      otHours: Math.round((totalHours * 10)) / 10,
      lunchBreakOT: Math.round((lunchBreakOT * 10)) / 10,
      effectiveCheckIn,
      isLateWarning,
    }
  }

  // Calculate effective check-in (handles late arrival rules)
  const { effectiveCheckIn, isLateWarning } = calculateEffectiveCheckIn(
    actualCheckIn,
    shiftCheckIn
  )

  const effectiveCheckInMinutes = timeToMinutes(effectiveCheckIn)
  const actualCheckOutMinutes = timeToMinutes(actualCheckOut)
  const shiftCheckOutMinutes = timeToMinutes(shiftCheckOut)

  // Calculate total work hours
  const totalMinutesWithoutLunch = actualCheckOutMinutes - effectiveCheckInMinutes

  // Check if worked 8+ hours for lunch break (always count if 8+ hours, regardless of actual lunch break)
  const hasLunch = totalMinutesWithoutLunch >= STANDARD_WORK_HOURS * 60

  // Calculate work hours for work days calculation (subtract 1 hour lunch break if applicable)
  let totalMinutesForWorkDays = totalMinutesWithoutLunch
  if (hasLunch) {
    totalMinutesForWorkDays -= LUNCH_BREAK_DEDUCTION * 60
  }

  const workHours = minutesToHours(totalMinutesForWorkDays)

  // Calculate work days - limit to maximum 1 day
  let workDays = workHours / STANDARD_WORK_HOURS
  if (workDays > 1) {
    workDays = 1
  }

  // Calculate OT hours
  let otHours = 0
  let lunchBreakOT = 0

  // OT from lunch break if worked 8+ hours (0.5 hours) - separate field
  // If worked 8+ hours, always count lunch break OT (not included in otHours)
  if (hasLunch) {
    lunchBreakOT = LUNCH_BREAK_OT
    // Don't add to otHours - it's a separate field
  }

  // Calculate OT: hours worked beyond 8 hours (after subtracting 1 hour lunch break)
  // Example: worked 9 hours → 9 - 1 = 8 hours → OT = 8 - 8 = 0 hours
  // Example: worked 10 hours → 10 - 1 = 9 hours → OT = 9 - 8 = 1 hour
  let totalMinutesForOT = totalMinutesWithoutLunch
  if (hasLunch) {
    totalMinutesForOT -= LUNCH_BREAK_DEDUCTION * 60
  }
  const totalWorkHoursForOT = minutesToHours(totalMinutesForOT)
  if (totalWorkHoursForOT > STANDARD_WORK_HOURS) {
    otHours = totalWorkHoursForOT - STANDARD_WORK_HOURS
  }

  // Round to 1 decimal place
  return {
    workDays: Math.round((workDays * 10)) / 10,
    otHours: Math.round((otHours * 10)) / 10,
    lunchBreakOT: Math.round((lunchBreakOT * 10)) / 10,
    effectiveCheckIn,
    isLateWarning,
  }
}

// Get check-in and check-out times from fingerprint data
export function getCheckInCheckOut(times: string[]): {
  checkIn: string
  checkOut: string
} {
  if (times.length === 0) {
    return { checkIn: "08:00", checkOut: "17:00" }
  }

  // Sort times and extract HH:MM
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

