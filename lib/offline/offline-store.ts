"use client"

/**
 * Offline Store
 *
 * Provides a unified interface for data access that works both online and offline.
 * Uses sql.js for offline storage and syncs with the server when online.
 */

import { getAll, getOne, runSQL, initOfflineDB, persistDB, type SqlValue } from "./sql-js-db"
import { SYNC_STATUS, type SyncStatus } from "./db-schema"

// Types matching server-side types
export type Employee = {
  id: number
  fingerprint: string
  name: string
  baseSalary: number
  address?: string | null
  phone?: string | null
  hasSocialSecurity: boolean
  birthday?: string | null
  nationalId?: string | null
  createdAt: string
  updatedAt: string
  _syncStatus?: SyncStatus
}

export type Fingerprint = {
  id: number
  fingerprint: string
  date: string
  time: string
  createdAt: string
  isManual: boolean
  _syncStatus?: SyncStatus
}

export type Shift = {
  id: number
  date: string
  name: string | null
  checkIn: string
  checkOut: string
  isHoliday: boolean
  enableOvertime: boolean
  createdAt: string
  updatedAt: string
  _syncStatus?: SyncStatus
}

// Raw row types from SQLite
type RawEmployeeRow = {
  id: number
  fingerprint: string
  name: string
  base_salary: number
  address: string | null
  phone: string | null
  has_social_security: number
  birthday: string | null
  national_id: string | null
  created_at: string
  updated_at: string
  _sync_status: string
}

type RawFingerprintRow = {
  id: number
  fingerprint: string
  date: string
  time: string
  created_at: string
  is_manual: number
  _sync_status: string
}

type RawShiftRow = {
  id: number
  date: string
  name: string | null
  check_in: string
  check_out: string
  is_holiday: number
  enable_overtime: number
  created_at: string
  updated_at: string
  _sync_status: string
}

// Mappers
function mapEmployee(row: RawEmployeeRow): Employee {
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    name: row.name,
    baseSalary: row.base_salary,
    address: row.address,
    phone: row.phone,
    hasSocialSecurity: Boolean(row.has_social_security),
    birthday: row.birthday,
    nationalId: row.national_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    _syncStatus: row._sync_status as SyncStatus,
  }
}

function mapFingerprint(row: RawFingerprintRow): Fingerprint {
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    date: row.date,
    time: row.time,
    createdAt: row.created_at,
    isManual: Boolean(row.is_manual),
    _syncStatus: row._sync_status as SyncStatus,
  }
}

function mapShift(row: RawShiftRow): Shift {
  return {
    id: row.id,
    date: row.date,
    name: row.name,
    checkIn: row.check_in,
    checkOut: row.check_out,
    isHoliday: Boolean(row.is_holiday),
    enableOvertime: Boolean(row.enable_overtime),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    _syncStatus: row._sync_status as SyncStatus,
  }
}

/**
 * Initialize offline store
 */
export async function initOfflineStore(): Promise<void> {
  await initOfflineDB()
}

// ==================== EMPLOYEES ====================

export async function getEmployeesOffline(): Promise<Employee[]> {
  const rows = await getAll<RawEmployeeRow>(
    `SELECT * FROM employees ORDER BY created_at DESC`
  )
  return rows.map(mapEmployee)
}

export async function getEmployeeOffline(id: number): Promise<Employee | null> {
  const row = await getOne<RawEmployeeRow>(
    `SELECT * FROM employees WHERE id = ?`,
    [id]
  )
  return row ? mapEmployee(row) : null
}

export async function getEmployeeByFingerprintOffline(fingerprint: string): Promise<Employee | null> {
  const row = await getOne<RawEmployeeRow>(
    `SELECT * FROM employees WHERE fingerprint = ?`,
    [fingerprint]
  )
  return row ? mapEmployee(row) : null
}

