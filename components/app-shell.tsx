"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, type ReactNode } from "react"
import {
  LayoutDashboard,
  Calculator,
  Users,
  Fingerprint,
  Calendar,
  Clock,
  BrainCircuit,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  function toggleSidebar() {
    setIsSidebarOpen((prev) => !prev)
  }

  function closeSidebar() {
    setIsSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-12 items-center gap-3 border-b border-zinc-200 bg-white px-3 md:hidden">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="เปิดเมนู">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-1">
          <div className="text-base font-black tracking-tight text-zinc-900 uppercase">
            CalCl
            <Clock className="inline size-4 text-zinc-50 bg-zinc-900 rounded-full p-0.5 mx-0.5" />
            ck
          </div>
        </div>
      </header>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-60 flex-col border-r border-zinc-200 bg-white px-4 py-6 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:flex`}
      >
        {/* Mobile close button */}
        <div className="mb-4 flex items-center justify-between md:justify-center">
          <div className="flex items-center text-3xl font-black uppercase tracking-tight text-zinc-900">
            CalCl
            <Clock className="mx-0.5 size-6 rounded-full bg-zinc-900 p-0.5 text-zinc-50" />
            ck
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeSidebar}
            className="md:hidden"
            aria-label="ปิดเมนู"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-2 flex flex-col gap-1 text-sm font-medium flex-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={`flex items-center gap-3 rounded-md px-3.5 py-2.5 text-left transition ${
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

      {/* Main Content */}
      <main className="md:ml-60 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  )
}
