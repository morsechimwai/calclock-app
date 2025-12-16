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

// Check if shifts table exists with UNIQUE constraint on date
let shiftsNeedsMigration = false
try {
  const tableInfo = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='shifts'`)
    .get() as { sql: string } | undefined

  if (
    tableInfo?.sql?.includes("date TEXT NOT NULL UNIQUE") ||
    tableInfo?.sql?.includes("UNIQUE(date)")
  ) {
    shiftsNeedsMigration = true
  }
} catch {
  // Table doesn't exist yet, will be created below
}

if (shiftsNeedsMigration) {
  // Check if shift_assignments table exists (it has foreign key to shifts)
  const hasAssignments = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='shift_assignments'`)
    .get() as { name: string } | undefined

  // If shift_assignments exists, we need to handle it carefully
  if (hasAssignments) {
    // Temporarily disable foreign key constraints
    db.pragma("foreign_keys = OFF")

    // Recreate table without UNIQUE constraint on date
    db.exec(`
      CREATE TABLE IF NOT EXISTS shifts_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        name TEXT,
        check_in TEXT NOT NULL DEFAULT '08:00:00',
        check_out TEXT NOT NULL DEFAULT '17:00:00',
        is_holiday INTEGER NOT NULL DEFAULT 0,
        enable_overtime INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)

    // Copy data from old table
    db.exec(`
      INSERT INTO shifts_new (id, date, check_in, check_out, is_holiday, enable_overtime, created_at, updated_at)
      SELECT id, date, check_in, check_out, is_holiday,
             COALESCE(enable_overtime, 1) as enable_overtime,
             created_at, updated_at
      FROM shifts;
    `)

    // Drop old table
    db.exec(`DROP TABLE shifts;`)

    // Rename new table
    db.exec(`ALTER TABLE shifts_new RENAME TO shifts;`)

    // Re-enable foreign key constraints
    db.pragma("foreign_keys = ON")
  } else {
    // No foreign key dependencies, safe to recreate
    db.exec(`
      CREATE TABLE IF NOT EXISTS shifts_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        name TEXT,
        check_in TEXT NOT NULL DEFAULT '08:00:00',
        check_out TEXT NOT NULL DEFAULT '17:00:00',
        is_holiday INTEGER NOT NULL DEFAULT 0,
        enable_overtime INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)

    // Copy data from old table
    db.exec(`
      INSERT INTO shifts_new (id, date, check_in, check_out, is_holiday, enable_overtime, created_at, updated_at)
      SELECT id, date, check_in, check_out, is_holiday,
             COALESCE(enable_overtime, 1) as enable_overtime,
             created_at, updated_at
      FROM shifts;
    `)

    // Drop old table
    db.exec(`DROP TABLE shifts;`)

    // Rename new table
    db.exec(`ALTER TABLE shifts_new RENAME TO shifts;`)
  }

  // Recreate indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
  `)
} else {
  // Create table normally (will be skipped if already exists)
  db.exec(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      name TEXT,
      check_in TEXT NOT NULL DEFAULT '08:00:00',
      check_out TEXT NOT NULL DEFAULT '17:00:00',
      is_holiday INTEGER NOT NULL DEFAULT 0,
      enable_overtime INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Add enable_overtime column if it doesn't exist (for existing tables without migration)
  try {
    db.exec(`ALTER TABLE shifts ADD COLUMN enable_overtime INTEGER NOT NULL DEFAULT 1;`)
  } catch {}

  // Add name column if it doesn't exist
  try {
    db.exec(`ALTER TABLE shifts ADD COLUMN name TEXT;`)
  } catch {}
}

// Create shift_assignments table for many-to-many relationship between shifts and employees
db.exec(`
  CREATE TABLE IF NOT EXISTS shift_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(shift_id, employee_id),
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );
`)

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

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift_id ON shift_assignments(shift_id);
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_shift_assignments_employee_id ON shift_assignments(employee_id);
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

export function getFingerprintsCountWithEmployee(onlyWithEmployee: boolean = false): number {
  if (onlyWithEmployee) {
    const result = db
      .prepare(
        `SELECT COUNT(*) as count
         FROM fingerprints f
         INNER JOIN employees e ON f.fingerprint = e.fingerprint
         WHERE e.name IS NOT NULL AND e.name != ''`
      )
      .get() as { count: number }
    return result.count
  }
  return getFingerprintsCount()
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
  limit: number,
  onlyWithEmployee: boolean = false
): {
  data: FingerprintWithEmployee[]
  total: number
  page: number
  totalPages: number
} {
  const offset = (page - 1) * limit

  let query: string
  if (onlyWithEmployee) {
    query = `SELECT
      f.id,
      f.fingerprint,
      f.date,
      f.time,
      f.created_at as createdAt,
      f.is_manual as isManual,
      e.name as employeeName
     FROM fingerprints f
     INNER JOIN employees e ON f.fingerprint = e.fingerprint
     WHERE e.name IS NOT NULL AND e.name != ''
     ORDER BY f.date DESC, f.time DESC
     LIMIT ? OFFSET ?`
  } else {
    query = `SELECT
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
  }

  const rows = db.prepare(query).all(limit, offset) as Array<
    Fingerprint & { isManual: number; employeeName: string | null }
  >

  const total = getFingerprintsCountWithEmployee(onlyWithEmployee)
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
  name: string | null
  checkIn: string
  checkOut: string
  isHoliday: boolean
  enableOvertime: boolean
  createdAt: string
  updatedAt: string
}

