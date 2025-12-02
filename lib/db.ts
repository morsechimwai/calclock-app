import Database from "better-sqlite3"
import path from "path"
import { existsSync } from "fs"

/**
 * Database initialization
 *
 * Database file location: <project_root>/calclock.db
 * The database file will be created automatically if it doesn't exist.
 * All tables and schema will be created/updated when this module is imported.
 */

// Get absolute path to database file in project root
const dbPath = path.join(process.cwd(), "calclock.db")

// Initialize database connection
// Database file will be created automatically if it doesn't exist
const db = new Database(dbPath)
db.pragma("journal_mode = WAL")

// Log database path for debugging (development only)
if (process.env.NODE_ENV === "development") {
  const dbExists = existsSync(dbPath)
  console.log(`[DB] Database location: ${dbPath}`)
  console.log(`[DB] Database exists: ${dbExists ? "Yes" : "Will be created on first write"}`)
}

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    base_salary INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

// simple migration for legacy schemas: add new columns if they don't exist
try {
  db.exec(`ALTER TABLE employees ADD COLUMN address TEXT;`)
} catch {}
try {
  db.exec(`ALTER TABLE employees ADD COLUMN phone TEXT;`)
} catch {}
try {
  db.exec(`ALTER TABLE employees ADD COLUMN has_social_security INTEGER NOT NULL DEFAULT 1;`)
} catch {}
try {
  db.exec(`ALTER TABLE employees ADD COLUMN birthday TEXT;`)
} catch {}
try {
  db.exec(`ALTER TABLE employees ADD COLUMN national_id TEXT;`)
} catch {}
// Migration: rename code to fingerprint if exists
try {
  db.exec(`ALTER TABLE employees RENAME COLUMN code TO fingerprint;`)
} catch {}

// Create fingerprints table for timestamp data
// Note: No FOREIGN KEY constraint to allow flexibility (fingerprint may not exist in employees yet)
// This allows uploading timestamp data even if employee hasn't been registered yet

// Check if table exists with old schema (with FOREIGN KEY)
let needsMigration = false
try {
  const tableInfo = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='fingerprints'`)
    .get() as { sql: string } | undefined

  if (tableInfo?.sql?.includes("FOREIGN KEY")) {
    needsMigration = true
  }
} catch {
  // Table doesn't exist yet, will be created below
}

if (needsMigration) {
  // Recreate table without FOREIGN KEY
  db.exec(`
    CREATE TABLE IF NOT EXISTS fingerprints_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(fingerprint, date, time)
    );
  `)

  // Copy data from old table
  db.exec(`
    INSERT INTO fingerprints_new (id, fingerprint, date, time, created_at)
    SELECT id, fingerprint, date, time, created_at FROM fingerprints;
  `)

  // Drop old table
  db.exec(`DROP TABLE fingerprints;`)

  // Rename new table
  db.exec(`ALTER TABLE fingerprints_new RENAME TO fingerprints;`)
} else {
  // Create table normally (will be skipped if already exists)
  db.exec(`
    CREATE TABLE IF NOT EXISTS fingerprints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(fingerprint, date, time)
    );
  `)
}

// Add is_manual column if it doesn't exist
try {
  db.exec(`ALTER TABLE fingerprints ADD COLUMN is_manual INTEGER NOT NULL DEFAULT 0;`)
} catch {}

// Create shifts table for work schedule
db.exec(`
  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    check_in TEXT NOT NULL DEFAULT '08:00:00',
    check_out TEXT NOT NULL DEFAULT '17:00:00',
    is_holiday INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

// Add enable_overtime column if it doesn't exist
try {
  db.exec(`ALTER TABLE shifts ADD COLUMN enable_overtime INTEGER NOT NULL DEFAULT 1;`)
} catch {}

