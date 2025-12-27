/**
 * Fingerprint Service
 *
 * Business logic for fingerprint/timestamp management.
 */

import {
  getFingerprints as dbGetFingerprints,
  getFingerprint as dbGetFingerprint,
  createFingerprint as dbCreateFingerprint,
  createFingerprintsBatch as dbCreateFingerprintsBatch,
  deleteFingerprint as dbDeleteFingerprint,
  deleteAllFingerprints as dbDeleteAllFingerprints,
  getFingerprintsPaginatedWithEmployee as dbGetFingerprintsPaginatedWithEmployee,
  getFingerprintsByDateRange as dbGetFingerprintsByDateRange,
  type Fingerprint,
  type FingerprintWithEmployee,
} from "@/lib/db"
import { withErrorHandling, NotFoundError } from "@/lib/errors"

// Types
export type CreateFingerprintInput = {
  fingerprint: string
  date: string
  time: string
  isManual?: boolean
}

export type BatchCreateInput = Array<{
  fingerprint: string
  date: string
  time: string
}>

export type { Fingerprint, FingerprintWithEmployee }

// Service Functions

export const findAll = withErrorHandling(async (): Promise<Fingerprint[]> => {
  return dbGetFingerprints()
})

export const findById = withErrorHandling(async (id: number): Promise<Fingerprint> => {
  const fingerprint = dbGetFingerprint(id)
  if (!fingerprint) {
    throw new NotFoundError("ข้อมูลลายนิ้วมือ")
  }
  return fingerprint
})

export const findByDateRange = withErrorHandling(
  async (startDate: string, endDate: string): Promise<Fingerprint[]> => {
    return dbGetFingerprintsByDateRange(startDate, endDate)
  }
)

export const findPaginatedWithEmployee = withErrorHandling(
  async (
    page: number,
    limit: number,
    onlyWithEmployee: boolean = false
  ): Promise<{
    data: FingerprintWithEmployee[]
    total: number
    page: number
    totalPages: number
  }> => {
    return dbGetFingerprintsPaginatedWithEmployee(page, limit, onlyWithEmployee)
  }
)

export const create = withErrorHandling(
  async (input: CreateFingerprintInput): Promise<Fingerprint | null> => {
    const result = dbCreateFingerprint(input)
    if (!result) {
      // Duplicate - return null (not an error, just skipped)
      return null
    }
    return result
  }
)

export const createBatch = withErrorHandling(
  async (inputs: BatchCreateInput): Promise<{ inserted: number; skipped: number }> => {
    return dbCreateFingerprintsBatch(inputs)
  }
)

export const deleteById = withErrorHandling(async (id: number): Promise<void> => {
  const existing = dbGetFingerprint(id)
  if (!existing) {
    throw new NotFoundError("ข้อมูลลายนิ้วมือ")
  }
  dbDeleteFingerprint(id)
})

export const deleteAll = withErrorHandling(async (): Promise<number> => {
  return dbDeleteAllFingerprints()
})

