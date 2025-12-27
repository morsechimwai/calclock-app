"use client"

/**
 * Sync Service
 *
 * Handles synchronization between offline database and server.
 * Provides automatic sync when online and manual sync triggers.
 */

import {
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueRetry,
  importDataFromServer,
  getSyncQueueCount,
} from "./offline-store"
import { persistDB } from "./sql-js-db"

export type SyncState = {
  isOnline: boolean
  isSyncing: boolean
  pendingChanges: number
  lastSyncedAt: string | null
  error: string | null
}

type SyncListener = (state: SyncState) => void

class SyncService {
  private state: SyncState = {
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    pendingChanges: 0,
    lastSyncedAt: null,
    error: null,
  }

  private listeners: Set<SyncListener> = new Set()
  private syncInterval: ReturnType<typeof setInterval> | null = null
  private isInitialized = false

  /**
   * Initialize the sync service
   */
  async init(): Promise<void> {
    if (this.isInitialized || typeof window === "undefined") return

    // Set up online/offline listeners
    window.addEventListener("online", this.handleOnline)
    window.addEventListener("offline", this.handleOffline)

    // Update initial state
    this.state.isOnline = navigator.onLine

    // Get pending changes count
    try {
      this.state.pendingChanges = await getSyncQueueCount()
    } catch (e) {
      console.error("[SyncService] Failed to get pending changes:", e)
    }

    // Load last synced time from localStorage
    try {
      const lastSynced = localStorage.getItem("calclock_last_synced")
      if (lastSynced) {
        this.state.lastSyncedAt = lastSynced
      }
    } catch (e) {
      // localStorage not available
    }

    // Start periodic sync check
    this.startPeriodicSync()

    this.isInitialized = true
    this.notifyListeners()

    // Sync immediately if online
    if (this.state.isOnline) {
      this.sync()
    }

    console.log("[SyncService] Initialized")
  }

  /**
   * Clean up listeners
   */
  destroy(): void {
    if (typeof window === "undefined") return

    window.removeEventListener("online", this.handleOnline)
    window.removeEventListener("offline", this.handleOffline)

    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    this.isInitialized = false
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    this.state.isOnline = true
    this.state.error = null
    this.notifyListeners()
    console.log("[SyncService] Online - triggering sync")
    this.sync()
  }

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    this.state.isOnline = false
    this.notifyListeners()
    console.log("[SyncService] Offline")
  }

  /**
   * Start periodic sync check
   */
  private startPeriodicSync(): void {
    // Check for sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.state.isOnline && !this.state.isSyncing) {
        this.sync()
      }
    }, 30000)
  }

  /**
   * Subscribe to sync state changes
   */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener)
    // Send current state immediately
    listener(this.state)

    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return { ...this.state }
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener({ ...this.state }))
  }

  /**
   * Perform sync with server
   */
  async sync(): Promise<boolean> {
    if (!this.state.isOnline || this.state.isSyncing) {
      return false
    }

    this.state.isSyncing = true
    this.state.error = null
    this.notifyListeners()

    try {
      // Get pending changes from sync queue
      const queue = await getSyncQueue()

      if (queue.length > 0) {
        console.log(`[SyncService] Syncing ${queue.length} pending changes...`)

        // Process each sync item
        for (const item of queue) {
          try {
            await this.processSyncItem(item)
            await removeSyncQueueItem(item.id)
            this.state.pendingChanges = Math.max(0, this.state.pendingChanges - 1)
            this.notifyListeners()
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error"
            console.error(`[SyncService] Failed to sync item:`, item, error)
            await updateSyncQueueRetry(item.id, errorMsg)

            // If too many retries, skip for now
            if (item.retries >= 5) {
              console.warn(`[SyncService] Skipping item after 5 retries:`, item)
              continue
            }
          }
        }
      }

      // Pull fresh data from server
      await this.pullFromServer()

      // Update sync time
      const now = new Date().toISOString()
      this.state.lastSyncedAt = now
      try {
        localStorage.setItem("calclock_last_synced", now)
      } catch (e) {
        // localStorage not available
      }

      // Persist database
      await persistDB()

      // Update pending count
      this.state.pendingChanges = await getSyncQueueCount()

      console.log("[SyncService] Sync completed successfully")
      return true
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Sync failed"
      this.state.error = errorMsg
      console.error("[SyncService] Sync failed:", error)
      return false
    } finally {
      this.state.isSyncing = false
      this.notifyListeners()
    }
  }

  /**
   * Process a single sync queue item
   */
  private async processSyncItem(item: {
    id: number
    tableName: string
    recordId: number
    operation: string
    data: unknown
  }): Promise<void> {
    const endpoint = `/api/sync/${item.tableName}`
    const method =
      item.operation === "delete"
        ? "DELETE"
        : item.operation === "insert"
        ? "POST"
        : "PUT"

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: item.recordId,
        operation: item.operation,
        data: item.data,
      }),
    })

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`)
    }
  }

  /**
   * Pull fresh data from server
   */
  private async pullFromServer(): Promise<void> {
    try {
      const response = await fetch("/api/sync/pull")

      if (!response.ok) {
        // If sync API doesn't exist yet, skip pulling
        if (response.status === 404) {
          console.log("[SyncService] Sync API not available, skipping pull")
          return
        }
        throw new Error(`Pull failed: ${response.status}`)
      }

      const data = await response.json()
      await importDataFromServer(data)
      console.log("[SyncService] Pulled data from server")
    } catch (error) {
      // Don't throw - pulling is optional
      console.warn("[SyncService] Failed to pull from server:", error)
    }
  }

  /**
   * Force a full data refresh from server
   */
  async forceRefresh(): Promise<void> {
    if (!this.state.isOnline) {
      throw new Error("Cannot refresh while offline")
    }

    this.state.isSyncing = true
    this.notifyListeners()

    try {
      await this.pullFromServer()
      const now = new Date().toISOString()
      this.state.lastSyncedAt = now
      try {
        localStorage.setItem("calclock_last_synced", now)
      } catch (e) {
        // localStorage not available
      }
    } finally {
      this.state.isSyncing = false
      this.notifyListeners()
    }
  }

  /**
   * Update pending changes count
   */
  async updatePendingCount(): Promise<void> {
    try {
      this.state.pendingChanges = await getSyncQueueCount()
      this.notifyListeners()
    } catch (e) {
      console.error("[SyncService] Failed to update pending count:", e)
    }
  }
}

// Singleton instance
export const syncService = new SyncService()