// Create index for faster lookups
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_fingerprints_fingerprint ON fingerprints(fingerprint);
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_fingerprints_date ON fingerprints(date);
`)

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
}

export function getEmployees(): Employee[] {
  const rows = db
    .prepare(
      `SELECT
        id,
        fingerprint,
        name,
        base_salary as baseSalary,
        address,
        phone,
        has_social_security as hasSocialSecurity,
        birthday,
        national_id as nationalId,
        created_at as createdAt,
        updated_at as updatedAt
       FROM employees
       ORDER BY created_at DESC`
    )
    .all() as Employee[]

  return rows.map((row) => ({
    ...row,
    hasSocialSecurity: Boolean(row.hasSocialSecurity),
  }))
}

export function createEmployee(input: {
  fingerprint: string
  name: string
  baseSalary: number
  address?: string
  phone?: string
  hasSocialSecurity?: boolean
  birthday?: string
  nationalId?: string
}): Employee {
  const stmt = db.prepare(
    `INSERT INTO employees (
      fingerprint,
      name,
      base_salary,
      address,
      phone,
      has_social_security,
      birthday,
      national_id,
      created_at,
      updated_at
    )
     VALUES (
      @fingerprint,
      @name,
      @baseSalary,
      @address,
      @phone,
      @hasSocialSecurity,
      @birthday,
      @nationalId,
      datetime('now'),
      datetime('now')
    )`
  )

  const info = stmt.run({
    fingerprint: input.fingerprint,
    name: input.name,
    baseSalary: input.baseSalary,
    address: input.address ?? null,
    phone: input.phone ?? null,
    hasSocialSecurity: input.hasSocialSecurity ? 1 : 0,
    birthday: input.birthday ?? null,
    nationalId: input.nationalId ?? null,
  })

  const row = db
    .prepare(
      `SELECT
        id,
        fingerprint,
        name,
        base_salary as baseSalary,
        address,
        phone,
        has_social_security as hasSocialSecurity,
        birthday,
        national_id as nationalId,
        created_at as createdAt,
        updated_at as updatedAt
       FROM employees
       WHERE id = ?`
    )
    .get(info.lastInsertRowid) as Employee

  return {
    ...row,
    hasSocialSecurity: Boolean(row.hasSocialSecurity),
  }
}

export function getEmployee(id: number): Employee | null {
  const row = db
    .prepare(
      `SELECT
        id,
        fingerprint,
        name,
        base_salary as baseSalary,
        address,
        phone,
        has_social_security as hasSocialSecurity,
        birthday,
        national_id as nationalId,
        created_at as createdAt,
        updated_at as updatedAt
       FROM employees
       WHERE id = ?`
    )
    .get(id) as Employee | undefined

  if (!row) return null

  return {
    ...row,
    hasSocialSecurity: Boolean(row.hasSocialSecurity),
  }
}

export function updateEmployee(
  id: number,
  input: {
    fingerprint: string
    name: string
    baseSalary: number
    address?: string
    phone?: string
    hasSocialSecurity?: boolean
    birthday?: string
    nationalId?: string
  }
): Employee {
  const stmt = db.prepare(
    `UPDATE employees SET
      fingerprint = @fingerprint,
      name = @name,
      base_salary = @baseSalary,
      address = @address,
      phone = @phone,
      has_social_security = @hasSocialSecurity,
      birthday = @birthday,
      national_id = @nationalId,
      updated_at = datetime('now')
     WHERE id = @id`
  )

  stmt.run({
    id,
    fingerprint: input.fingerprint,
    name: input.name,
    baseSalary: input.baseSalary,
    address: input.address ?? null,
    phone: input.phone ?? null,
    hasSocialSecurity: input.hasSocialSecurity ? 1 : 0,
    birthday: input.birthday ?? null,
    nationalId: input.nationalId ?? null,
  })

  const row = db
    .prepare(
      `SELECT
        id,
        fingerprint,
        name,
        base_salary as baseSalary,
        address,
        phone,
        has_social_security as hasSocialSecurity,
        birthday,
        national_id as nationalId,
        created_at as createdAt,
        updated_at as updatedAt
       FROM employees
       WHERE id = ?`
    )
    .get(id) as Employee

  return {
    ...row,
    hasSocialSecurity: Boolean(row.hasSocialSecurity),
  }
}

export function deleteEmployee(id: number): void {
  db.prepare(`DELETE FROM employees WHERE id = ?`).run(id)
}

export function getEmployeesCount(): number {
  const result = db.prepare(`SELECT COUNT(*) as count FROM employees`).get() as {
    count: number
  }
  return result.count
}

export function getEmployeesPaginated(
  page: number,
  limit: number
): {
  data: Employee[]
  total: number
  page: number
  totalPages: number
} {
  const offset = (page - 1) * limit

  const rows = db
    .prepare(
      `SELECT
        id,
        fingerprint,
        name,
        base_salary as baseSalary,
        address,
        phone,
        has_social_security as hasSocialSecurity,
        birthday,
        national_id as nationalId,
        created_at as createdAt,
        updated_at as updatedAt
       FROM employees
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as Employee[]

  const total = getEmployeesCount()
  const totalPages = Math.ceil(total / limit)

  return {
    data: rows.map((row) => ({
      ...row,
      hasSocialSecurity: Boolean(row.hasSocialSecurity),
    })),
    total,
    page,
    totalPages,
  }
}