export async function createEmployeeOffline(input: {
  fingerprint: string
  name: string
  baseSalary: number
  address?: string
  phone?: string
  hasSocialSecurity?: boolean
  birthday?: string
  nationalId?: string
}): Promise<Employee> {
  const now = new Date().toISOString()

  await runSQL(
    `INSERT INTO employees (
      fingerprint, name, base_salary, address, phone,
      has_social_security, birthday, national_id,
      created_at, updated_at, _sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.fingerprint,
      input.name,
      input.baseSalary,
      input.address ?? null,
      input.phone ?? null,
      input.hasSocialSecurity ? 1 : 0,
      input.birthday ?? null,
      input.nationalId ?? null,
      now,
      now,
      SYNC_STATUS.PENDING,
    ]
  )

  // Get the created employee
  const row = await getOne<RawEmployeeRow>(
    `SELECT * FROM employees WHERE fingerprint = ?`,
    [input.fingerprint]
  )

  // Add to sync queue
  await addToSyncQueue("employees", row!.id, "insert", input)

  return mapEmployee(row!)
}

export async function updateEmployeeOffline(
  id: number,
  input: {
    fingerprint?: string
    name?: string
    baseSalary?: number
    address?: string
    phone?: string
    hasSocialSecurity?: boolean
    birthday?: string
    nationalId?: string
  }
): Promise<Employee> {
  const updates: string[] = []
  const params: SqlValue[] = []

  if (input.fingerprint !== undefined) {
    updates.push("fingerprint = ?")
    params.push(input.fingerprint)
  }
  if (input.name !== undefined) {
    updates.push("name = ?")
    params.push(input.name)
  }
  if (input.baseSalary !== undefined) {
    updates.push("base_salary = ?")
    params.push(input.baseSalary)
  }
  if (input.address !== undefined) {
    updates.push("address = ?")
    params.push(input.address)
  }
  if (input.phone !== undefined) {
    updates.push("phone = ?")
    params.push(input.phone)
  }
  if (input.hasSocialSecurity !== undefined) {
    updates.push("has_social_security = ?")
    params.push(input.hasSocialSecurity ? 1 : 0)
  }
  if (input.birthday !== undefined) {
    updates.push("birthday = ?")
    params.push(input.birthday)
  }
  if (input.nationalId !== undefined) {
    updates.push("national_id = ?")
    params.push(input.nationalId)
  }

  updates.push("updated_at = ?")
  params.push(new Date().toISOString())

  updates.push("_sync_status = ?")
  params.push(SYNC_STATUS.PENDING)

  params.push(id)

  await runSQL(
    `UPDATE employees SET ${updates.join(", ")} WHERE id = ?`,
    params
  )

  await addToSyncQueue("employees", id, "update", input)

  const row = await getOne<RawEmployeeRow>(
    `SELECT * FROM employees WHERE id = ?`,
    [id]
  )

  return mapEmployee(row!)
}

export async function deleteEmployeeOffline(id: number): Promise<void> {
  await runSQL(`DELETE FROM employees WHERE id = ?`, [id])
  await addToSyncQueue("employees", id, "delete", null)
}

// ==================== FINGERPRINTS ====================

export async function getFingerprintsOffline(): Promise<Fingerprint[]> {
  const rows = await getAll<RawFingerprintRow>(
    `SELECT * FROM fingerprints ORDER BY date DESC, time DESC`
  )
  return rows.map(mapFingerprint)
}

export async function getFingerprintsByDateRangeOffline(
  startDate: string,
  endDate: string
): Promise<Fingerprint[]> {
  const rows = await getAll<RawFingerprintRow>(
    `SELECT * FROM fingerprints WHERE date >= ? AND date <= ? ORDER BY date ASC, time ASC`,
    [startDate, endDate]
  )
  return rows.map(mapFingerprint)
}

export async function createFingerprintOffline(input: {
  fingerprint: string
  date: string
  time: string
  isManual?: boolean
}): Promise<Fingerprint | null> {
  // Check for duplicate
  const existing = await getOne<{ id: number }>(
    `SELECT id FROM fingerprints WHERE fingerprint = ? AND date = ? AND time = ?`,
    [input.fingerprint, input.date, input.time]
  )

  if (existing) return null

  const now = new Date().toISOString()

  await runSQL(
    `INSERT INTO fingerprints (fingerprint, date, time, is_manual, created_at, _sync_status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.fingerprint,
      input.date,
      input.time,
      input.isManual ? 1 : 0,
      now,
      SYNC_STATUS.PENDING,
    ]
  )

  const row = await getOne<RawFingerprintRow>(
    `SELECT * FROM fingerprints WHERE fingerprint = ? AND date = ? AND time = ?`,
    [input.fingerprint, input.date, input.time]
  )

  await addToSyncQueue("fingerprints", row!.id, "insert", input)

  return mapFingerprint(row!)
}

export async function createFingerprintsBatchOffline(
  inputs: Array<{ fingerprint: string; date: string; time: string }>
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0
  let skipped = 0

  for (const input of inputs) {
    const result = await createFingerprintOffline(input)
    if (result) {
      inserted++
    } else {
      skipped++
    }
  }

  return { inserted, skipped }
}

