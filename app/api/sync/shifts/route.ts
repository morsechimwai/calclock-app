import { NextRequest, NextResponse } from "next/server"
import {
  createOrUpdateShift,
  deleteShiftById,
  getShiftById,
} from "@/lib/db"

/**
 * Sync endpoint for shifts
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { operation, data } = body

    if (operation === "insert") {
      const shift = createOrUpdateShift({
        date: data.date,
        name: data.name,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        isHoliday: data.isHoliday,
        enableOvertime: data.enableOvertime,
      })

      return NextResponse.json({ success: true, data: shift })
    }

    return NextResponse.json(
      { error: "Invalid operation" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[Sync Shifts POST] Error:", error)
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

    // Check if shift exists
    const existing = getShiftById(id)
    if (!existing) {
      return NextResponse.json(
        { error: "Shift not found" },
        { status: 404 }
      )
    }

    const shift = createOrUpdateShift({
      id,
      date: data.date ?? existing.date,
      name: data.name,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      isHoliday: data.isHoliday,
      enableOvertime: data.enableOvertime,
    })

    return NextResponse.json({ success: true, data: shift })
  } catch (error) {
    console.error("[Sync Shifts PUT] Error:", error)
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

    // Check if shift exists
    const existing = getShiftById(id)
    if (!existing) {
      // Already deleted, consider it success
      return NextResponse.json({ success: true })
    }

    deleteShiftById(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Sync Shifts DELETE] Error:", error)
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    )
  }
}