export function deleteAllEmployees(): number {
  const stmt = db.prepare(`DELETE FROM employees`)
  const result = stmt.run()
  return result.changes
}

// Fingerprint types and functions
export type Fingerprint = {
  id: number
  fingerprint: string
  date: string
  time: string
  createdAt: string
  isManual: boolean
}

export function getFingerprints(): Fingerprint[] {
  const rows = db
    .prepare(
      `SELECT
        id,
        fingerprint,
        date,
        time,
        created_at as createdAt,
        is_manual as isManual
       FROM fingerprints
       ORDER BY date DESC, time DESC`
    )
    .all() as Array<Fingerprint & { isManual: number }>

  return rows.map((row) => ({
    ...row,
    isManual: Boolean(row.isManual),
  }))
}

export function getFingerprintsCount(): number {
  const result = db.prepare(`SELECT COUNT(*) as count FROM fingerprints`).get() as {
    count: number
  }
  return result.count
}

export function getFingerprintsPaginated(
  page: number,
  limit: number
): {
  data: Fingerprint[]
  total: number
  page: number
  totalPages: number
} {
  const offset = (page - 1) * limit

  const rows = db
    .prepare(
      `SELECT
        id,
        fingerprint,
        date,
        time,
        created_at as createdAt,
        is_manual as isManual
       FROM fingerprints
       ORDER BY date DESC, time DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as Array<Fingerprint & { isManual: number }>

  const total = getFingerprintsCount()
  const totalPages = Math.ceil(total / limit)

  return {
    data: rows.map((row) => ({
      ...row,
      isManual: Boolean(row.isManual),
    })),
    total,
    page,
    totalPages,
  }
}

export type FingerprintWithEmployee = Fingerprint & {
  employeeName: string | null
}

export function getFingerprintsPaginatedWithEmployee(
  page: number,
  limit: number
): {
  data: FingerprintWithEmployee[]
  total: number
  page: number
  totalPages: number
} {
  const offset = (page - 1) * limit

  const rows = db
    .prepare(
      `SELECT
        f.id,
        f.fingerprint,
        f.date,
        f.time,
        f.created_at as createdAt,
        f.is_manual as isManual,
        e.name as employeeName
       FROM fingerprints f
       LEFT JOIN employees e ON f.fingerprint = e.fingerprint
       ORDER BY f.date DESC, f.time DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as Array<Fingerprint & { isManual: number; employeeName: string | null }>

  const total = getFingerprintsCount()
  const totalPages = Math.ceil(total / limit)

  return {
    data: rows.map((row) => ({
      id: row.id,
      fingerprint: row.fingerprint,
      date: row.date,
      time: row.time,
      createdAt: row.createdAt,
      isManual: Boolean(row.isManual),
      employeeName: row.employeeName,
    })),
    total,
    page,
    totalPages,
  }
}

export function getFingerprintsByFingerprint(fingerprint: string): Fingerprint[] {
  const rows = db
    .prepare(
      `SELECT
        id,
        fingerprint,
        date,
        time,
        created_at as createdAt,
        is_manual as isManual
       FROM fingerprints
       WHERE fingerprint = ?
       ORDER BY date DESC, time DESC`
    )
    .all(fingerprint) as Array<Fingerprint & { isManual: number }>

  return rows.map((row) => ({
    ...row,
    isManual: Boolean(row.isManual),
  }))
}

export function getFingerprintsByDateRange(startDate: string, endDate: string): Fingerprint[] {
  const rows = db
    .prepare(
      `SELECT
        id,
        fingerprint,
        date,
        time,
        created_at as createdAt,
        is_manual as isManual
       FROM fingerprints
       WHERE date >= ? AND date <= ?
       ORDER BY date ASC, time ASC`
    )
    .all(startDate, endDate) as Array<Fingerprint & { isManual: number }>

  return rows.map((row) => ({
    ...row,
    isManual: Boolean(row.isManual),
  }))
}

export function getFingerprint(id: number): Fingerprint | null {
  const row = db
    .prepare(
      `SELECT
        id,
        fingerprint,
        date,
        time,
        created_at as createdAt,
        is_manual as isManual
       FROM fingerprints
       WHERE id = ?`
    )
    .get(id) as (Fingerprint & { isManual: number }) | undefined

  if (!row) return null

  return {
    ...row,
    isManual: Boolean(row.isManual),
  }
}

export function createFingerprint(input: {
  fingerprint: string
  date: string
  time: string
  isManual?: boolean
}): Fingerprint | null {
  // Check if duplicate exists
  const existing = db
    .prepare(
      `SELECT id FROM fingerprints
       WHERE fingerprint = ? AND date = ? AND time = ?`
    )
    .get(input.fingerprint, input.date, input.time) as { id: number } | undefined

  if (existing) {
    return null // Skip duplicate
  }

  const stmt = db.prepare(
    `INSERT INTO fingerprints (
      fingerprint,
      date,
      time,
      is_manual,
      created_at
    )
     VALUES (
      @fingerprint,
      @date,
      @time,
      @isManual,
      datetime('now')
    )`
  )

  const info = stmt.run({
    fingerprint: input.fingerprint,
    date: input.date,
    time: input.time,
    isManual: input.isManual ? 1 : 0,
  })

  const row = db
    .prepare(
      `SELECT
        id,
        fingerprint,
        date,
        time,
        created_at as createdAt,
        is_manual as isManual
       FROM fingerprints
       WHERE id = ?`
    )
    .get(info.lastInsertRowid) as Fingerprint & { isManual: number }

  return {
    ...row,
    isManual: Boolean(row.isManual),
  }
}

export function createFingerprintsBatch(
  inputs: Array<{ fingerprint: string; date: string; time: string }>
): { inserted: number; skipped: number } {
  const insertStmt = db.prepare(
    `INSERT INTO fingerprints (fingerprint, date, time, is_manual, created_at)
     VALUES (@fingerprint, @date, @time, 0, datetime('now'))`
  )

  const checkStmt = db.prepare(
    `SELECT id FROM fingerprints
     WHERE fingerprint = ? AND date = ? AND time = ?`
  )

  let inserted = 0
  let skipped = 0

  for (const input of inputs) {
    const existing = checkStmt.get(input.fingerprint, input.date, input.time) as
      | { id: number }
      | undefined

    if (existing) {
      skipped++
      continue
    }

    insertStmt.run({
      fingerprint: input.fingerprint,
      date: input.date,
      time: input.time,
    })
    inserted++
  }

  return { inserted, skipped }
}

export function updateFingerprint(
  id: number,
  input: {
    fingerprint?: string
    date?: string
    time?: string
  }
): Fingerprint {
  const updates: string[] = []
  const params: Record<string, unknown> = { id }

  if (input.fingerprint !== undefined) {
    updates.push("fingerprint = @fingerprint")
    params.fingerprint = input.fingerprint
  }
  if (input.date !== undefined) {
    updates.push("date = @date")
    params.date = input.date
  }
  if (input.time !== undefined) {
    updates.push("time = @time")
    params.time = input.time
  }

  if (updates.length === 0) {
    const existing = getFingerprint(id)
    if (!existing) throw new Error("Fingerprint not found")
    return existing
  }

  const stmt = db.prepare(`UPDATE fingerprints SET ${updates.join(", ")} WHERE id = @id`)

  stmt.run(params)

  const row = db
    .prepare(
      `SELECT
        id,
        fingerprint,
        date,
        time,
        created_at as createdAt,
        is_manual as isManual
       FROM fingerprints
       WHERE id = ?`
    )
    .get(id) as Fingerprint & { isManual: number }

  return {
    ...row,
    isManual: Boolean(row.isManual),
  }
}

export function deleteFingerprint(id: number): void {
  db.prepare(`DELETE FROM fingerprints WHERE id = ?`).run(id)
}

export function deleteFingerprintsByFingerprint(fingerprint: string): void {
  db.prepare(`DELETE FROM fingerprints WHERE fingerprint = ?`).run(fingerprint)
}

export function deleteAllFingerprints(): number {
  const stmt = db.prepare(`DELETE FROM fingerprints`)
  const result = stmt.run()
  return result.changes
}

// Shift types and functions
export type Shift = {
  id: number
  date: string
  checkIn: string
  checkOut: string
  isHoliday: boolean
  enableOvertime: boolean
  createdAt: string
  updatedAt: string
}

export function getShift(date: string): Shift | null {
  const row = db
    .prepare(
      `SELECT
        id,
        date,
        check_in as checkIn,
        check_out as checkOut,
        is_holiday as isHoliday,
        enable_overtime as enableOvertime,
        created_at as createdAt,
        updated_at as updatedAt
       FROM shifts
       WHERE date = ?`
    )
    .get(date) as (Shift & { isHoliday: number; enableOvertime: number }) | undefined

  if (!row) return null

  return {
    ...row,
    isHoliday: Boolean(row.isHoliday),
    enableOvertime: row.enableOvertime !== undefined ? Boolean(row.enableOvertime) : true,
  }
}

export function getShiftsByDateRange(startDate: string, endDate: string): Shift[] {
  const rows = db
    .prepare(
      `SELECT
        id,
        date,
        check_in as checkIn,
        check_out as checkOut,
        is_holiday as isHoliday,
        enable_overtime as enableOvertime,
        created_at as createdAt,
        updated_at as updatedAt
       FROM shifts
       WHERE date >= ? AND date <= ?
       ORDER BY date ASC`
    )
    .all(startDate, endDate) as Array<Shift & { isHoliday: number; enableOvertime: number }>

  return rows.map((row) => ({
    ...row,
    isHoliday: Boolean(row.isHoliday),
    enableOvertime: row.enableOvertime !== undefined ? Boolean(row.enableOvertime) : true,
  }))
}

export function getAllShifts(): Shift[] {
  const rows = db
    .prepare(
      `SELECT
        id,
        date,
        check_in as checkIn,
        check_out as checkOut,
        is_holiday as isHoliday,
        enable_overtime as enableOvertime,
        created_at as createdAt,
        updated_at as updatedAt
       FROM shifts
       ORDER BY date ASC`
    )
    .all() as Array<Shift & { isHoliday: number; enableOvertime: number }>

  return rows.map((row) => ({
    ...row,
    isHoliday: Boolean(row.isHoliday),
    enableOvertime: row.enableOvertime !== undefined ? Boolean(row.enableOvertime) : true,
  }))
}

export function createOrUpdateShift(input: {
  date: string
  checkIn?: string
  checkOut?: string
  isHoliday?: boolean
  enableOvertime?: boolean
}): Shift {
  const existing = getShift(input.date)

  if (existing) {
    // Update existing shift
    const updates: string[] = []
    const params: Record<string, unknown> = { date: input.date }

    if (input.checkIn !== undefined) {
      updates.push("check_in = @checkIn")
      params.checkIn = input.checkIn
    }
    if (input.checkOut !== undefined) {
      updates.push("check_out = @checkOut")
      params.checkOut = input.checkOut
    }
    if (input.isHoliday !== undefined) {
      updates.push("is_holiday = @isHoliday")
      params.isHoliday = input.isHoliday ? 1 : 0
    }
    if (input.enableOvertime !== undefined) {
      updates.push("enable_overtime = @enableOvertime")
      params.enableOvertime = input.enableOvertime ? 1 : 0
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')")
      const stmt = db.prepare(
        `UPDATE shifts SET ${updates.join(", ")} WHERE date = @date`
      )
      stmt.run(params)
    }

    return getShift(input.date)!
  } else {
    // Create new shift
    const stmt = db.prepare(
      `INSERT INTO shifts (
        date,
        check_in,
        check_out,
        is_holiday,
        enable_overtime,
        created_at,
        updated_at
      )
       VALUES (
        @date,
        @checkIn,
        @checkOut,
        @isHoliday,
        @enableOvertime,
        datetime('now'),
        datetime('now')
      )`
    )

    stmt.run({
      date: input.date,
      checkIn: input.checkIn || "08:00:00",
      checkOut: input.checkOut || "17:00:00",
      isHoliday: input.isHoliday ? 1 : 0,
      enableOvertime: input.enableOvertime !== undefined ? (input.enableOvertime ? 1 : 0) : 1,
    })

    return getShift(input.date)!
  }
}

export function deleteShift(date: string): void {
  db.prepare(`DELETE FROM shifts WHERE date = ?`).run(date)
}
