import type { Metadata, Viewport } from "next"
import { Nunito } from "next/font/google"
import "./globals.css"

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "CalClock – Payroll Console",
  description: "CalClock – ระบบคำนวณเงินเดือนและจัดการพนักงานแบบเรียลไทม์สำหรับทีม HR และ Finance",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CalClock",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "CalClock",
    title: "CalClock – Payroll Console",
    description: "ระบบคำนวณเงินเดือนและจัดการพนักงานแบบเรียลไทม์สำหรับทีม HR และ Finance",
  },
  twitter: {
    card: "summary",
    title: "CalClock – Payroll Console",
    description: "ระบบคำนวณเงินเดือนและจัดการพนักงานแบบเรียลไทม์สำหรับทีม HR และ Finance",
  },
}

export const viewport: Viewport = {
  themeColor: "#F59E0B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${nunito.variable} font-sans antialiased bg-zinc-100`}>{children}</body>
    </html>
  )
}
