"use server"

import {
  getAllShifts,
  getShiftsByDateRange,
  createOrUpdateShift,
  deleteShift,
  type Shift,
} from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getShiftsAction(
  startDate?: string,
  endDate?: string
): Promise<Shift[]> {
  if (startDate && endDate) {
    return getShiftsByDateRange(startDate, endDate)
  }
  return getAllShifts()
}

export async function createOrUpdateShiftAction(input: {
  date: string
  checkIn?: string
  checkOut?: string
  isHoliday?: boolean
  enableOvertime?: boolean
}): Promise<{ success: boolean; data?: Shift; error?: string }> {
  try {
    const data = createOrUpdateShift(input)
    revalidatePath("/shift")
    return { success: true, data }
  } catch (error) {
    console.error("Error creating/updating shift:", error)
    return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" }
  }
}

export async function deleteShiftAction(
  date: string
): Promise<{ success: boolean; error?: string }> {
  try {
    deleteShift(date)
    revalidatePath("/shift")
    return { success: true }
  } catch (error) {
    console.error("Error deleting shift:", error)
    return { success: false, error: "เกิดข้อผิดพลาดในการลบข้อมูล" }
  }
}

