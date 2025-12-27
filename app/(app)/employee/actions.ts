"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { employeeService } from "@/lib/services"
import { withActionHandler, ValidationError } from "@/lib/errors"
import type { Employee } from "@/lib/db"

// Validation Schemas
const createEmployeeSchema = z.object({
  fingerprint: z.string().min(1, "กรุณากรอกรหัสลายนิ้วมือ").max(50),
  name: z.string().min(1, "กรุณากรอกชื่อ").max(255),
  baseSalary: z.coerce.number().int().nonnegative("เงินเดือนต้องไม่ติดลบ"),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  hasSocialSecurity: z.boolean().default(true),
  birthday: z.string().optional(),
  nationalId: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{13}$/.test(val), {
      message: "บัตรประจำตัวประชาชนต้องมี 13 หลัก",
    }),
})

const updateEmployeeSchema = createEmployeeSchema.extend({
  id: z.coerce.number().int().positive("ID ไม่ถูกต้อง"),
})

// Helper to parse FormData
function parseFormData(formData: FormData) {
  return {
    id: formData.get("id"),
    fingerprint: String(formData.get("fingerprint") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    baseSalary: formData.get("baseSalary"),
    address: String(formData.get("address") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    hasSocialSecurity: formData.get("hasSocialSecurity") === "on",
    birthday: String(formData.get("birthday") ?? "").trim() || undefined,
    nationalId:
      String(formData.get("nationalId") ?? "")
        .trim()
        .replace(/\D/g, "")
        .slice(0, 13) || undefined,
  }
}

// Action Handlers (internal)
async function createEmployeeHandler(formData: FormData): Promise<Employee> {
  const raw = parseFormData(formData)
  const parsed = createEmployeeSchema.safeParse(raw)

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message)
  }

  const employee = await employeeService.create(parsed.data)
  revalidatePath("/employee")
  return employee
}

async function updateEmployeeHandler(formData: FormData): Promise<Employee> {
  const raw = parseFormData(formData)
  const parsed = updateEmployeeSchema.safeParse(raw)

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message)
  }

  const { id, ...data } = parsed.data
  const employee = await employeeService.update(id, data)
  revalidatePath("/employee")
  return employee
}

async function deleteEmployeeHandler(id: number): Promise<void> {
  await employeeService.deleteById(id)
  revalidatePath("/employee")
}

async function deleteAllEmployeesHandler(): Promise<number> {
  const count = await employeeService.deleteAll()
  revalidatePath("/employee")
  return count
}

async function getEmployeesPaginatedHandler(
  page: number,
  limit: number
): Promise<{
  data: Employee[]
  total: number
  page: number
  totalPages: number
}> {
  return employeeService.findPaginated(page, limit)
}

// Export wrapped actions (Result Pattern)
export const createEmployeeAction = withActionHandler(createEmployeeHandler)
export const updateEmployeeAction = withActionHandler(updateEmployeeHandler)
export const deleteEmployeeAction = withActionHandler(deleteEmployeeHandler)
export const deleteAllEmployeesAction = withActionHandler(deleteAllEmployeesHandler)
export const getEmployeesPaginatedAction = withActionHandler(getEmployeesPaginatedHandler)

// Re-export types for convenience
export type { Employee }
