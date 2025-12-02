import { getFingerprintsPaginatedWithEmployee } from "@/lib/db"
import { FingerprintTable } from "@/components/fingerprint-table"
import { InsertForm } from "@/components/insert-form"

function FingerprintTableWrapper() {
  const page = 1
  const limit = 10
  const fingerprintData = getFingerprintsPaginatedWithEmployee(page, limit)
  return <FingerprintTable initialData={fingerprintData} />
}

export default function InsertPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">บันทึกเวลาเข้างาน</h1>
        <p className="text-base text-zinc-600">
          อัปโหลดไฟล์เวลาเข้างาน (.txt, .csv หรือ .xlsx) เพื่อใช้ในการคำนวณเงินเดือน
        </p>
      </div>

      {/* Fingerprint Table - Show before upload form */}
      <FingerprintTableWrapper />

      {/* Upload Form */}
      <InsertForm />
    </div>
  )
}
