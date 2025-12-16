"use server"

import { revalidatePath } from "next/cache"
import { createFingerprintsBatch, deleteAllFingerprints } from "@/lib/db"
import Papa from "papaparse"
import * as XLSX from "xlsx"

type UploadResult = {
  success: boolean
  inserted: number
  skipped: number
  error: string | null
}

function parseDateTime(dateTimeStr: string): { date: string; time: string } | null {
  // Format: 2024/01/28 17:17:05
  const match = dateTimeStr.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/)
  if (!match) return null

  const [, year, month, day, hour, minute, second] = match
  const date = `${year}-${month}-${day}`
  const time = `${hour}:${minute}:${second}`

  return { date, time }
}

function parseCSV(fileContent: string): Array<{
  fingerprint: string
  date: string
  time: string
}> {
  const result: Array<{ fingerprint: string; date: string; time: string }> = []

  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  })

  for (const row of parsed.data as Array<Record<string, string>>) {
    const enNo = row["EnNo"] || row["En No"] || ""
    const dateTime = row["DateTime"] || row["Date Time"] || ""

    if (!enNo || !dateTime) continue

    const parsedDateTime = parseDateTime(dateTime)
    if (!parsedDateTime) continue

    result.push({
      fingerprint: String(enNo).trim(),
      date: parsedDateTime.date,
      time: parsedDateTime.time,
    })
  }

  return result
}

function parseTXT(fileContent: string): Array<{
  fingerprint: string
  date: string
  time: string
}> {
  const result: Array<{ fingerprint: string; date: string; time: string }> = []
  const lines = fileContent.split(/\r?\n/).filter((line) => line.trim().length > 0)

  if (lines.length === 0) return result

  // Find header row
  let headerIndex = -1
  let enNoIndex = -1
  let dateTimeIndex = -1

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i]
    // Try tab-separated first, then whitespace-separated
    const columns = line.includes("\t") ? line.split("\t") : line.split(/\s{2,}/)

    const enNoIdx = columns.findIndex(
      (col) => col.trim().toLowerCase() === "enno" || col.trim().toLowerCase() === "en no"
    )
    const dateTimeIdx = columns.findIndex(
      (col) =>
        col.trim().toLowerCase() === "datetime" ||
        col.trim().toLowerCase() === "date time" ||
        col.trim().toLowerCase() === "date/time"
    )

    if (enNoIdx >= 0 && dateTimeIdx >= 0) {
      headerIndex = i
      enNoIndex = enNoIdx
      dateTimeIndex = dateTimeIdx
      break
    }
  }

  if (headerIndex === -1 || enNoIndex === -1 || dateTimeIndex === -1) {
    return result
  }

  // Parse data rows
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Try tab-separated first, then whitespace-separated
    const columns = line.includes("\t") ? line.split("\t") : line.split(/\s{2,}/)

    if (columns.length <= Math.max(enNoIndex, dateTimeIndex)) continue

    const enNo = columns[enNoIndex]?.trim()
    const dateTime = columns[dateTimeIndex]?.trim()

    if (!enNo || !dateTime) continue

    const parsed = parseDateTime(dateTime)
    if (!parsed) continue

    result.push({
      fingerprint: enNo,
      date: parsed.date,
      time: parsed.time,
    })
  }

  return result
}

function parseExcel(buffer: Buffer): Array<{
  fingerprint: string
  date: string
  time: string
}> {
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(worksheet) as Array<Record<string, unknown>>

  const result: Array<{ fingerprint: string; date: string; time: string }> = []

  for (const row of data) {
    const enNo = row["EnNo"] || row["En No"] || String(row["EnNo"] || "")
    const dateTime = row["DateTime"] || row["Date Time"] || String(row["DateTime"] || "")

    if (!enNo || !dateTime) continue

    // Excel might return date as number or string
    let dateTimeStr = ""
    if (typeof dateTime === "number") {
      // Excel date serial number
      const excelDate = XLSX.SSF.parse_date_code(dateTime)
      if (excelDate) {
        dateTimeStr = `${excelDate.y}/${String(excelDate.m).padStart(2, "0")}/${String(
          excelDate.d
        ).padStart(2, "0")} ${String(excelDate.H).padStart(2, "0")}:${String(excelDate.M).padStart(
          2,
          "0"
        )}:${String(excelDate.S).padStart(2, "0")}`
      }
    } else {
      dateTimeStr = String(dateTime)
    }

    const parsed = parseDateTime(dateTimeStr)
    if (!parsed) continue

    result.push({
      fingerprint: String(enNo).trim(),
      date: parsed.date,
      time: parsed.time,
    })
  }

  return result
}

export async function uploadTimestampFile(formData: FormData): Promise<UploadResult> {
  try {
    const file = formData.get("file") as File | null

    if (!file) {
      return {
        success: false,
        inserted: 0,
        skipped: 0,
        error: "ไม่พบไฟล์",
      }
    }

    // Check file size (10 MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        inserted: 0,
        skipped: 0,
        error: "ไฟล์มีขนาดเกิน 10 MB",
      }
    }

    // Check file type
    const fileName = file.name.toLowerCase()
    const isTXT = fileName.endsWith(".txt")
    const isCSV = fileName.endsWith(".csv")
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls")

    if (!isTXT && !isCSV && !isExcel) {
      return {
        success: false,
        inserted: 0,
        skipped: 0,
        error: "รองรับเฉพาะไฟล์ .txt, .csv หรือ .xlsx เท่านั้น",
      }
    }

    // Parse file
    let records: Array<{ fingerprint: string; date: string; time: string }> = []

    if (isTXT) {
      const text = await file.text()
      records = parseTXT(text)
    } else if (isCSV) {
      const text = await file.text()
      records = parseCSV(text)
    } else {
      const buffer = Buffer.from(await file.arrayBuffer())
      records = parseExcel(buffer)
    }

    if (records.length === 0) {
      return {
        success: false,
        inserted: 0,
        skipped: 0,
        error: "ไม่พบข้อมูลในไฟล์ หรือรูปแบบไฟล์ไม่ถูกต้อง",
      }
    }

    // Insert records (duplicates will be skipped)
    const result = createFingerprintsBatch(records)

    revalidatePath("/insert")
    revalidatePath("/payroll")

    return {
      success: true,
      inserted: result.inserted,
      skipped: result.skipped,
      error: null,
    }
  } catch (error) {
    console.error("Upload error:", error)
    return {
      success: false,
      inserted: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปโหลดไฟล์",
    }
  }
}

export async function deleteAllFingerprintsAction(): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    deleteAllFingerprints()
    revalidatePath("/insert")
    return { success: true, error: null }
  } catch (error) {
    console.error("Delete all error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบข้อมูล",
    }
  }
}

export async function getFingerprintsPaginatedAction(
  page: number,
  limit: number,
  onlyWithEmployee: boolean = false
): Promise<{
  data: Array<{
    id: number
    fingerprint: string
    date: string
    time: string
    createdAt: string
    employeeName: string | null
  }>
  total: number
  page: number
  totalPages: number
}> {
  const { getFingerprintsPaginatedWithEmployee } = await import("@/lib/db")
  return getFingerprintsPaginatedWithEmployee(page, limit, onlyWithEmployee)
}
