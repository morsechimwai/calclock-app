"use client"

/**
 * Offline Hooks
 *
 * React hooks for working with offline functionality.
 */

import { useEffect, useState, useCallback } from "react"
import { syncService, type SyncState } from "@/lib/offline/sync-service"
import { initOfflineStore, getSyncQueueCount } from "@/lib/offline/offline-store"

/**
 * Hook to check online/offline status
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * Hook to access sync service state
 */
export function useSyncState(): SyncState & {
  sync: () => Promise<boolean>
  forceRefresh: () => Promise<void>
} {
  const [state, setState] = useState<SyncState>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    pendingChanges: 0,
    lastSyncedAt: null,
    error: null,
  })

  useEffect(() => {
    // Initialize sync service
    syncService.init()

    // Subscribe to state changes
    const unsubscribe = syncService.subscribe(setState)

    return () => {
      unsubscribe()
    }
  }, [])

  const sync = useCallback(async () => {
    return syncService.sync()
  }, [])

  const forceRefresh = useCallback(async () => {
    return syncService.forceRefresh()
  }, [])

  return {
    ...state,
    sync,
    forceRefresh,
  }
}

/**
 * Hook to initialize offline database
 */
export function useOfflineDB(): {
  isReady: boolean
  isLoading: boolean
  error: Error | null
} {
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        await initOfflineStore()
        if (mounted) {
          setIsReady(true)
          setIsLoading(false)
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e : new Error("Failed to initialize offline DB"))
          setIsLoading(false)
        }
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [])

  return { isReady, isLoading, error }
}

/**
 * Hook to get pending sync count
 */
export function usePendingSyncCount(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    async function getCount() {
      try {
        const pendingCount = await getSyncQueueCount()
        setCount(pendingCount)
      } catch {
        setCount(0)
      }
    }

    getCount()

    // Subscribe to sync state for updates
    const unsubscribe = syncService.subscribe((state) => {
      setCount(state.pendingChanges)
    })

    return unsubscribe
  }, [])

  return count
}

