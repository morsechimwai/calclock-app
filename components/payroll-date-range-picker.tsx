"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"
import { formatThaiDateLong } from "@/lib/utils/format-thai-date"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { th } from "date-fns/locale"

type Props = {
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
}

export function PayrollDateRangePicker({ dateRange, onDateRangeChange }: Props) {
  const formatDateRange = (range: DateRange | undefined): string => {
    if (!range?.from) {
      return "เลือกช่วงวันที่"
    }

    if (!range.to) {
      return `ระหว่างวันที่ ${formatThaiDateLong(range.from)}`
    }

    return `ระหว่างวันที่ ${formatThaiDateLong(range.from)} - ${formatThaiDateLong(range.to)}`
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateRange && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange(dateRange)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          locale={th}
          formatters={{
            formatMonthDropdown: (date) => {
              return date.toLocaleString("th-TH", { month: "short" })
            },
            formatYearDropdown: (year: Date) => {
              return String(year.getFullYear() + 543)
            },
            formatCaption: (date) => {
              const monthNames = [
                "มกราคม",
                "กุมภาพันธ์",
                "มีนาคม",
                "เมษายน",
                "พฤษภาคม",
                "มิถุนายน",
                "กรกฎาคม",
                "สิงหาคม",
                "กันยายน",
                "ตุลาคม",
                "พฤศจิกายน",
                "ธันวาคม",
              ]
              const month = monthNames[date.getMonth()]
              const year = date.getFullYear() + 543
              return `${month} ${year}`
            },
          }}
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={2}
          className="rounded-lg border shadow-sm"
        />
      </PopoverContent>
    </Popover>
  )
}
