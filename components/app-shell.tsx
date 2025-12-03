"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import {
  LayoutDashboard,
  Calculator,
  Users,
  Fingerprint,
  Calendar,
  Clock,
  BrainCircuit,
} from "lucide-react"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/payroll", label: "คำนวณชั่วโมงทำงาน", icon: Calculator },
  { href: "/insert", label: "นำเข้าข้อมูลลายนิ้วมือ", icon: Fingerprint },
  { href: "/shift", label: "จัดการเวลาเข้างาน", icon: Calendar },
  { href: "/employee", label: "จัดการพนักงาน", icon: Users },
]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      {/* Fixed Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col border-r border-zinc-200 bg-white px-4 py-6 md:flex">
        <div className="mb-6 flex-col items-center justify-center gap-2">
          <div className="text-3xl font-black tracking-tight text-zinc-900 uppercase flex items-center ">
            CalCl
            <Clock className="size-6 text-zinc-50 bg-zinc-900 rounded-full p-0.5 mx-0.5" />
            ck
          </div>
        </div>

        <nav className="mt-2 flex flex-col gap-1 text-sm flex-1 overflow-y-auto">
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

        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-zinc-500">developed by</span>
          <div className="uppercase inline-flex items-center font-black text-zinc-50 bg-zinc-900 rounded-md px-2 py-1 text-xs">
            <BrainCircuit className="size-4 text-zinc-50 inline-block mr-0.5" />
            morsetron
          </div>
        </div>
      </aside>

      {/* Main Content - with left margin to account for sidebar */}
      <main className="md:ml-60 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  )
}
