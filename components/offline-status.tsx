"use client"

/**
 * Offline Status Indicator
 *
 * Shows the current online/offline status and sync state.
 * Displays in the app shell header area.
 */

import { useSyncState } from "@/hooks/use-offline"
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function OfflineStatus() {
  const { isOnline, isSyncing, pendingChanges, lastSyncedAt, error, sync } =
    useSyncState()

  // Format last synced time
  const formatLastSynced = (dateStr: string | null): string => {
    if (!dateStr) return "ยังไม่เคยซิงค์"

    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return "เมื่อสักครู่"
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`

    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Pending changes badge */}
        {pendingChanges > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
                <Cloud className="h-3 w-3" />
                <span>{pendingChanges}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                มี {pendingChanges} รายการรอซิงค์
                {!isOnline && " (จะซิงค์เมื่อออนไลน์)"}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Error indicator */}
        {error && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                <AlertCircle className="h-3 w-3" />
                <span>ผิดพลาด</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{error}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Sync button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => sync()}
              disabled={!isOnline || isSyncing}
              className="h-8 px-2"
            >
              <RefreshCw
                className={cn("h-4 w-4", isSyncing && "animate-spin")}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isSyncing ? (
              <p>กำลังซิงค์...</p>
            ) : isOnline ? (
              <div>
                <p>ซิงค์ข้อมูล</p>
                <p className="text-xs text-muted-foreground">
                  ซิงค์ล่าสุด: {formatLastSynced(lastSyncedAt)}
                </p>
              </div>
            ) : (
              <p>ไม่สามารถซิงค์ได้ขณะออฟไลน์</p>
            )}
          </TooltipContent>
        </Tooltip>

        {/* Online/Offline status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors",
                isOnline
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-zinc-200 text-zinc-600"
              )}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">ออนไลน์</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">ออฟไลน์</span>
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isOnline ? (
              <div>
                <p className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-emerald-500" />
                  เชื่อมต่ออินเทอร์เน็ตแล้ว
                </p>
                {pendingChanges === 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Cloud className="h-3 w-3" />
                    ข้อมูลซิงค์แล้ว
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="flex items-center gap-1">
                  <CloudOff className="h-3 w-3 text-zinc-500" />
                  กำลังทำงานแบบออฟไลน์
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ข้อมูลจะถูกบันทึกในเครื่องและซิงค์เมื่อออนไลน์
                </p>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

/**
 * Offline Banner
 *
 * A more prominent banner shown when offline.
 */
export function OfflineBanner() {
  const { isOnline, pendingChanges } = useSyncState()

  if (isOnline) return null

  return (
    <div className="bg-zinc-800 text-white px-4 py-2 text-center text-sm">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>คุณกำลังทำงานแบบออฟไลน์</span>
        {pendingChanges > 0 && (
          <span className="text-amber-400">
            • มี {pendingChanges} รายการรอซิงค์
          </span>
        )}
      </div>
    </div>
  )
}

