"use server"

import { revalidatePath } from "next/cache"
import { shiftService, employeeService } from "@/lib/services"
import { withActionHandler } from "@/lib/errors"
import type { Shift, Employee } from "@/lib/db"

// Action Handlers (internal)
async function getShiftsHandler(startDate?: string, endDate?: string): Promise<Shift[]> {
  if (startDate && endDate) {
    return shiftService.findByDateRange(startDate, endDate)
  }
  return shiftService.findAll()
}

async function createOrUpdateShiftHandler(input: {
  id?: number
  date: string
  name?: string | null
  checkIn?: string
  checkOut?: string
  isHoliday?: boolean
  enableOvertime?: boolean
  employeeIds?: number[]
}): Promise<Shift> {
  const shift = await shiftService.createOrUpdate(input)
  revalidatePath("/shift")
  return shift
}

async function getEmployeesHandler(): Promise<Employee[]> {
  return employeeService.findAll()
}

async function getShiftAssignmentsHandler(shiftId: number): Promise<number[]> {
  return shiftService.getAssignments(shiftId)
}

async function getShiftAssignmentsWithEmployeesHandler(shiftId: number): Promise<Employee[]> {
  return shiftService.getAssignmentsWithEmployees(shiftId)
}

async function deleteShiftHandler(id: number): Promise<void> {
  await shiftService.deleteById(id)
  revalidatePath("/shift")
}

async function getShiftsByDateHandler(date: string): Promise<Shift[]> {
  return shiftService.findByDate(date)
}

async function getShiftByIdHandler(id: number): Promise<Shift> {
  return shiftService.findById(id)
}

async function getAssignedEmployeeIdsByDateHandler(
  date: string,
  excludeShiftId?: number
): Promise<number[]> {
  return shiftService.getAssignedEmployeeIdsByDate(date, excludeShiftId)
}

// Export wrapped actions (Result Pattern)
export const getShiftsAction = withActionHandler(getShiftsHandler)
export const createOrUpdateShiftAction = withActionHandler(createOrUpdateShiftHandler)
export const getEmployeesAction = withActionHandler(getEmployeesHandler)
export const getShiftAssignmentsAction = withActionHandler(getShiftAssignmentsHandler)
export const getShiftAssignmentsWithEmployeesAction = withActionHandler(
  getShiftAssignmentsWithEmployeesHandler
)
export const deleteShiftAction = withActionHandler(deleteShiftHandler)
export const getShiftsByDateAction = withActionHandler(getShiftsByDateHandler)
export const getShiftByIdAction = withActionHandler(getShiftByIdHandler)
export const getAssignedEmployeeIdsByDateAction = withActionHandler(
  getAssignedEmployeeIdsByDateHandler
)

// Re-export types
export type { Shift, Employee }
