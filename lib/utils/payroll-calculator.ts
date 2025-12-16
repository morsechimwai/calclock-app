import type { Shift } from "@/lib/db"

export type { Shift }

const STANDARD_WORK_HOURS = 8 // 8 hours per day
const LUNCH_BREAK_DEDUCTION = 1 // 1 hour to deduct from work hours
const LUNCH_BREAK_OT = 0.5 // 0.5 hours for OT calculation
const LATE_THRESHOLD_MINUTES = 10 // 10 minutes late threshold
const LATE_ROUND_UP_MINUTES = 30 // Round up to 30 minutes if late
const OT_THRESHOLD_MINUTES = 30 // 30 minutes OT threshold
const OT_ROUNDING_MINUTES = 30 // Round OT up in 30-minute blocks
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
// Note: This function is kept for backward compatibility but may return the first shift found
// For employee-specific shifts, use getShiftForEmployeeByDate instead
export function getShiftForDate(
  date: string,
  shifts: Map<string, Shift>
): { checkIn: string; checkOut: string; isHoliday: boolean; enableOvertime: boolean } {
  // Since there can be multiple shifts per date, get the first one
  // For proper employee-specific shift lookup, use getShiftForEmployeeByDate
  const shiftsForDate = Array.from(shifts.values()).filter((s) => s.date === date)
  const shift = shiftsForDate.length > 0 ? shiftsForDate[0] : null

  if (shift) {
    // Extract HH:MM from HH:MM:SS format
    const checkIn = shift.checkIn.slice(0, 5)
    const checkOut = shift.checkOut.slice(0, 5)
    return {
      checkIn,
      checkOut,
      isHoliday: shift.isHoliday,
      enableOvertime: shift.enableOvertime !== undefined ? shift.enableOvertime : false,
    }
  }
  return { checkIn: "08:00", checkOut: "17:00", isHoliday: false, enableOvertime: false }
}