export async function deleteFingerprintOffline(id: number): Promise<void> {
  await runSQL(`DELETE FROM fingerprints WHERE id = ?`, [id])
  await addToSyncQueue("fingerprints", id, "delete", null)
}

// ==================== SHIFTS ====================

export async function getShiftsOffline(): Promise<Shift[]> {
  const rows = await getAll<RawShiftRow>(
    `SELECT * FROM shifts ORDER BY date ASC, created_at ASC`
  )
  return rows.map(mapShift)
}

export async function getShiftsByDateOffline(date: string): Promise<Shift[]> {
  const rows = await getAll<RawShiftRow>(
    `SELECT * FROM shifts WHERE date = ? ORDER BY created_at ASC`,
    [date]
  )
  return rows.map(mapShift)
}

export async function getShiftsByDateRangeOffline(
  startDate: string,
  endDate: string
): Promise<Shift[]> {
  const rows = await getAll<RawShiftRow>(
    `SELECT * FROM shifts WHERE date >= ? AND date <= ? ORDER BY date ASC, created_at ASC`,
    [startDate, endDate]
  )
  return rows.map(mapShift)
}

export async function createOrUpdateShiftOffline(input: {
  id?: number
  date: string
  name?: string | null
  checkIn?: string
  checkOut?: string
  isHoliday?: boolean
  enableOvertime?: boolean
}): Promise<Shift> {
  const now = new Date().toISOString()

  if (input.id) {
    // Update existing
    const updates: string[] = []
    const params: SqlValue[] = []

    if (input.name !== undefined) {
      updates.push("name = ?")
      params.push(input.name)
    }
    if (input.checkIn !== undefined) {
      updates.push("check_in = ?")
      params.push(input.checkIn)
    }
    if (input.checkOut !== undefined) {
      updates.push("check_out = ?")
      params.push(input.checkOut)
    }
    if (input.isHoliday !== undefined) {
      updates.push("is_holiday = ?")
      params.push(input.isHoliday ? 1 : 0)
    }
    if (input.enableOvertime !== undefined) {
      updates.push("enable_overtime = ?")
      params.push(input.enableOvertime ? 1 : 0)
    }

    updates.push("updated_at = ?")
    params.push(now)

    updates.push("_sync_status = ?")
    params.push(SYNC_STATUS.PENDING)

    params.push(input.id)

    await runSQL(
      `UPDATE shifts SET ${updates.join(", ")} WHERE id = ?`,
      params
    )

    await addToSyncQueue("shifts", input.id, "update", input)

    const row = await getOne<RawShiftRow>(
      `SELECT * FROM shifts WHERE id = ?`,
      [input.id]
    )

    return mapShift(row!)
  } else {
    // Create new
    await runSQL(
      `INSERT INTO shifts (date, name, check_in, check_out, is_holiday, enable_overtime, created_at, updated_at, _sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.date,
        input.name ?? null,
        input.checkIn ?? "08:00:00",
        input.checkOut ?? "17:00:00",
        input.isHoliday ? 1 : 0,
        input.enableOvertime !== undefined ? (input.enableOvertime ? 1 : 0) : 0,
        now,
        now,
        SYNC_STATUS.PENDING,
      ]
    )

    const row = await getOne<RawShiftRow>(
      `SELECT * FROM shifts WHERE date = ? ORDER BY id DESC LIMIT 1`,
      [input.date]
    )

    await addToSyncQueue("shifts", row!.id, "insert", input)

    return mapShift(row!)
  }
}

export async function deleteShiftOffline(id: number): Promise<void> {
  await runSQL(`DELETE FROM shifts WHERE id = ?`, [id])
  await addToSyncQueue("shifts", id, "delete", null)
}

// ==================== SYNC QUEUE ====================

async function addToSyncQueue(
  tableName: string,
  recordId: number,
  operation: "insert" | "update" | "delete",
  data: unknown
): Promise<void> {
  await runSQL(
    `INSERT INTO _sync_queue (table_name, record_id, operation, data, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      tableName,
      recordId,
      operation,
      data ? JSON.stringify(data) : null,
      new Date().toISOString(),
    ]
  )
}

export async function getSyncQueueCount(): Promise<number> {
  const row = await getOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM _sync_queue`
  )
  return row?.count ?? 0
}

export async function getSyncQueue(): Promise<
  Array<{
    id: number
    tableName: string
    recordId: number
    operation: string
    data: unknown
    createdAt: string
    retries: number
  }>
> {
  const rows = await getAll<{
    id: number
    table_name: string
    record_id: number
    operation: string
    data: string | null
    created_at: string
    retries: number
  }>(`SELECT * FROM _sync_queue ORDER BY created_at ASC`)

  return rows.map((row) => ({
    id: row.id,
    tableName: row.table_name,
    recordId: row.record_id,
    operation: row.operation,
    data: row.data ? JSON.parse(row.data) : null,
    createdAt: row.created_at,
    retries: row.retries,
  }))
}

export async function removeSyncQueueItem(id: number): Promise<void> {
  await runSQL(`DELETE FROM _sync_queue WHERE id = ?`, [id])
}

export async function updateSyncQueueRetry(
  id: number,
  error: string
): Promise<void> {
  await runSQL(
    `UPDATE _sync_queue SET retries = retries + 1, last_error = ? WHERE id = ?`,
    [error, id]
  )
}

// ==================== DATA IMPORT/EXPORT ====================

export async function importDataFromServer(data: {
  employees: Employee[]
  fingerprints: Fingerprint[]
  shifts: Shift[]
}): Promise<void> {
  // Clear existing data
  await runSQL(`DELETE FROM employees`)
  await runSQL(`DELETE FROM fingerprints`)
  await runSQL(`DELETE FROM shifts`)
  await runSQL(`DELETE FROM _sync_queue`)

  // Import employees
  for (const emp of data.employees) {
    await runSQL(
      `INSERT INTO employees (
        id, fingerprint, name, base_salary, address, phone,
        has_social_security, birthday, national_id,
        created_at, updated_at, _sync_status, _server_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        emp.id,
        emp.fingerprint,
        emp.name,
        emp.baseSalary,
        emp.address ?? null,
        emp.phone ?? null,
        emp.hasSocialSecurity ? 1 : 0,
        emp.birthday ?? null,
        emp.nationalId ?? null,
        emp.createdAt,
        emp.updatedAt,
        SYNC_STATUS.SYNCED,
        emp.id,
      ]
    )
  }

  // Import fingerprints
  for (const fp of data.fingerprints) {
    await runSQL(
      `INSERT INTO fingerprints (
        id, fingerprint, date, time, is_manual, created_at, _sync_status, _server_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fp.id,
        fp.fingerprint,
        fp.date,
        fp.time,
        fp.isManual ? 1 : 0,
        fp.createdAt,
        SYNC_STATUS.SYNCED,
        fp.id,
      ]
    )
  }

  // Import shifts
  for (const shift of data.shifts) {
    await runSQL(
      `INSERT INTO shifts (
        id, date, name, check_in, check_out, is_holiday, enable_overtime,
        created_at, updated_at, _sync_status, _server_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shift.id,
        shift.date,
        shift.name,
        shift.checkIn,
        shift.checkOut,
        shift.isHoliday ? 1 : 0,
        shift.enableOvertime ? 1 : 0,
        shift.createdAt,
        shift.updatedAt,
        SYNC_STATUS.SYNCED,
        shift.id,
      ]
    )
  }

  await persistDB()
  console.log("[OfflineStore] Data imported from server")
}

