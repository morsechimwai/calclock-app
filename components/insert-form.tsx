"use client"

import { Download, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function InsertForm() {
  return (
    <div className="space-y-4">
      {/* Template Section */}
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-zinc-600" />
            <h2 className="text-lg font-semibold text-zinc-900">รูปแบบไฟล์ที่รองรับ</h2>
          </div>
          <a href="/template-timestamp.txt" download>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              ดาวน์โหลด Template
            </Button>
          </a>
        </div>

        <p className="mb-4 text-sm text-zinc-600">
          ไฟล์ต้องมีหัวตาราง (Header) ตามรูปแบบด้านล่าง และใช้ Tab หรือ Space หลายตัวในการแยกคอลัมน์
        </p>

        <div className="overflow-x-auto rounded-md border border-zinc-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50">
                <TableHead className="font-semibold text-zinc-900">No</TableHead>
                <TableHead className="font-semibold text-zinc-900">TMNo</TableHead>
                <TableHead className="font-semibold text-zinc-900">EnNo</TableHead>
                <TableHead className="font-semibold text-zinc-900">Name</TableHead>
                <TableHead className="font-semibold text-zinc-900">INOUT</TableHead>
                <TableHead className="font-semibold text-zinc-900">Mode</TableHead>
                <TableHead className="font-semibold text-zinc-900">DateTime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-sm">1</TableCell>
                <TableCell className="font-mono text-sm">1</TableCell>
                <TableCell className="font-mono text-sm font-semibold text-blue-600">1</TableCell>
                <TableCell>มอร์ส</TableCell>
                <TableCell className="font-mono text-sm">1</TableCell>
                <TableCell className="font-mono text-sm">0</TableCell>
                <TableCell className="font-mono text-sm">2024/01/28 17:17:05</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm">2</TableCell>
                <TableCell className="font-mono text-sm">1</TableCell>
                <TableCell className="font-mono text-sm font-semibold text-blue-600">2</TableCell>
                <TableCell>ป๋าเฉลียว</TableCell>
                <TableCell className="font-mono text-sm">1</TableCell>
                <TableCell className="font-mono text-sm">0</TableCell>
                <TableCell className="font-mono text-sm">2024/01/28 17:19:23</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm">3</TableCell>
                <TableCell className="font-mono text-sm">1</TableCell>
                <TableCell className="font-mono text-sm font-semibold text-blue-600">1</TableCell>
                <TableCell>มอร์ส</TableCell>
                <TableCell className="font-mono text-sm">1</TableCell>
                <TableCell className="font-mono text-sm">0</TableCell>
                <TableCell className="font-mono text-sm">2024/01/28 17:28:28</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 space-y-2 rounded-md bg-blue-50 p-3 text-sm">
          <p className="font-medium text-blue-900">หมายเหตุ:</p>
          <ul className="ml-4 list-disc space-y-1 text-blue-800">
            <li>
              <span className="font-semibold">EnNo</span> = รหัสนิ้วมือ (Fingerprint)
              ที่ใช้ในการเชื่อมโยงกับข้อมูลพนักงาน
            </li>
            <li>
              <span className="font-semibold">DateTime</span> = วันที่และเวลาในรูปแบบ{" "}
              <code className="rounded bg-blue-100 px-1 py-0.5 font-mono">YYYY/MM/DD HH:mm:ss</code>
            </li>
            <li>ระบบจะอ่านเฉพาะคอลัมน์ EnNo และ DateTime เท่านั้น</li>
            <li>ข้อมูลที่ซ้ำ (EnNo + Date + Time) จะถูกข้ามอัตโนมัติ</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
