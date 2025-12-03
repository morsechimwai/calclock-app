"use client"

import { useState, useRef, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Upload,
  CheckCircle2,
  XCircle,
  ArrowLeftToLine,
  ArrowRightToLine,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState, EmptyStateIcons } from "@/components/empty-state"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  deleteAllFingerprintsAction,
  uploadTimestampFile,
  getFingerprintsPaginatedAction,
} from "@/app/(app)/insert/actions"

type FingerprintWithEmployee = {
  id: number
  fingerprint: string
  date: string
  time: string
  createdAt: string
  employeeName: string | null
}

type Props = {
  initialData: {
    data: FingerprintWithEmployee[]
    total: number
    page: number
    totalPages: number
  }
}

const LIMIT = 10

export function FingerprintTable({ initialData }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentPage, setCurrentPage] = useState(initialData.page)
  const [data, setData] = useState(initialData)
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    inserted: number
    skipped: number
    error: string | null
  } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)

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
        const result = await getFingerprintsPaginatedAction(newPage, LIMIT)
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

  function handleDeleteAll() {
    startTransition(async () => {
      const result = await deleteAllFingerprintsAction()
      if (result.success) {
        router.refresh()
      }
    })
  }

  async function handleFileSelect(file: File) {
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    setUploadResult(null)
    setUploadProgress(0)
    setShowDialog(false)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    setIsUploading(true)
    try {
      const res = await uploadTimestampFile(formData)
      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploadResult(res)
      setShowDialog(true)
      if (res.success) {
        router.refresh()
      }
    } catch (error) {
      clearInterval(progressInterval)
      setUploadProgress(0)
      setUploadResult({
        success: false,
        inserted: 0,
        skipped: 0,
        error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
      })
      setShowDialog(true)
    } finally {
      setIsUploading(false)
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    // Reset input
    if (e.target) {
      e.target.value = ""
    }
  }

  function formatDate(date: string): string {
    // Convert YYYY-MM-DD to DD/MM/YYYY
    const [year, month, day] = date.split("-")
    return `${day}/${month}/${year}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">ข้อมูล Fingerprint</h2>
          <p className="text-sm text-zinc-600">
            {data.total > 0
              ? `ทั้งหมด ${data.total.toLocaleString("th-TH")} รายการ`
              : "ยังไม่มีข้อมูลบันทึกเวลา"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={isUploading}
              onClick={() => uploadInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {isUploading ? `กำลังอัปโหลด ${uploadProgress}%` : "เลือกไฟล์"}
            </Button>
            <input
              ref={uploadInputRef}
              type="file"
              accept=".txt,.csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileInputChange}
              disabled={isUploading}
            />
          </div>
          {data.total > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2" disabled={isPending}>
                  <Trash2 className="h-4 w-4" />
                  ล้างข้อมูลทั้งหมด
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ยืนยันการลบข้อมูลทั้งหมด</AlertDialogTitle>
                  <AlertDialogDescription>
                    คุณต้องการลบข้อมูล Fingerprint ทั้งหมด {data.total.toLocaleString("th-TH")}{" "}
                    รายการออกจากระบบหรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAll}
                    disabled={isPending}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    {isPending ? "กำลังลบ..." : "ลบทั้งหมด"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {data.data.length === 0 ? (
        <EmptyState
          icon={<EmptyStateIcons.Fingerprint />}
          title="ยังไม่มีข้อมูลบันทึกเวลา"
          description="เริ่มต้นใช้งานโดยการนำเข้าไฟล์ข้อมูลเวลาเข้างานจากเครื่องสแกนลายนิ้วมือ รองรับไฟล์ .txt, .csv และ .xlsx"
          action={
            <Button onClick={() => uploadInputRef.current?.click()} disabled={isUploading}>
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? `กำลังอัปโหลด ${uploadProgress}%` : "เลือกไฟล์"}
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50">
                <TableHead className="font-semibold text-zinc-900">ID</TableHead>
                <TableHead className="font-semibold text-zinc-900">ชื่อพนักงาน</TableHead>
                <TableHead className="font-semibold text-zinc-900">วันที่</TableHead>
                <TableHead className="font-semibold text-zinc-900">เวลา</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((row) => (
                <TableRow key={row.id} className="hover:bg-zinc-50">
                  <TableCell className="font-mono text-sm">
                    #{row.id.toString().padStart(10, "0")}
                  </TableCell>
                  <TableCell>
                    {row.employeeName ? (
                      <span className="font-medium text-zinc-900">{row.employeeName}</span>
                    ) : (
                      <span className="text-zinc-400 italic">
                        ไม่พบข้อมูล (รหัส: {row.fingerprint})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{formatDate(row.date)}</TableCell>
                  <TableCell className="font-mono text-sm">{row.time}</TableCell>
                </TableRow>
              ))}
              {/* Fill empty rows to always show 10 rows */}
              {Array.from({ length: LIMIT - data.data.length }).map((_, index) => (
                <TableRow key={`empty-${index}`} className="hover:bg-transparent">
                  <TableCell className="font-mono text-sm">&nbsp;</TableCell>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell className="font-mono text-sm">&nbsp;</TableCell>
                  <TableCell className="font-mono text-sm">&nbsp;</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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

      {/* Upload Result Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            {uploadResult?.success ? (
              <>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <DialogTitle>อัปโหลดเสร็จสิ้น</DialogTitle>
                </div>
                <DialogDescription className="pt-2 text-sm">
                  บันทึกข้อมูลใหม่: {uploadResult.inserted} รายการ
                  {uploadResult.skipped > 0 && (
                    <>
                      <br />
                      ข้ามข้อมูลซ้ำ: {uploadResult.skipped} รายการ
                    </>
                  )}
                </DialogDescription>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <DialogTitle>เกิดข้อผิดพลาด</DialogTitle>
                </div>
                <DialogDescription className="pt-2 text-sm">
                  {uploadResult?.error || "ไม่สามารถอัปโหลดไฟล์ได้"}
                </DialogDescription>
              </>
            )}
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}