// Get shift for a specific employee on a specific date (using shift assignments)
// This version uses a pre-built employeeShiftMap to avoid requiring server-side modules
export function getShiftForEmployeeByDate(
  employeeId: number | null,
  date: string,
  shifts: Shift[],
  employeeShiftMap?: Record<string, Shift>
): { checkIn: string; checkOut: string; isHoliday: boolean; enableOvertime: boolean } {
  // First, try to get from employeeShiftMap if provided
  if (employeeId && employeeShiftMap) {
    const key = `${employeeId}-${date}`
    const shift = employeeShiftMap[key]
    if (shift) {
      return {
        checkIn: shift.checkIn.slice(0, 5),
        checkOut: shift.checkOut.slice(0, 5),
        isHoliday: shift.isHoliday,
        enableOvertime: shift.enableOvertime !== undefined ? shift.enableOvertime : false,
      }
    }
  }

  // Fallback: if no assigned shift, use first shift on date or default
  const shiftsForDate = shifts.filter((s) => s.date === date)
  if (shiftsForDate.length > 0) {
    const fallbackShift = shiftsForDate[0]
    return {
      checkIn: fallbackShift.checkIn.slice(0, 5),
      checkOut: fallbackShift.checkOut.slice(0, 5),
      isHoliday: fallbackShift.isHoliday,
      enableOvertime:
        fallbackShift.enableOvertime !== undefined ? fallbackShift.enableOvertime : false,
    }
  }

  return { checkIn: "08:00", checkOut: "17:00", isHoliday: false, enableOvertime: false }
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

  // If late more than 10 minutes but not more than 40 minutes, round up to +30 minutes from shift
  // Example: shift 08:00, arrive 08:35 -> effective 08:30
  if (lateMinutes > LATE_THRESHOLD_MINUTES && lateMinutes <= 40) {
    const roundedCheckIn = shiftMinutes + 30
    return {
      effectiveCheckIn: minutesToTime(roundedCheckIn),
      isLate: false,
      isLateWarning: true, // Show red color and clock-alert icon
    }
  }

  // If late more than 40 minutes, round up to next hour
  // Example: 8:41 → 9:00, 8:53 → 9:00, 8:59 → 9:00
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

// Calculate lunch break hours (12:00-13:00) that overlap with work period
// Returns 1 hour deduction if lunch break overlaps, otherwise 0
export function calculateLunchBreakHours(checkInMinutes: number, checkOutMinutes: number): number {
  const lunchStartMinutes = timeToMinutes("12:00")
  const lunchEndMinutes = timeToMinutes("13:00")

  // Check if lunch break period (12:00-13:00) overlaps with work period
  // Lunch break exists if work period starts before 13:00 and ends after 12:00
  if (checkInMinutes < lunchEndMinutes && checkOutMinutes > lunchStartMinutes) {
    return LUNCH_BREAK_DEDUCTION // 1 hour deduction
  }

  return 0
}

// Check if employee worked 7 or more consecutive days (this date is the 7th day of a consecutive period)
// Count resets for each consecutive period
export function isConsecutiveDay7(date: string, employeeDates: string[]): boolean {
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
  times: string[],
  enableOvertime: boolean = false
): {
  workDays: number
  workHours: number
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

    const shiftCheckInMinutes = timeToMinutes(shiftCheckIn)
    const actualCheckOutMinutes = timeToMinutes(actualCheckOut)
    const shiftCheckOutMinutes = timeToMinutes(shiftCheckOut)

    // Always use shift.checkIn as the starting point (even if arrived earlier)
    const workStartMinutes = shiftCheckInMinutes

    // If overtime is disabled, use shift check-out time if actual check-out is later
    // Always use shift.checkOut as the end point if overtime is disabled (even if left later)
    const workEndMinutes = enableOvertime
      ? actualCheckOutMinutes
      : Math.min(actualCheckOutMinutes, shiftCheckOutMinutes)

    // Calculate total work hours using shift-based work period
    let totalMinutes = workEndMinutes - workStartMinutes

    // Subtract 1 hour lunch break if worked 8+ hours
    const hasLunch = totalMinutes >= STANDARD_WORK_HOURS * 60
    if (hasLunch) {
      totalMinutes -= LUNCH_BREAK_DEDUCTION * 60
    }

    // Check if worked 8+ hours AFTER subtracting lunch break for lunch break OT
    // Only give lunch break OT if work hours (after lunch deduction) >= 8 hours
    let lunchBreakOT = 0
    const workHoursAfterLunch = minutesToHours(totalMinutes)
    if (workHoursAfterLunch >= STANDARD_WORK_HOURS) {
      lunchBreakOT = LUNCH_BREAK_OT
      // Don't add to otHours - it's a separate field
    }

    // All work hours (after subtracting lunch break) count as OT
    const totalHours = minutesToHours(totalMinutes)
    const otHours = totalHours

    return {
      workDays: 0,
      workHours: Math.round(workHoursAfterLunch * 10) / 10,
      otHours: Math.round(otHours * 10) / 10,
      lunchBreakOT: Math.round(lunchBreakOT * 10) / 10,
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

    const shiftCheckInMinutes = timeToMinutes(shiftCheckIn)
    const actualCheckOutMinutes = timeToMinutes(actualCheckOut)
    const shiftCheckOutMinutes = timeToMinutes(shiftCheckOut)

    // Always use shift.checkIn as the starting point (even if arrived earlier)
    const workStartMinutes = shiftCheckInMinutes

    // If overtime is disabled, use shift check-out time if actual check-out is later
    // Always use shift.checkOut as the end point if overtime is disabled (even if left later)
    const workEndMinutes = enableOvertime
      ? actualCheckOutMinutes
      : Math.min(actualCheckOutMinutes, shiftCheckOutMinutes)

    // Calculate total work hours using shift-based work period
    let totalMinutes = workEndMinutes - workStartMinutes

    // Subtract 1 hour lunch break if worked 8+ hours
    const hasLunch = totalMinutes >= STANDARD_WORK_HOURS * 60
    if (hasLunch) {
      totalMinutes -= LUNCH_BREAK_DEDUCTION * 60
    }

    // Check if worked 8+ hours AFTER subtracting lunch break for lunch break OT
    // Only give lunch break OT if work hours (after lunch deduction) >= 8 hours
    let lunchBreakOT = 0
    const workHoursAfterLunch = minutesToHours(totalMinutes)
    if (workHoursAfterLunch >= STANDARD_WORK_HOURS) {
      lunchBreakOT = LUNCH_BREAK_OT
      // Don't add to otHours - it's a separate field
    }

    // All work hours (after subtracting lunch break) count as OT
    const totalHours = minutesToHours(totalMinutes)

    return {
      workDays: 0,
      workHours: Math.round(workHoursAfterLunch * 10) / 10,
      otHours: Math.round(totalHours * 10) / 10,
      lunchBreakOT: Math.round(lunchBreakOT * 10) / 10,
      effectiveCheckIn,
      isLateWarning,
    }
  }

  // Calculate effective check-in (handles late arrival rules)
  // This ensures we use shift.checkIn as the starting point (even if arrived earlier)
  const { effectiveCheckIn, isLateWarning } = calculateEffectiveCheckIn(actualCheckIn, shiftCheckIn)

  const effectiveCheckInMinutes = timeToMinutes(effectiveCheckIn)
  const shiftCheckInMinutes = timeToMinutes(shiftCheckIn)
  const actualCheckOutMinutes = timeToMinutes(actualCheckOut)
  const shiftCheckOutMinutes = timeToMinutes(shiftCheckOut)

  // Use effective check-in which already applies late thresholds/rounding rules
  const workStartMinutes = effectiveCheckInMinutes

  // Determine work end time based on enableOvertime flag
  // If overtime is disabled, always use shift.checkOut as the end point (even if left later)
  // If overtime is enabled, use actual check-out time
  const workEndMinutes = enableOvertime
    ? actualCheckOutMinutes
    : Math.min(actualCheckOutMinutes, shiftCheckOutMinutes)

  // Calculate effective check-out for display
  const effectiveCheckOut = enableOvertime
    ? actualCheckOut
    : minutesToTime(Math.min(actualCheckOutMinutes, shiftCheckOutMinutes))

  // Step 1: Calculate base work minutes (guard against negative)
  const rawWorkMinutes = Math.max(0, workEndMinutes - workStartMinutes)

  // Step 2: Calculate lunch break deduction (1h) overlapping actual work window
  const lunchBreakDeductionHours = calculateLunchBreakHours(workStartMinutes, workEndMinutes)
  const lunchBreakMinutes = lunchBreakDeductionHours * 60

  // Step 3: Remove lunch first, then evaluate thresholds
  const netWorkMinutes = Math.max(0, rawWorkMinutes - lunchBreakMinutes)
  const netWorkHours = minutesToHours(netWorkMinutes)

  // Decision: lunch becomes OT only when net (without lunch) >= 8.0 hours
  let workHours: number
  let workDays: number
  let lunchBreakOT = 0
  let otHours = 0

  // Check if working within shift schedule only (no overtime enabled)
  // When enableOvertime is false, we always cap workEndMinutes at shift.checkOut,
  // so working within shift schedule means: workEndMinutes <= shift.checkOut
  // In this case, if working the full shift (workEndMinutes == shift.checkOut),
  // standard work is 8 hours + 0.5 lunch break OT, with no OT hours
  // If working less than full shift, calculate normally but no OT (since OT requires > 8 hours)
  const isWorkingFullShiftWithinSchedule =
    !enableOvertime && workEndMinutes === shiftCheckOutMinutes

  const lateMinutesForDay = Math.max(0, workStartMinutes - shiftCheckInMinutes)

  if (isWorkingFullShiftWithinSchedule) {
    // Within scheduled shift and ended at shift checkout: treat as standard day
    // Apply lunch OT only when net hours (excluding lunch) reach >= 8
    const hasLunchOverlap = lunchBreakDeductionHours > 0
    if (netWorkHours >= STANDARD_WORK_HOURS) {
      lunchBreakOT = hasLunchOverlap ? LUNCH_BREAK_OT : 0
      otHours = 0
      workHours = STANDARD_WORK_HOURS
    } else {
      lunchBreakOT = 0
      otHours = 0
      // กรณีทำงานเต็มช่วงเวรแต่สาย:
      // - ถ้าสาย > 40 นาที: เติมพักกลับได้สูงสุด 0.5 ชม. (เช่น 9:00–17:00 → 7.5 ชม.)
      // - ถ้าไม่ถึง 40 นาที: เติมพักกลับเต็ม 1 ชม. ได้ไม่เกิน 8 ชม.
      if (lateMinutesForDay > 40) {
        const restoredHours = netWorkHours + LUNCH_BREAK_OT // เติมคืนแค่ 0.5 ชม.
        workHours = Math.min(restoredHours, STANDARD_WORK_HOURS)
      } else {
        workHours = Math.min(netWorkHours + lunchBreakDeductionHours, STANDARD_WORK_HOURS)
      }
    }
    workDays = Math.min(1, workHours / STANDARD_WORK_HOURS)
  } else if (netWorkHours > STANDARD_WORK_HOURS) {
    // Net > 8: lunch becomes OT, excess becomes OT
    const hasLunchOverlap = lunchBreakDeductionHours > 0
    lunchBreakOT = hasLunchOverlap ? LUNCH_BREAK_OT : 0
    otHours = netWorkHours - STANDARD_WORK_HOURS
    workHours = STANDARD_WORK_HOURS
    workDays = 1
  } else {
    // Net <= 8: lunch is regular, no OT
    const totalHoursWithLunch = netWorkHours + lunchBreakDeductionHours
    lunchBreakOT = 0

    workHours = Math.min(totalHoursWithLunch, STANDARD_WORK_HOURS)
    workDays = Math.min(1, workHours / STANDARD_WORK_HOURS)
    otHours = 0
  }

  // Apply OT threshold/rounding only for standard overtime days (non-holiday/non-consecutive)
  // and only when overtime is explicitly enabled
  const shouldApplyOtThreshold = enableOvertime && !isConsecutiveDay7 && !isHoliday
  const normalizedOtHours = shouldApplyOtThreshold
    ? applyOvertimeThresholdAndRounding(otHours)
    : otHours

  // Round to 1 decimal place
  return {
    workDays: Math.round(workDays * 10) / 10,
    workHours: Math.round(workHours * 10) / 10,
    otHours: Math.round(normalizedOtHours * 10) / 10,
    lunchBreakOT: Math.round(lunchBreakOT * 10) / 10,
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
  const checkOut = times.length > 1 ? sortedTimes[sortedTimes.length - 1] : "17:00"

  return { checkIn, checkOut }
}

// Enforce minimum OT threshold and round up in fixed blocks
function applyOvertimeThresholdAndRounding(
  otHours: number,
  thresholdMinutes: number = OT_THRESHOLD_MINUTES,
  roundingMinutes: number = OT_ROUNDING_MINUTES
): number {
  const otMinutes = Math.max(0, otHours * 60)

  if (otMinutes < thresholdMinutes) {
    return 0
  }

  const roundedMinutes = Math.ceil(otMinutes / roundingMinutes) * roundingMinutes
  return roundedMinutes / 60
}
