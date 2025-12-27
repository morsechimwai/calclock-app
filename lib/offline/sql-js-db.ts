"use client"

/**
 * SQL.js Database Manager
 *
 * Provides browser-side SQLite database using sql.js (SQLite compiled to WASM).
 * Data is persisted to IndexedDB for offline availability.
 */

import { OFFLINE_DB_SCHEMA } from "./db-schema"
import type { SqlJsStatic, Database, QueryExecResult, SqlValue } from "sql.js"

// IndexedDB storage name
const IDB_NAME = "calclock-offline"
const IDB_STORE = "database"
const IDB_KEY = "sqlite-db"

let sqlJs: SqlJsStatic | null = null
let db: Database | null = null
let isInitialized = false
let initPromise: Promise<Database> | null = null

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined"
}

/**
 * Load sql.js library dynamically
 */
async function loadSqlJs(): Promise<SqlJsStatic> {
  if (sqlJs) return sqlJs

  if (!isBrowser()) {
    throw new Error("sql.js can only be loaded in browser environment")
  }

  // Dynamic import sql.js - the import happens at runtime, not build time
  const initSqlJs = (await import("sql.js")).default

  sqlJs = await initSqlJs({
    // Load wasm from CDN for better caching
    locateFile: (file: string) =>
      `https://sql.js.org/dist/${file}`,
  })

  return sqlJs
}

/**
 * Save database to IndexedDB
 */
async function saveToIndexedDB(data: Uint8Array): Promise<void> {
  if (!isBrowser()) return

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1)

    request.onerror = () => reject(request.error)

    request.onupgradeneeded = () => {
      const idb = request.result
      if (!idb.objectStoreNames.contains(IDB_STORE)) {
        idb.createObjectStore(IDB_STORE)
      }
    }

    request.onsuccess = () => {
      const idb = request.result
      const transaction = idb.transaction(IDB_STORE, "readwrite")
      const store = transaction.objectStore(IDB_STORE)
      const putRequest = store.put(data, IDB_KEY)

      putRequest.onsuccess = () => resolve()
      putRequest.onerror = () => reject(putRequest.error)

      transaction.oncomplete = () => idb.close()
    }
  })
}

/**
 * Load database from IndexedDB
 */
async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  if (!isBrowser()) return null

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1)

    request.onerror = () => reject(request.error)

    request.onupgradeneeded = () => {
      const idb = request.result
      if (!idb.objectStoreNames.contains(IDB_STORE)) {
        idb.createObjectStore(IDB_STORE)
      }
    }

    request.onsuccess = () => {
      const idb = request.result
      const transaction = idb.transaction(IDB_STORE, "readonly")
      const store = transaction.objectStore(IDB_STORE)
      const getRequest = store.get(IDB_KEY)

      getRequest.onsuccess = () => resolve(getRequest.result || null)
      getRequest.onerror = () => reject(getRequest.error)

      transaction.oncomplete = () => idb.close()
    }
  })
}

/**
 * Initialize the offline database
 */
export async function initOfflineDB(): Promise<Database> {
  if (!isBrowser()) {
    throw new Error("Offline DB can only be initialized in browser")
  }

  // Return existing init promise to prevent duplicate initialization
  if (initPromise) return initPromise

  initPromise = (async () => {
    if (isInitialized && db) return db

    try {
      const SQL = await loadSqlJs()

      // Try to load existing database from IndexedDB
      const savedData = await loadFromIndexedDB()

      if (savedData) {
        db = new SQL.Database(savedData)
        console.log("[OfflineDB] Loaded existing database from IndexedDB")
      } else {
        db = new SQL.Database()
        // Initialize schema
        db.run(OFFLINE_DB_SCHEMA)
        console.log("[OfflineDB] Created new database with schema")
      }

      isInitialized = true
      return db
    } catch (error) {
      console.error("[OfflineDB] Failed to initialize:", error)
      initPromise = null
      throw error
    }
  })()

  return initPromise
}

/**
 * Get the database instance
 */
export async function getOfflineDB(): Promise<Database> {
  if (!isInitialized || !db) {
    return initOfflineDB()
  }
  return db
}

/**
 * Execute SQL and return results
 */
export async function execSQL(sql: string, params?: SqlValue[]): Promise<QueryExecResult[]> {
  const database = await getOfflineDB()

  if (params && params.length > 0) {
    const stmt = database.prepare(sql)
    stmt.bind(params)

    const columns: string[] = stmt.getColumnNames()
    const values: SqlValue[][] = []

    while (stmt.step()) {
      const row = stmt.get()
      values.push(row)
    }

    stmt.free()

    if (values.length > 0) {
      return [{ columns, values }]
    }
    return []
  }

  return database.exec(sql)
}

/**
 * Run SQL (for INSERT, UPDATE, DELETE)
 */
export async function runSQL(sql: string, params?: SqlValue[]): Promise<void> {
  const database = await getOfflineDB()

  if (params && params.length > 0) {
    const stmt = database.prepare(sql)
    stmt.run(params)
    stmt.free()
  } else {
    database.run(sql)
  }

  // Auto-save after writes
  await persistDB()
}

/**
 * Get a single row
 */
export async function getOne<T = Record<string, SqlValue>>(
  sql: string,
  params?: SqlValue[]
): Promise<T | null> {
  const database = await getOfflineDB()
  const stmt = database.prepare(sql)

  if (params) {
    stmt.bind(params)
  }

  let result: T | null = null
  if (stmt.step()) {
    result = stmt.getAsObject() as T
  }

  stmt.free()
  return result
}

/**
 * Get all rows
 */
export async function getAll<T = Record<string, SqlValue>>(
  sql: string,
  params?: SqlValue[]
): Promise<T[]> {
  const database = await getOfflineDB()
  const stmt = database.prepare(sql)

  if (params) {
    stmt.bind(params)
  }

  const results: T[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T)
  }

  stmt.free()
  return results
}

/**
 * Persist database to IndexedDB
 */
export async function persistDB(): Promise<void> {
  if (!db || !isBrowser()) return

  const data = db.export()
  await saveToIndexedDB(data)
  console.log("[OfflineDB] Database persisted to IndexedDB")
}

/**
 * Clear the offline database
 */
export async function clearOfflineDB(): Promise<void> {
  if (db) {
    db.close()
    db = null
  }
  isInitialized = false
  initPromise = null

  if (!isBrowser()) return

  // Clear IndexedDB
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(IDB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Check if offline database has data
 */
export async function hasOfflineData(): Promise<boolean> {
  if (!isBrowser()) return false

  try {
    const data = await loadFromIndexedDB()
    return data !== null && data.length > 0
  } catch {
    return false
  }
}

/**
 * Get database size in bytes
 */
export async function getDBSize(): Promise<number> {
  if (!db) return 0
  const data = db.export()
  return data.length
}

// Re-export types for use in other modules
export type { Database, QueryExecResult, SqlValue }
