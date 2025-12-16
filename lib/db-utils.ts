/**
 * Database utility functions
 *
 * Helper functions for managing the database file
 */

import { unlinkSync, existsSync } from "fs"
import path from "path"

/**
 * Get the absolute path to the database file
 */
export function getDbPath(): string {
  return path.join(process.cwd(), "calclock.db")
}

/**
 * Delete the database file and all associated files (WAL, SHM)
 *
 * WARNING: This will permanently delete all data!
 */
export function deleteDatabase(): { success: boolean; error?: string } {
  try {
    const dbPath = getDbPath()
    const walPath = `${dbPath}-wal`
    const shmPath = `${dbPath}-shm`

    // Delete all database files
    const filesToDelete = [dbPath, walPath, shmPath]
    let deletedCount = 0

    for (const filePath of filesToDelete) {
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath)
          deletedCount++
          console.log(`[DB] Deleted: ${filePath}`)
        } catch (err) {
          console.error(`[DB] Failed to delete ${filePath}:`, err)
          // Continue deleting other files even if one fails
        }
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Check if database files exist
 */
export function databaseExists(): {
  db: boolean
  wal: boolean
  shm: boolean
  all: boolean
} {
  const dbPath = getDbPath()
  const walPath = `${dbPath}-wal`
  const shmPath = `${dbPath}-shm`

  const db = existsSync(dbPath)
  const wal = existsSync(walPath)
  const shm = existsSync(shmPath)

  return {
    db,
    wal,
    shm,
    all: db || wal || shm,
  }
}