export function getShiftById(id: number): Shift | null {
  const row = db
    .prepare(
      `SELECT
        id,
        date,
        name,
        check_in as checkIn,
        check_out as checkOut,
        is_holiday as isHoliday,
        enable_overtime as enableOvertime,
        created_at as createdAt,
        updated_at as updatedAt
       FROM shifts
       WHERE id = ?`
    )
    .get(id) as
    | (Shift & { isHoliday: number; enableOvertime: number; name: string | null })
    | undefined

  if (!row) return null

  return {
    ...row,
    name: row.name || null,
    isHoliday: Boolean(row.isHoliday),
    enableOvertime: row.enableOvertime !== undefined ? Boolean(row.enableOvertime) : false,
  }
}

export function getShiftsByDate(date: string): Shift[] {
  const rows = db
    .prepare(
      `SELECT
        id,
        date,
        name,
        check_in as checkIn,
        check_out as checkOut,
        is_holiday as isHoliday,
        enable_overtime as enableOvertime,
        created_at as createdAt,
        updated_at as updatedAt
       FROM shifts
       WHERE date = ?
       ORDER BY created_at ASC`
    )
    .all(date) as Array<Shift & { isHoliday: number; enableOvertime: number; name: string | null }>

  return rows.map((row) => ({
    ...row,
    name: row.name || null,
    isHoliday: Boolean(row.isHoliday),
    enableOvertime: row.enableOvertime !== undefined ? Boolean(row.enableOvertime) : false,
  }))
}

// Keep for backward compatibility
export function getShift(date: string): Shift | null {
  const shifts = getShiftsByDate(date)
  return shifts.length > 0 ? shifts[0] : null
}

export function getShiftsByDateRange(startDate: string, endDate: string): Shift[] {
  const rows = db
    .prepare(
      `SELECT
        id,
        date,
        name,
        check_in as checkIn,
        check_out as checkOut,
        is_holiday as isHoliday,
        enable_overtime as enableOvertime,
        created_at as createdAt,
        updated_at as updatedAt
       FROM shifts
       WHERE date >= ? AND date <= ?
       ORDER BY date ASC, created_at ASC`
    )
    .all(startDate, endDate) as Array<
    Shift & { isHoliday: number; enableOvertime: number; name: string | null }
  >

  return rows.map((row) => ({
    ...row,
    name: row.name || null,
    isHoliday: Boolean(row.isHoliday),
    enableOvertime: row.enableOvertime !== undefined ? Boolean(row.enableOvertime) : false,
  }))
}

