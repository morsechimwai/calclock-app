"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ChevronDownIcon } from "lucide-react"
import { formatThaiDateLong } from "@/lib/utils/format-thai-date"
import { th } from "date-fns/locale"

export type FilterType = "all" | "day" | "month" | "year"

export type DateRangeFilterValue = {
  type: FilterType
  date?: Date
  month?: number
  year?: number
}

type Props = {
  value: DateRangeFilterValue
  onChange: (value: DateRangeFilterValue) => void
  disabled?: boolean
}

export function DateRangeFilter({ value, onChange, disabled }: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false)

  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i)

  function handleTypeChange(type: FilterType) {
    const now = new Date()
    switch (type) {
      case "day":
        onChange({ type, date: new Date(now.getFullYear(), now.getMonth(), now.getDate()) })
        break
      case "month":
        onChange({ type, month: now.getMonth() + 1, year: now.getFullYear() })
        break
      case "year":
        onChange({ type, year: now.getFullYear() })
        break
      case "all":
      default:
        onChange({ type })
        break
    }
  }

  function handleDateSelect(date: Date | undefined) {
    if (date) {
      onChange({ ...value, date })
      setCalendarOpen(false)
    }
  }

  function handleMonthChange(month: string) {
    onChange({ ...value, month: parseInt(month) })
  }

  function handleYearChange(year: string) {
    onChange({ ...value, year: parseInt(year) })
  }

  const displayText = () => {
    switch (value.type) {
      case "all":
        return "ทั้งหมด"
      case "day":
        return value.date ? formatThaiDateLong(value.date) : "เลือกวันที่"
      case "month": {
        if (!value.month || !value.year) return "เลือกเดือน"
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
        return `${monthNames[value.month - 1]} ${value.year + 543}`
      }
      case "year": {
        if (!value.year) return "เลือกปี"
        return `พ.ศ. ${value.year + 543}`
      }
      default:
        return "ทั้งหมด"
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Label htmlFor="filter-type" className="text-base font-medium text-zinc-700">
        ดูข้อมูล:
      </Label>
      <Select value={value.type} onValueChange={handleTypeChange} disabled={disabled}>
        <SelectTrigger id="filter-type" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทั้งหมด</SelectItem>
          <SelectItem value="day">รายวัน</SelectItem>
          <SelectItem value="month">รายเดือน</SelectItem>
          <SelectItem value="year">รายปี</SelectItem>
        </SelectContent>
      </Select>

      {value.type === "day" && (
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[200px] justify-start text-left font-normal"
              disabled={disabled}
            >
              {value.date ? formatThaiDateLong(value.date) : "เลือกวันที่"}
              <ChevronDownIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              locale={th}
              mode="single"
              selected={value.date}
              onSelect={handleDateSelect}
              className="rounded-lg border"
              captionLayout="dropdown"
              formatters={{
                formatMonthDropdown: (date) => {
                  return date.toLocaleString("th-TH", { month: "short" })
                },
                formatYearDropdown: (year: Date) => {
                  return String(year.getFullYear() + 543)
                },
              }}
            />
          </PopoverContent>
        </Popover>
      )}

      {value.type === "month" && (
        <>
          <Select
            value={value.month?.toString() || ""}
            onValueChange={handleMonthChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="เลือกเดือน" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">มกราคม</SelectItem>
              <SelectItem value="2">กุมภาพันธ์</SelectItem>
              <SelectItem value="3">มีนาคม</SelectItem>
              <SelectItem value="4">เมษายน</SelectItem>
              <SelectItem value="5">พฤษภาคม</SelectItem>
              <SelectItem value="6">มิถุนายน</SelectItem>
              <SelectItem value="7">กรกฎาคม</SelectItem>
              <SelectItem value="8">สิงหาคม</SelectItem>
              <SelectItem value="9">กันยายน</SelectItem>
              <SelectItem value="10">ตุลาคม</SelectItem>
              <SelectItem value="11">พฤศจิกายน</SelectItem>
              <SelectItem value="12">ธันวาคม</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={value.year?.toString() || ""}
            onValueChange={handleYearChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="เลือกปี" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => {
                const beYear = year + 543
                return (
                  <SelectItem key={year} value={year.toString()}>
                    พ.ศ. {beYear}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </>
      )}

      {value.type === "year" && (
        <Select
          value={value.year?.toString() || ""}
          onValueChange={handleYearChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="เลือกปี" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => {
              const beYear = year + 543
              return (
                <SelectItem key={year} value={year.toString()}>
                  พ.ศ. {beYear}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
