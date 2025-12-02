import type { Metadata } from "next"
import { Nunito } from "next/font/google"
import "./globals.css"

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "CalClock – Payroll Console",
  description: "CalClock – ระบบคำนวณเงินเดือนและจัดการพนักงานแบบเรียลไทม์สำหรับทีม HR และ Finance",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th">
      <body className={`${nunito.variable} font-sans antialiased bg-zinc-100`}>{children}</body>
    </html>
  )
}