export function getAllShifts(): Shift[] {
  const rows = db
    .prepare(
      `SELECT
        id,
        date,
        name,
        check_in as checkIn,
        check_out as checkOut,
        is_holiday as isHoliday,
        enable_overtime as enableOvertime,
        created_at as createdAt,
        updated_at as updatedAt
       FROM shifts
       ORDER BY date ASC, created_at ASC`
    )
    .all() as Array<Shift & { isHoliday: number; enableOvertime: number; name: string | null }>

  return rows.map((row) => ({
    ...row,
    name: row.name || null,
    isHoliday: Boolean(row.isHoliday),
    enableOvertime: row.enableOvertime !== undefined ? Boolean(row.enableOvertime) : false,
  }))
}

export function createOrUpdateShift(input: {
  id?: number
  date: string
  name?: string | null
  checkIn?: string
  checkOut?: string
  isHoliday?: boolean
  enableOvertime?: boolean
}): Shift {
  if (input.id) {
    // Update existing shift by ID
    const updates: string[] = []
    const params: Record<string, unknown> = { id: input.id }

    if (input.name !== undefined) {
      updates.push("name = @name")
      params.name = input.name || null
    }
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
      const stmt = db.prepare(`UPDATE shifts SET ${updates.join(", ")} WHERE id = @id`)
      stmt.run(params)
    }

    return getShiftById(input.id)!
  } else {
    // Create new shift
    const stmt = db.prepare(
      `INSERT INTO shifts (
        date,
        name,
        check_in,
        check_out,
        is_holiday,
        enable_overtime,
        created_at,
        updated_at
      )
       VALUES (
        @date,
        @name,
        @checkIn,
        @checkOut,
        @isHoliday,
        @enableOvertime,
        datetime('now'),
        datetime('now')
      )`
    )

    const result = stmt.run({
      date: input.date,
      name: input.name || null,
      checkIn: input.checkIn || "08:00:00",
      checkOut: input.checkOut || "17:00:00",
      isHoliday: input.isHoliday ? 1 : 0,
      enableOvertime: input.enableOvertime !== undefined ? (input.enableOvertime ? 1 : 0) : 0,
    })

    return getShiftById(result.lastInsertRowid as number)!
  }
}

export function deleteShiftById(id: number): void {
  db.prepare(`DELETE FROM shifts WHERE id = ?`).run(id)
}

// Keep for backward compatibility
export function deleteShift(date: string): void {
  const shifts = getShiftsByDate(date)
  if (shifts.length > 0) {
    // Delete all shifts for this date (backward compatibility)
    shifts.forEach((shift) => deleteShiftById(shift.id))
  }
}

// Shift Assignment functions
export function getShiftAssignments(shiftId: number): number[] {
  const rows = db
    .prepare(`SELECT employee_id FROM shift_assignments WHERE shift_id = ?`)
    .all(shiftId) as Array<{ employee_id: number }>
  return rows.map((row) => row.employee_id)
}

export function getShiftAssignmentsByDate(date: string): number[] {
  const shifts = getShiftsByDate(date)
  if (shifts.length === 0) return []
  // Return union of all employee IDs from all shifts on this date
  const allEmployeeIds = new Set<number>()
  shifts.forEach((shift) => {
    getShiftAssignments(shift.id).forEach((id) => allEmployeeIds.add(id))
  })
  return Array.from(allEmployeeIds)
}

export function getShiftAssignmentsByShiftId(shiftId: number): number[] {
  return getShiftAssignments(shiftId)
}

export function setShiftAssignments(shiftId: number, employeeIds: number[]): void {
  // Delete existing assignments
  db.prepare(`DELETE FROM shift_assignments WHERE shift_id = ?`).run(shiftId)

  // Insert new assignments
  if (employeeIds.length > 0) {
    const stmt = db.prepare(`INSERT INTO shift_assignments (shift_id, employee_id) VALUES (?, ?)`)
    const insertMany = db.transaction((ids: number[]) => {
      for (const employeeId of ids) {
        stmt.run(shiftId, employeeId)
      }
    })
    insertMany(employeeIds)
  }
}

