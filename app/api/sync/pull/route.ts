import { NextResponse } from "next/server"
import {
  getEmployees,
  getFingerprints,
  getAllShifts,
} from "@/lib/db"

/**
 * GET /api/sync/pull
 *
 * Pull all data from server for offline storage.
 * Returns employees, fingerprints, and shifts.
 */
export async function GET() {
  try {
    const employees = getEmployees()
    const fingerprints = getFingerprints()
    const shifts = getAllShifts()

    return NextResponse.json({
      employees,
      fingerprints,
      shifts,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Sync Pull] Error:", error)
    return NextResponse.json(
      { error: "Failed to pull data" },
      { status: 500 }
    )
  }
}

