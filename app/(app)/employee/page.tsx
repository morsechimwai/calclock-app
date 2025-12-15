import { getEmployeesPaginated } from "@/lib/db"
import { EmployeeTable } from "@/components/employee-table"

const LIMIT = 10

export default function EmployeePage() {
  const initialData = getEmployeesPaginated(1, LIMIT)

  return (
    <div className="space-y-4">
      <h1 className="text-base font-semibold tracking-tight text-zinc-900">จัดการพนักงาน</h1>
      <p className="text-sm text-zinc-600">เพิ่ม แก้ไข หรือลบข้อมูลพนักงานในระบบ</p>

      <EmployeeTable initialData={initialData} />
    </div>
  )
}
