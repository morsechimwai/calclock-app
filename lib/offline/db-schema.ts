/**
 * Offline Database Schema
 *
 * This file contains the SQL schema for the offline SQLite database.
 * It mirrors the server-side schema to allow full offline functionality.
 */

export const OFFLINE_DB_SCHEMA = `
  -- Employees table
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    base_salary INTEGER NOT NULL DEFAULT 0,
    address TEXT,
    phone TEXT,
    has_social_security INTEGER NOT NULL DEFAULT 1,
    birthday TEXT,
    national_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    -- Sync tracking
    _sync_status TEXT DEFAULT 'synced',
    _server_id INTEGER,
    _last_synced_at TEXT
  );

  -- Fingerprints (timestamp records) table
  CREATE TABLE IF NOT EXISTS fingerprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    is_manual INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    -- Sync tracking
    _sync_status TEXT DEFAULT 'synced',
    _server_id INTEGER,
    _last_synced_at TEXT,
    UNIQUE(fingerprint, date, time)
  );

  -- Shifts table
  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    name TEXT,
    check_in TEXT NOT NULL DEFAULT '08:00:00',
    check_out TEXT NOT NULL DEFAULT '17:00:00',
    is_holiday INTEGER NOT NULL DEFAULT 0,
    enable_overtime INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    -- Sync tracking
    _sync_status TEXT DEFAULT 'synced',
    _server_id INTEGER,
    _last_synced_at TEXT
  );

  -- Shift assignments (many-to-many)
  CREATE TABLE IF NOT EXISTS shift_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    -- Sync tracking
    _sync_status TEXT DEFAULT 'synced',
    _server_id INTEGER,
    _last_synced_at TEXT,
    UNIQUE(shift_id, employee_id),
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  -- Sync queue for pending changes
  CREATE TABLE IF NOT EXISTS _sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    operation TEXT NOT NULL, -- 'insert', 'update', 'delete'
    data TEXT, -- JSON serialized data
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    retries INTEGER DEFAULT 0,
    last_error TEXT
  );

  -- Sync metadata
  CREATE TABLE IF NOT EXISTS _sync_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  -- Create indexes for faster lookups
  CREATE INDEX IF NOT EXISTS idx_employees_fingerprint ON employees(fingerprint);
  CREATE INDEX IF NOT EXISTS idx_fingerprints_fingerprint ON fingerprints(fingerprint);
  CREATE INDEX IF NOT EXISTS idx_fingerprints_date ON fingerprints(date);
  CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
  CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift_id ON shift_assignments(shift_id);
  CREATE INDEX IF NOT EXISTS idx_shift_assignments_employee_id ON shift_assignments(employee_id);
  CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON _sync_queue(table_name);
`;

export const SYNC_STATUS = {
  SYNCED: 'synced',
  PENDING: 'pending',
  CONFLICT: 'conflict',
  ERROR: 'error',
} as const;

export type SyncStatus = typeof SYNC_STATUS[keyof typeof SYNC_STATUS];

