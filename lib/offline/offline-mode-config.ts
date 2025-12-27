"use client"

/**
 * Offline Mode Configuration
 *
 * Control whether the app runs in offline-only mode (no server required)
 * or online mode (with server sync)
 */

const OFFLINE_MODE_KEY = "calclock_offline_mode"
const OFFLINE_MODE_ENABLED = "offline_only"

/**
 * Check if app should run in offline-only mode
 */
export function isOfflineOnlyMode(): boolean {
  if (typeof window === "undefined") return false

  try {
    const mode = localStorage.getItem(OFFLINE_MODE_KEY)
    return mode === OFFLINE_MODE_ENABLED
  } catch {
    return false
  }
}

/**
 * Enable offline-only mode (no server required)
 */
export function enableOfflineOnlyMode(): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(OFFLINE_MODE_KEY, OFFLINE_MODE_ENABLED)
    console.log("[OfflineMode] Offline-only mode enabled")
  } catch (error) {
    console.error("[OfflineMode] Failed to enable offline mode:", error)
  }
}

/**
 * Disable offline-only mode (use server)
 */
export function disableOfflineOnlyMode(): void {
  if (typeof window === "undefined") return

  try {
    localStorage.removeItem(OFFLINE_MODE_KEY)
    console.log("[OfflineMode] Offline-only mode disabled")
  } catch (error) {
    console.error("[OfflineMode] Failed to disable offline mode:", error)
  }
}

/**
 * Check if server is available
 */
export async function checkServerAvailable(): Promise<boolean> {
  try {
    const response = await fetch("/api/health", {
      method: "GET",
      signal: AbortSignal.timeout(3000), // 3 second timeout
    })
    return response.ok
  } catch {
    return false
  }
}

