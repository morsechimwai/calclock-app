"use client"

import { useEffect, useState, useRef, useTransition } from "react"
import { format } from "date-fns"
import { Info, ChevronDownIcon } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet"
import {
  createEmployeeAction,
  updateEmployeeAction,
  type CreateEmployeeState,
  type UpdateEmployeeState,
} from "@/app/(app)/employee/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Employee } from "@/lib/db"
import { th } from "date-fns/locale"
import { formatThaiDateLong } from "@/lib/utils/format-thai-date"

type Props = {
  employee?: Employee | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function EmployeeSheetForm({ employee, open: controlledOpen, onOpenChange }: Props) {
  const isEditMode = !!employee
  const [state, setState] = useState<CreateEmployeeState | UpdateEmployeeState>({
    success: false,
    error: null,
  })
  const [isPending, startTransition] = useTransition()
  const [internalOpen, setInternalOpen] = useState(false)
  const [birthdayOpen, setBirthdayOpen] = useState(false)
  const formRef = useRef<HTMLFormElement | null>(null)

  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const [birthday, setBirthday] = useState<Date | undefined>(
    employee?.birthday ? new Date(employee.birthday) : undefined
  )
  const [hasSocialSecurity, setHasSocialSecurity] = useState(employee?.hasSocialSecurity ?? true)
  const [nationalId, setNationalId] = useState(employee?.nationalId ?? "")

  // Prefill form when employee changes
  useEffect(() => {
    if (employee) {
      const timer = setTimeout(() => {
        setBirthday(employee.birthday ? new Date(employee.birthday) : undefined)
        setHasSocialSecurity(employee.hasSocialSecurity)
        setNationalId(employee.nationalId ?? "")
      }, 0)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => {
        setBirthday(undefined)
        setHasSocialSecurity(true)
        setNationalId("")
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [employee])

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
      setTimeout(() => {
        if (!isEditMode) {
          setBirthday(undefined)
          setNationalId("")
        }
        setOpen(false)
      }, 0)
    }
  }, [state.success, isEditMode, setOpen])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!isEditMode && (
        <SheetTrigger asChild>
          <Button>เพิ่มพนักงานใหม่</Button>
        </SheetTrigger>
      )}
      <SheetContent>
        <div className="flex h-full flex-col gap-4 p-4">
          <SheetHeader>
            <SheetTitle>{isEditMode ? "แก้ไขพนักงาน" : "เพิ่มพนักงาน"}</SheetTitle>
          </SheetHeader>

          <form
            ref={formRef}
            onSubmit={(event) => {
              event.preventDefault()
              const formData = new FormData(event.currentTarget)

              // Set birthday as ISO date string
              if (birthday) {
                formData.set("birthday", format(birthday, "yyyy-MM-dd"))
              } else {
                formData.delete("birthday")
              }

              // Set nationalId (only digits, max 13)
              if (nationalId) {
                formData.set("nationalId", nationalId.replace(/\D/g, "").slice(0, 13))
              } else {
                formData.delete("nationalId")
              }

              // Set hasSocialSecurity in formData
              if (hasSocialSecurity) {
                formData.set("hasSocialSecurity", "on")
              } else {
                formData.delete("hasSocialSecurity")
              }

              setState({ success: false, error: null })
              startTransition(async () => {
                const result = isEditMode
                  ? await updateEmployeeAction(formData)
                  : await createEmployeeAction(formData)
                setState(result)
              })
            }}
            className="flex flex-1 flex-col gap-4"
          >
            <div className="grid gap-4">
              {isEditMode && employee && <input type="hidden" name="id" value={employee.id} />}
              <div className="space-y-1.5">
                <Label htmlFor="employee-fingerprint">รหัสนิ้วมือ</Label>
                <Input
                  id="employee-fingerprint"
                  name="fingerprint"
                  placeholder="1"
                  defaultValue={employee?.fingerprint}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="employee-name">ชื่อ-นามสกุล</Label>
                <Input
                  id="employee-name"
                  name="name"
                  placeholder="ปานเทพ มั่งมี"
                  defaultValue={employee?.name}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="employee-base-salary">เงินเดือนพื้นฐาน (บาท/วัน)</Label>
                <Input
                  id="employee-base-salary"
                  type="number"
                  min={0}
                  name="baseSalary"
                  placeholder="350"
                  defaultValue={employee?.baseSalary}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="employee-birthday">วันเกิด</Label>
                <Popover open={birthdayOpen} onOpenChange={setBirthdayOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="date"
                      className="w-full justify-between font-normal"
                    >
                      {birthday ? formatThaiDateLong(birthday) : "เลือกวันเกิด"}
                      <ChevronDownIcon />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                      locale={th}
                      mode="single"
                      selected={birthday}
                      onSelect={(date) => {
                        setBirthday(date)
                        setBirthdayOpen(false)
                      }}
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
                <input type="hidden" name="birthday" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="employee-national-id">บัตรประจำตัวประชาชน</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-zinc-500 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>กรุณากรอกตัวเลข 13 หลัก</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="employee-national-id"
                  name="nationalId"
                  type="text"
                  inputMode="numeric"
                  placeholder="1234567890123"
                  value={nationalId}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 13)
                    setNationalId(value)
                  }}
                  maxLength={13}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="employee-address">ที่อยู่</Label>
                <Textarea
                  id="employee-address"
                  name="address"
                  placeholder="123 ถนนสุขุมวิท แขวงคลองตัน เขตวัฒนา กรุงเทพฯ"
                  defaultValue={employee?.address ?? ""}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="employee-phone">เบอร์โทรศัพท์</Label>
                <Input
                  id="employee-phone"
                  name="phone"
                  type="tel"
                  placeholder="089-123-4567"
                  defaultValue={employee?.phone ?? ""}
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="hasSocialSecurity" className="text-sm font-medium text-zinc-800">
                    ประกันสังคม
                  </Label>
                  <p className="text-xs text-zinc-500">ติ๊กเปิดหากพนักงานอยู่ในระบบประกันสังคม</p>
                </div>
                <Checkbox
                  id="hasSocialSecurity"
                  checked={hasSocialSecurity}
                  onCheckedChange={(checked) => setHasSocialSecurity(checked === true)}
                />
              </div>
            </div>

            {state.error && <p className="text-sm text-red-600">{state.error}</p>}

            <Button type="submit" disabled={isPending} className="mt-auto w-full">
              {isPending ? "กำลังบันทึก..." : isEditMode ? "อัปเดตพนักงาน" : "บันทึกพนักงาน"}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
