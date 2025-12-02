"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, ArrowLeftToLine, ArrowRightToLine } from "lucide-react"
import type { Employee } from "@/lib/db"
import { EmployeeSheetForm } from "@/components/employee-sheet-form"
import { EmployeeRowActions } from "@/components/employee-row-actions"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getEmployeesPaginatedAction } from "@/app/(app)/employee/actions"

function calculateAge(birthday?: string | null): string {
  if (!birthday) return "-"
  const dob = new Date(birthday)
  if (Number.isNaN(dob.getTime())) return "-"

  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate())

  if (!hasHadBirthdayThisYear) age -= 1

  return age.toString()
}

type Props = {
  initialData: {
    data: Employee[]
    total: number
    page: number
    totalPages: number
  }
}

const LIMIT = 10

export function EmployeeTable({ initialData }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentPage, setCurrentPage] = useState(initialData.page)
  const [data, setData] = useState(initialData)
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [editSheetOpen, setEditSheetOpen] = useState(false)

  // Sync with initialData when it changes (e.g., after refresh)
  useEffect(() => {
    setData(initialData)
    setCurrentPage(initialData.page)
  }, [initialData])

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > data.totalPages || isLoadingPage || isPending) return

    setIsLoadingPage(true)
    setCurrentPage(newPage)

    startTransition(async () => {
      try {
        const result = await getEmployeesPaginatedAction(newPage, LIMIT)
        setData(result)
      } catch (error) {
        console.error("Failed to fetch page:", error)
        // Revert page on error
        setCurrentPage(data.page)
      } finally {
        setIsLoadingPage(false)
      }
    })
  }

  function handleEditClick(employeeId: number) {
    const employee = data.data.find((e) => e.id === employeeId) ?? null
    if (!employee) return
    setEditingEmployee(employee)
    setEditSheetOpen(true)
  }

  return (
    <>
      {editingEmployee && (
        <EmployeeSheetForm
          key={editingEmployee.id}
          employee={editingEmployee}
          open={editSheetOpen}
          onOpenChange={(open) => {
            setEditSheetOpen(open)
            if (!open) {
              setEditingEmployee(null)
            }
          }}
        />
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">ข้อมูลพนักงาน</h2>
            <p className="text-sm text-zinc-600">
              ทั้งหมด {data.total.toLocaleString("th-TH")} รายการ
            </p>
          </div>
          <div className="flex items-center gap-2">
            <EmployeeSheetForm />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50">
                <TableHead className="font-semibold text-zinc-900">ชื่อ-สกุล</TableHead>
                <TableHead className="font-semibold text-zinc-900">อายุ</TableHead>
                <TableHead className="font-semibold text-zinc-900">ที่อยู่</TableHead>
                <TableHead className="font-semibold text-zinc-900">เบอร์โทรศัพท์</TableHead>
                <TableHead className="font-semibold text-zinc-900">ประกันสังคม</TableHead>
                <TableHead className="font-semibold text-zinc-900">ค่าแรง</TableHead>
                <TableHead className="font-semibold text-zinc-900 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-zinc-500 py-8">
                    ไม่มีข้อมูล
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {data.data.map((emp) => (
                    <TableRow key={emp.id} className="hover:bg-zinc-50">
                      <TableCell>
                        <div className="font-medium text-zinc-900">{emp.name}</div>
                        <div className="text-xs text-zinc-500">
                          รหัสนิ้วมือ #{emp.fingerprint.padStart(3, "0")}
                        </div>
                      </TableCell>
                      <TableCell>{calculateAge(emp.birthday)}</TableCell>
                      <TableCell>
                        {emp.address && emp.address.trim().length > 0 ? emp.address : "-"}
                      </TableCell>
                      <TableCell>
                        {emp.phone && emp.phone.trim().length > 0 ? emp.phone : "-"}
                      </TableCell>
                      <TableCell>
                        {emp.hasSocialSecurity ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            มี
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                            ไม่มี
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.baseSalary.toLocaleString("th-TH", {
                          style: "currency",
                          currency: "THB",
                        })}
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <EmployeeRowActions
                          employeeId={emp.id}
                          employeeName={emp.name}
                          onEditClick={handleEditClick}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Fill empty rows to always show 10 rows */}
                  {Array.from({ length: LIMIT - data.data.length }).map((_, index) => (
                    <TableRow key={`empty-${index}`} className="hover:bg-transparent">
                      <TableCell>&nbsp;</TableCell>
                      <TableCell>&nbsp;</TableCell>
                      <TableCell>&nbsp;</TableCell>
                      <TableCell>&nbsp;</TableCell>
                      <TableCell>&nbsp;</TableCell>
                      <TableCell>&nbsp;</TableCell>
                      <TableCell>&nbsp;</TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </div>

        {data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-600">
              หน้า {currentPage} จาก {data.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || isLoadingPage || isPending}
                className="gap-1"
                onClick={() => handlePageChange(1)}
                title="หน้าแรก"
              >
                <ArrowLeftToLine className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || isLoadingPage || isPending}
                className="gap-1"
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                ก่อนหน้า
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= data.totalPages || isLoadingPage || isPending}
                className="gap-1"
                onClick={() => handlePageChange(currentPage + 1)}
              >
                ถัดไป
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= data.totalPages || isLoadingPage || isPending}
                className="gap-1"
                onClick={() => handlePageChange(data.totalPages)}
                title="หน้าสุดท้าย"
              >
                <ArrowRightToLine className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
