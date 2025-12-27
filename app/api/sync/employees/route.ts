import { NextRequest, NextResponse } from "next/server"
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployee,
} from "@/lib/db"

/**
 * Sync endpoint for employees
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { operation, data } = body

    if (operation === "insert") {
      const employee = createEmployee({
        fingerprint: data.fingerprint,
        name: data.name,
        baseSalary: data.baseSalary,
        address: data.address,
        phone: data.phone,
        hasSocialSecurity: data.hasSocialSecurity,
        birthday: data.birthday,
        nationalId: data.nationalId,
      })

      return NextResponse.json({ success: true, data: employee })
    }

    return NextResponse.json(
      { error: "Invalid operation" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[Sync Employees POST] Error:", error)
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, data } = body

    // Check if employee exists
    const existing = getEmployee(id)
    if (!existing) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      )
    }

    const employee = updateEmployee(id, {
      fingerprint: data.fingerprint ?? existing.fingerprint,
      name: data.name ?? existing.name,
      baseSalary: data.baseSalary ?? existing.baseSalary,
      address: data.address,
      phone: data.phone,
      hasSocialSecurity: data.hasSocialSecurity,
      birthday: data.birthday,
      nationalId: data.nationalId,
    })

    return NextResponse.json({ success: true, data: employee })
  } catch (error) {
    console.error("[Sync Employees PUT] Error:", error)
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    deleteEmployee(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Sync Employees DELETE] Error:", error)
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    )
  }
}