export async function exportPendingChanges(): Promise<{
  employees: { operation: string; data: Employee }[]
  fingerprints: { operation: string; data: Fingerprint }[]
  shifts: { operation: string; data: Shift }[]
}> {
  const queue = await getSyncQueue()

  const result = {
    employees: [] as { operation: string; data: Employee }[],
    fingerprints: [] as { operation: string; data: Fingerprint }[],
    shifts: [] as { operation: string; data: Shift }[],
  }

  for (const item of queue) {
    if (item.tableName === "employees") {
      const emp = await getEmployeeOffline(item.recordId)
      if (emp) {
        result.employees.push({ operation: item.operation, data: emp })
      }
    } else if (item.tableName === "fingerprints") {
      const row = await getOne<RawFingerprintRow>(
        `SELECT * FROM fingerprints WHERE id = ?`,
        [item.recordId]
      )
      if (row) {
        result.fingerprints.push({
          operation: item.operation,
          data: mapFingerprint(row),
        })
      }
    } else if (item.tableName === "shifts") {
      const row = await getOne<RawShiftRow>(
        `SELECT * FROM shifts WHERE id = ?`,
        [item.recordId]
      )
      if (row) {
        result.shifts.push({ operation: item.operation, data: mapShift(row) })
      }
    }
  }

  return result
}

