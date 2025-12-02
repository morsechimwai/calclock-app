"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { LayoutDashboard, Calculator, Users, Fingerprint } from "lucide-react"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "หน้าหลัก", icon: LayoutDashboard },
  { href: "/payroll", label: "คำนวณเงินเดือน", icon: Calculator },
  { href: "/employee", label: "จัดการพนักงาน", icon: Users },
  { href: "/insert", label: "นำเข้าบันทึกเวลา", icon: Fingerprint },
]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-zinc-100 text-zinc-900">
      <aside className="hidden w-60 flex-col border-r border-zinc-200 bg-white px-4 py-6 md:flex">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-base font-semibold text-white">
            CC
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight">CalClock</div>
          </div>
        </div>

        <nav className="mt-2 flex flex-col gap-1 text-sm">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-left transition ${
                  active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  )
}
