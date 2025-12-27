/**
 * Employee Service
 *
 * Business logic for employee management.
 * All functions are wrapped with error handling.
 */

import {
  getEmployees as dbGetEmployees,
  getEmployee as dbGetEmployee,
  createEmployee as dbCreateEmployee,
  updateEmployee as dbUpdateEmployee,
  deleteEmployee as dbDeleteEmployee,
  getEmployeesPaginated as dbGetEmployeesPaginated,
  deleteAllEmployees as dbDeleteAllEmployees,
  type Employee,
} from "@/lib/db"
import { withErrorHandling, NotFoundError, ConflictError } from "@/lib/errors"

// Types
export type CreateEmployeeInput = {
  fingerprint: string
  name: string
  baseSalary: number
  address?: string
  phone?: string
  hasSocialSecurity?: boolean
  birthday?: string
  nationalId?: string
}

export type UpdateEmployeeInput = CreateEmployeeInput

export type { Employee }

// Service Functions

export const findAll = withErrorHandling(async (): Promise<Employee[]> => {
  return dbGetEmployees()
})

export const findById = withErrorHandling(async (id: number): Promise<Employee> => {
  const employee = dbGetEmployee(id)
  if (!employee) {
    throw new NotFoundError("พนักงาน")
  }
  return employee
})

export const findPaginated = withErrorHandling(
  async (
    page: number,
    limit: number
  ): Promise<{
    data: Employee[]
    total: number
    page: number
    totalPages: number
  }> => {
    return dbGetEmployeesPaginated(page, limit)
  }
)

export const create = withErrorHandling(
  async (input: CreateEmployeeInput): Promise<Employee> => {
    try {
      return dbCreateEmployee(input)
    } catch (error) {
      // Check for unique constraint violation
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
        throw new ConflictError("รหัสลายนิ้วมือนี้มีอยู่ในระบบแล้ว")
      }
      throw error
    }
  }
)

export const update = withErrorHandling(
  async (id: number, input: UpdateEmployeeInput): Promise<Employee> => {
    // Check if exists
    const existing = dbGetEmployee(id)
    if (!existing) {
      throw new NotFoundError("พนักงาน")
    }

    try {
      return dbUpdateEmployee(id, input)
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
        throw new ConflictError("รหัสลายนิ้วมือนี้มีอยู่ในระบบแล้ว")
      }
      throw error
    }
  }
)

export const deleteById = withErrorHandling(async (id: number): Promise<void> => {
  const existing = dbGetEmployee(id)
  if (!existing) {
    throw new NotFoundError("พนักงาน")
  }
  dbDeleteEmployee(id)
})

export const deleteAll = withErrorHandling(async (): Promise<number> => {
  return dbDeleteAllEmployees()
})

