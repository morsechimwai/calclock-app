"use client"

import { useState, useEffect, useRef } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Clock } from "lucide-react"

type TimePickerProps = {
  label: string
  value: string
  onChange: (value: string) => void
  id?: string
  className?: string
}

// Generate hours (00-23)
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))

// Generate minutes (00-59)
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))

export function TimePicker({ label, value, onChange, id, className }: TimePickerProps) {
  const [hour, setHour] = useState(() => {
    const [h] = value.split(":")
    return h || "08"
  })
  const [minute, setMinute] = useState(() => {
    const [, m] = value.split(":")
    return m || "00"
  })

  // Use ref to store latest onChange to avoid re-running effect
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  // Update internal state when value changes from parent
  useEffect(() => {
    const [h, m] = value.split(":")
    if (h && m) {
      setHour(h)
      setMinute(m)
    }
  }, [value])

  // Notify parent when time changes (use ref to prevent infinite loop)
  useEffect(() => {
    const newTime = `${hour}:${minute}`
    if (newTime !== value) {
      onChangeRef.current(newTime)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hour, minute])

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-xs font-medium text-zinc-600 uppercase tracking-wide">
        <Clock className="size-4" /> {label}
      </Label>

      <div className="flex items-center gap-2">
        <Select value={hour} onValueChange={setHour}>
          <SelectTrigger className="h-12 text-lg font-semibold font-mono">
            <SelectValue placeholder="00" />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map((h) => (
              <SelectItem key={h} value={h} className="text-base font-mono">
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-3xl font-bold text-zinc-300 font-mono">:</span>

        <Select value={minute} onValueChange={setMinute}>
          <SelectTrigger className="h-12 text-lg font-semibold font-mono">
            <SelectValue placeholder="00" />
          </SelectTrigger>
          <SelectContent>
            {MINUTES.map((m) => (
              <SelectItem key={m} value={m} className="text-base font-mono">
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
