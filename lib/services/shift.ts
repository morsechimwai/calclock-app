/**
 * Shift Service
 *
 * Business logic for shift management.
 */

import {
  getAllShifts as dbGetAllShifts,
  getShiftById as dbGetShiftById,
  getShiftsByDate as dbGetShiftsByDate,
  getShiftsByDateRange as dbGetShiftsByDateRange,
  createOrUpdateShift as dbCreateOrUpdateShift,
  deleteShiftById as dbDeleteShiftById,
  getEmployees as dbGetEmployees,
  setShiftAssignmentsByShiftId as dbSetShiftAssignments,
  getShiftAssignmentsByShiftId as dbGetShiftAssignments,
  getShiftAssignmentsWithEmployeesByShiftId as dbGetShiftAssignmentsWithEmployees,
  getAssignedEmployeeIdsByDate as dbGetAssignedEmployeeIdsByDate,
  type Shift,
  type Employee,
} from "@/lib/db"
import { withErrorHandling, NotFoundError, ValidationError } from "@/lib/errors"

// Types
export type CreateShiftInput = {
  id?: number
  date: string
  name?: string | null
  checkIn?: string
  checkOut?: string
  isHoliday?: boolean
  enableOvertime?: boolean
  employeeIds?: number[]
}

export type { Shift, Employee }

// Service Functions

export const findAll = withErrorHandling(async (): Promise<Shift[]> => {
  return dbGetAllShifts()
})

export const findById = withErrorHandling(async (id: number): Promise<Shift> => {
  const shift = dbGetShiftById(id)
  if (!shift) {
    throw new NotFoundError("กะงาน")
  }
  return shift
})

export const findByDate = withErrorHandling(async (date: string): Promise<Shift[]> => {
  return dbGetShiftsByDate(date)
})

export const findByDateRange = withErrorHandling(
  async (startDate: string, endDate: string): Promise<Shift[]> => {
    return dbGetShiftsByDateRange(startDate, endDate)
  }
)

export const createOrUpdate = withErrorHandling(
  async (input: CreateShiftInput): Promise<Shift> => {
    // Validate employee assignments - check for conflicts
    if (input.employeeIds && input.employeeIds.length > 0) {
      const assignedEmployeeIds = dbGetAssignedEmployeeIdsByDate(input.date, input.id)
      const conflictingEmployees = input.employeeIds.filter((id) =>
        assignedEmployeeIds.includes(id)
      )

      if (conflictingEmployees.length > 0) {
        // Get employee names for error message
        const allEmployees = dbGetEmployees()
        const conflictingNames = conflictingEmployees
          .map((id) => {
            const emp = allEmployees.find((e) => e.id === id)
            return emp?.name || `ID: ${id}`
          })
          .join(", ")

        throw new ValidationError(
          `พนักงานต่อไปนี้ถูกกำหนดให้กะอื่นในวันเดียวกันแล้ว: ${conflictingNames}`
        )
      }
    }

    // Create or update shift
    const shift = dbCreateOrUpdateShift({
      id: input.id,
      date: input.date,
      name: input.name,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      isHoliday: input.isHoliday,
      enableOvertime: input.enableOvertime,
    })

    // Set employee assignments if provided
    if (input.employeeIds !== undefined) {
      dbSetShiftAssignments(shift.id, input.employeeIds)
    }

    return shift
  }
)

export const deleteById = withErrorHandling(async (id: number): Promise<void> => {
  const existing = dbGetShiftById(id)
  if (!existing) {
    throw new NotFoundError("กะงาน")
  }
  dbDeleteShiftById(id)
})

export const getAssignments = withErrorHandling(
  async (shiftId: number): Promise<number[]> => {
    return dbGetShiftAssignments(shiftId)
  }
)

export const getAssignmentsWithEmployees = withErrorHandling(
  async (shiftId: number): Promise<Employee[]> => {
    return dbGetShiftAssignmentsWithEmployees(shiftId)
  }
)

export const getAssignedEmployeeIdsByDate = withErrorHandling(
  async (date: string, excludeShiftId?: number): Promise<number[]> => {
    return dbGetAssignedEmployeeIdsByDate(date, excludeShiftId)
  }
)

