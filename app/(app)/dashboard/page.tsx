import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        หน้าหลัก
      </h1>
      <p className="text-base text-zinc-600">
        ภาพรวมระบบและเข้าถึงฟีเจอร์หลักได้จากที่นี่
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <Button className="w-full justify-start px-4 py-3 text-left text-base font-semibold">
          คำนวณเงินเดือน
        </Button>
        <Button variant="outline" className="w-full justify-start px-4 py-3 text-left text-base">
          บันทึกเวลาเข้างาน
        </Button>
        <Button variant="outline" className="w-full justify-start px-4 py-3 text-left text-base">
          จัดการพนักงาน
        </Button>
      </div>
    </div>
  )
}
