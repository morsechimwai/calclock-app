"use server"

import {
  getAllShifts,
  getShiftsByDateRange,
  getShiftsByDate,
  createOrUpdateShift,
  deleteShiftById,
  getShiftById,
  type Shift,
  getEmployees,
  type Employee,
  setShiftAssignmentsByShiftId,
  getShiftAssignmentsByShiftId,
  getShiftAssignmentsWithEmployeesByShiftId,
  getAssignedEmployeeIdsByDate,
} from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getShiftsAction(startDate?: string, endDate?: string): Promise<Shift[]> {
  if (startDate && endDate) {
    return getShiftsByDateRange(startDate, endDate)
  }
  return getAllShifts()
}

export async function createOrUpdateShiftAction(input: {
  id?: number
  date: string
  name?: string | null
  checkIn?: string
  checkOut?: string
  isHoliday?: boolean
  enableOvertime?: boolean
  employeeIds?: number[]
}): Promise<{ success: boolean; data?: Shift; error?: string }> {
  try {
    // Validate: Check if any employee is already assigned to another shift on the same date
    if (input.employeeIds && input.employeeIds.length > 0) {
      const assignedEmployeeIds = getAssignedEmployeeIdsByDate(input.date, input.id)
      const conflictingEmployees = input.employeeIds.filter((id) =>
        assignedEmployeeIds.includes(id)
      )

      if (conflictingEmployees.length > 0) {
        // Get employee names for error message
        const conflictingEmployeeNames = conflictingEmployees
          .map((id) => {
            const emp = getEmployees().find((e) => e.id === id)
            return emp?.name || `ID: ${id}`
          })
          .join(", ")

        return {
          success: false,
          error: `พนักงานต่อไปนี้ถูกกำหนดให้กะอื่นในวันเดียวกันแล้ว: ${conflictingEmployeeNames}`,
        }
      }
    }

    const data = createOrUpdateShift(input)

    // Set shift assignments if provided
    if (input.employeeIds !== undefined) {
      setShiftAssignmentsByShiftId(data.id, input.employeeIds)
    }

    revalidatePath("/shift")
    return { success: true, data }
  } catch (error) {
    console.error("Error creating/updating shift:", error)
    return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" }
  }
}

export async function getEmployeesAction(): Promise<Employee[]> {
  return getEmployees()
}

export async function getShiftAssignmentsAction(
  shiftId: number
): Promise<{ success: boolean; employeeIds: number[] }> {
  try {
    const employeeIds = getShiftAssignmentsByShiftId(shiftId)
    return { success: true, employeeIds }
  } catch (error) {
    console.error("Error getting shift assignments:", error)
    return { success: false, employeeIds: [] }
  }
}

export async function getShiftAssignmentsWithEmployeesAction(
  shiftId: number
): Promise<{ success: boolean; employees: Employee[] }> {
  try {
    const employees = getShiftAssignmentsWithEmployeesByShiftId(shiftId)
    return { success: true, employees }
  } catch (error) {
    console.error("Error getting shift assignments with employees:", error)
    return { success: false, employees: [] }
  }
}

export async function deleteShiftAction(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    deleteShiftById(id)
    revalidatePath("/shift")
    return { success: true }
  } catch (error) {
    console.error("Error deleting shift:", error)
    return { success: false, error: "เกิดข้อผิดพลาดในการลบข้อมูล" }
  }
}

export async function getShiftsByDateAction(date: string): Promise<Shift[]> {
  return getShiftsByDate(date)
}

export async function getShiftByIdAction(id: number): Promise<Shift | null> {
  return getShiftById(id)
}

export async function getAssignedEmployeeIdsByDateAction(
  date: string,
  excludeShiftId?: number
): Promise<{ success: boolean; employeeIds: number[] }> {
  try {
    const employeeIds = getAssignedEmployeeIdsByDate(date, excludeShiftId)
    return { success: true, employeeIds }
  } catch (error) {
    console.error("Error getting assigned employee IDs:", error)
    return { success: false, employeeIds: [] }
  }
}
