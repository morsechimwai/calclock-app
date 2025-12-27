import { NextRequest, NextResponse } from "next/server"
import {
  createFingerprint,
  deleteFingerprint,
  getFingerprint,
} from "@/lib/db"

/**
 * Sync endpoint for fingerprints
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { operation, data } = body

    if (operation === "insert") {
      const fingerprint = createFingerprint({
        fingerprint: data.fingerprint,
        date: data.date,
        time: data.time,
        isManual: data.isManual,
      })

      return NextResponse.json({
        success: true,
        data: fingerprint,
        skipped: fingerprint === null,
      })
    }

    return NextResponse.json(
      { error: "Invalid operation" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[Sync Fingerprints POST] Error:", error)
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

    // Check if fingerprint exists
    const existing = getFingerprint(id)
    if (!existing) {
      // Already deleted, consider it success
      return NextResponse.json({ success: true })
    }

    deleteFingerprint(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Sync Fingerprints DELETE] Error:", error)
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    )
  }
}

