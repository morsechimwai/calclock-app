 "use server"

import { revalidatePath } from "next/cache"
import { deleteEmployee, updateEmployee, type Employee } from "@/lib/db"
import { z } from "zod"
import { createEmployee } from "@/lib/db"

const createEmployeeSchema = z.object({
  fingerprint: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  baseSalary: z.coerce.number().int().nonnegative(),
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

export type CreateEmployeeState = {
  success: boolean
  error: string | null
}

export async function createEmployeeAction(formData: FormData): Promise<CreateEmployeeState> {
  const raw = {
    fingerprint: String(formData.get("fingerprint") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    baseSalary: formData.get("baseSalary"),
    address: String(formData.get("address") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    hasSocialSecurity: formData.get("hasSocialSecurity") === "on",
    birthday: String(formData.get("birthday") ?? "").trim() || undefined,
    nationalId: String(formData.get("nationalId") ?? "")
      .trim()
      .replace(/\D/g, "")
      .slice(0, 13) || undefined,
  }

  const parsed = createEmployeeSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: "ข้อมูลไม่ถูกต้อง" }
  }

  try {
    await createEmployee(parsed.data)
    revalidatePath("/employee")
    return { success: true, error: null }
  } catch {
    return { success: false, error: "ไม่สามารถบันทึกข้อมูลพนักงานได้" }
  }
}

const updateEmployeeSchema = z.object({
  id: z.coerce.number().int().positive(),
  fingerprint: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  baseSalary: z.coerce.number().int().nonnegative(),
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

export type UpdateEmployeeState = {
  success: boolean
  error: string | null
}

export async function updateEmployeeAction(formData: FormData): Promise<UpdateEmployeeState> {
  const raw = {
    id: formData.get("id"),
    code: String(formData.get("code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    baseSalary: formData.get("baseSalary"),
    address: String(formData.get("address") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    hasSocialSecurity: formData.get("hasSocialSecurity") === "on",
    birthday: String(formData.get("birthday") ?? "").trim() || undefined,
    nationalId: String(formData.get("nationalId") ?? "")
      .trim()
      .replace(/\D/g, "")
      .slice(0, 13) || undefined,
  }

  const parsed = updateEmployeeSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: "ข้อมูลไม่ถูกต้อง" }
  }

  try {
    updateEmployee(parsed.data.id, parsed.data)
    revalidatePath("/employee")
    return { success: true, error: null }
  } catch {
    return { success: false, error: "ไม่สามารถอัปเดตข้อมูลพนักงานได้" }
  }
}

export async function deleteEmployeeAction(id: number): Promise<void> {
  deleteEmployee(id)
  revalidatePath("/employee")
}

export async function deleteAllEmployeesAction(): Promise<{ success: boolean; error: string | null }> {
  try {
    const { deleteAllEmployees } = await import("@/lib/db")
    deleteAllEmployees()
    revalidatePath("/employee")
    return { success: true, error: null }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "ไม่สามารถลบข้อมูลทั้งหมดได้",
    }
  }
}

export async function getEmployeesPaginatedAction(
  page: number,
  limit: number
): Promise<{
  data: Employee[]
  total: number
  page: number
  totalPages: number
}> {
  const { getEmployeesPaginated } = await import("@/lib/db")
  return getEmployeesPaginated(page, limit)
}