export function setShiftAssignmentsByShiftId(shiftId: number, employeeIds: number[]): void {
  setShiftAssignments(shiftId, employeeIds)
}

// Keep for backward compatibility - assigns to first shift on date
export function setShiftAssignmentsByDate(date: string, employeeIds: number[]): void {
  const shifts = getShiftsByDate(date)
  if (shifts.length === 0) return
  setShiftAssignments(shifts[0].id, employeeIds)
}

export function getShiftAssignmentsWithEmployees(shiftId: number): Employee[] {
  const rows = db
    .prepare(
      `SELECT
        e.id,
        e.fingerprint,
        e.name,
        e.base_salary as baseSalary,
        e.address,
        e.phone,
        e.has_social_security as hasSocialSecurity,
        e.birthday,
        e.national_id as nationalId,
        e.created_at as createdAt,
        e.updated_at as updatedAt
       FROM shift_assignments sa
       INNER JOIN employees e ON sa.employee_id = e.id
       WHERE sa.shift_id = ?
       ORDER BY e.name ASC`
    )
    .all(shiftId) as Array<Employee & { hasSocialSecurity: number }>

  return rows.map((row) => ({
    ...row,
    hasSocialSecurity: Boolean(row.hasSocialSecurity),
  }))
}

export function getShiftAssignmentsWithEmployeesByShiftId(shiftId: number): Employee[] {
  return getShiftAssignmentsWithEmployees(shiftId)
}

// Get employee IDs that are already assigned to other shifts on the same date (excluding current shift)
export function getAssignedEmployeeIdsByDate(date: string, excludeShiftId?: number): number[] {
  let query = `
    SELECT DISTINCT sa.employee_id
    FROM shift_assignments sa
    INNER JOIN shifts s ON sa.shift_id = s.id
    WHERE s.date = ?
  `
  const params: number[] = []

  if (excludeShiftId) {
    query += ` AND sa.shift_id != ?`
    params.push(excludeShiftId)
  }

  const rows = db.prepare(query).all(date, ...params) as Array<{ employee_id: number }>
  return rows.map((row) => row.employee_id)
}

// Get shift for a specific employee on a specific date
export function getShiftForEmployeeByDate(employeeId: number, date: string): Shift | null {
  const row = db
    .prepare(
      `SELECT
        s.id,
        s.date,
        s.name,
        s.check_in as checkIn,
        s.check_out as checkOut,
        s.is_holiday as isHoliday,
        s.enable_overtime as enableOvertime,
        s.created_at as createdAt,
        s.updated_at as updatedAt
       FROM shifts s
       INNER JOIN shift_assignments sa ON s.id = sa.shift_id
       WHERE sa.employee_id = ? AND s.date = ?
       ORDER BY s.created_at ASC
       LIMIT 1`
    )
    .get(employeeId, date) as
    | (Shift & { isHoliday: number; enableOvertime: number; name: string | null })
    | undefined

  if (!row) return null

  return {
    ...row,
    name: row.name || null,
    isHoliday: Boolean(row.isHoliday),
    enableOvertime: row.enableOvertime !== undefined ? Boolean(row.enableOvertime) : false,
  }
}

export function getShiftAssignmentsWithEmployeesByDate(date: string): Employee[] {
  const shifts = getShiftsByDate(date)
  if (shifts.length === 0) return []
  // Return union of all employees from all shifts on this date
  const allEmployeesMap = new Map<number, Employee>()
  shifts.forEach((shift) => {
    getShiftAssignmentsWithEmployees(shift.id).forEach((emp) => {
      allEmployeesMap.set(emp.id, emp)
    })
  })
  return Array.from(allEmployeesMap.values())
}
