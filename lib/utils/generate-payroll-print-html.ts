import { formatThaiDateLong } from "./format-thai-date"
import type { PayrollData } from "@/app/(app)/payroll/actions"
import type { DateRange } from "react-day-picker"
import {
  calculateWorkDaysAndOT,
  getCheckInCheckOut,
  getShiftForDate,
  getShiftForEmployeeByDate,
  isConsecutiveDay7,
  type Shift,
} from "./payroll-calculator"

export function generatePayrollPrintHTML(data: PayrollData[], dateRange?: DateRange): string {
  let htmlRows = ""
  let totalWorkDays = 0
  let totalOTHours = 0
  let totalLunchBreakOT = 0
  let employeeCount = data.length

  data.forEach((employee) => {
    // Create shift map from array
    const shiftMap = new Map<string, Shift>()
    employee.shifts.forEach((shift) => {
      shiftMap.set(shift.date, shift)
    })

    // Get all dates for this employee to check consecutive days
    const employeeDates = employee.entries.map((e) => e.date).sort()

    // Calculate totals for this employee
    let employeeWorkDays = 0
    let employeeOTHours = 0
    let employeeLunchBreakOT = 0

    employee.entries.forEach((entry) => {
      // Only calculate if there are exactly 2 time entries
      if (entry.times.length === 2) {
        const timeStrings = entry.times.map((t) => t.time)
        const { checkIn, checkOut } = getCheckInCheckOut(timeStrings)
        // Use employee-specific shift lookup
        const shift = getShiftForEmployeeByDate(
          employee.employeeId,
          entry.date,
          employee.shifts,
          employee.employeeShiftMap
        )
        const isConsecutive7 = isConsecutiveDay7(entry.date, employeeDates)
        const { workDays, otHours, lunchBreakOT } = calculateWorkDaysAndOT(
          checkIn,
          checkOut,
          shift.checkIn,
          shift.checkOut,
          shift.isHoliday,
          isConsecutive7,
          timeStrings,
          shift.enableOvertime
        )
        employeeWorkDays += workDays
        employeeOTHours += otHours
        employeeLunchBreakOT += lunchBreakOT
      }
    })

    // Round totals to 1 decimal place
    employeeWorkDays = Math.round(employeeWorkDays * 10) / 10
    employeeOTHours = Math.round(employeeOTHours * 10) / 10
    employeeLunchBreakOT = Math.round(employeeLunchBreakOT * 10) / 10

    // Add to totals for average calculation
    totalWorkDays += employeeWorkDays
    totalOTHours += employeeOTHours
    totalLunchBreakOT += employeeLunchBreakOT

    // Generate rows for each entry
    employee.entries.forEach((entry, entryIndex) => {
      // Parse date string (YYYY-MM-DD) to Date object
      const [year, month, day] = entry.date.split("-").map(Number)
      const date = new Date(year, month - 1, day)
      const formattedDate = formatThaiDateLong(date)

      // Format times (HH:MM:SS) to HH:MM and separate check-in and check-out
      const timesFormatted = entry.times.map((t) => {
        const [hour, minute] = t.time.split(":")
        return `${hour}:${minute}`
      })

      // Get check-in and check-out times
      const checkInTime = timesFormatted.length > 0 ? timesFormatted[0] : "-"
      const checkOutTime = timesFormatted.length > 1 ? timesFormatted[1] : "-"

      // Only calculate if there are exactly 2 time entries
      const hasTwoTimes = entry.times.length === 2
      const timeStrings = entry.times.map((t) => t.time)
      const { checkIn, checkOut } = getCheckInCheckOut(timeStrings)
      // Use employee-specific shift lookup
      const shift = getShiftForEmployeeByDate(
        employee.employeeId,
        entry.date,
        employee.shifts,
        employee.employeeShiftMap
      )
      const isConsecutive7 = isConsecutiveDay7(entry.date, employeeDates)

      // Calculate work days and OT hours (only if 2 times)
      const { workDays, workHours, otHours, lunchBreakOT } = hasTwoTimes
        ? calculateWorkDaysAndOT(
            checkIn,
            checkOut,
            shift.checkIn,
            shift.checkOut,
            shift.isHoliday,
            isConsecutive7,
            timeStrings,
            shift.enableOvertime
          )
        : {
            workDays: 0,
            workHours: 0,
            otHours: 0,
            lunchBreakOT: 0,
          }

      // Check if OT is from enableOvertime (not consecutive day 7 or holiday)
      const hasOvertimeFromEnableOT = shift.enableOvertime && !isConsecutive7 && !shift.isHoliday

      const employeeName = (employee.employeeName || `ไม่พบข้อมูล (รหัส: ${employee.fingerprint})`)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
      const checkInTimeEscaped = checkInTime
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
      const checkOutTimeEscaped = checkOutTime
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
      const workDaysText = hasTwoTimes
        ? workDays > 0
          ? `${workDays.toFixed(1)}&nbsp;<span style="font-size: 12px;">(${workHours.toFixed(
              1
            )} ชม.)</span>`
          : workDays.toFixed(1)
        : "-"
      const lunchOTText = (hasTwoTimes ? (lunchBreakOT > 0 ? lunchBreakOT.toFixed(1) : "0") : "-")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
      const otText = (hasTwoTimes ? (otHours > 0 ? otHours.toFixed(1) : "0") : "-")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")

      const markers: string[] = []
      if (shift.isHoliday) {
        markers.push("SD")
      }
      if (isConsecutive7) {
        markers.push("7D")
      }
      if (hasOvertimeFromEnableOT && otHours > 0) {
        markers.push("OT")
      }
      const dateLabel =
        markers.length > 0 ? `${formattedDate} (${markers.join(", ")})` : formattedDate
      const formattedDateEscaped = dateLabel
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")

      if (entryIndex === 0) {
        htmlRows += `<tr>
          <td rowspan="${
            employee.entries.length + 1
          }" style="border: 1px solid #000; padding: 8px; text-align: left; vertical-align: top;">${employeeName}</td>
          <td class="nowrap" style="border: 1px solid #000; padding: 8px; text-align: left;">${formattedDateEscaped}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-family: monospace;">${checkInTimeEscaped}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-family: monospace;">${checkOutTimeEscaped}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-family: monospace; white-space: nowrap;">${workDaysText}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-family: monospace;">${lunchOTText}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-family: monospace;">${otText}</td>
        </tr>`
      } else {
        htmlRows += `<tr>
          <td class="nowrap" style="border: 1px solid #000; padding: 8px; text-align: left;">${formattedDateEscaped}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-family: monospace;">${checkInTimeEscaped}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-family: monospace;">${checkOutTimeEscaped}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-family: monospace; white-space: nowrap;">${workDaysText}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-family: monospace;">${lunchOTText}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-family: monospace;">${otText}</td>
        </tr>`
      }
    })

    // Summary row
    htmlRows += `<tr style="background-color: #f5f5f5; font-weight: bold;">
      <td colspan="3" style="border: 1px solid #000; padding: 8px; text-align: left;">รวม</td>
      <td style="border: 1px solid #000; padding: 8px; text-align: center; font-family: monospace;">${employeeWorkDays.toFixed(
        1
      )}</td>
      <td style="border: 1px solid #000; padding: 8px; text-align: center; font-family: monospace;">${employeeLunchBreakOT.toFixed(
        1
      )}</td>
      <td style="border: 1px solid #000; padding: 8px; text-align: center; font-family: monospace;">${employeeOTHours.toFixed(
        1
      )}</td>
    </tr>`
  })

  // Calculate averages
  const avgWorkDays = employeeCount > 0 ? Math.round((totalWorkDays / employeeCount) * 10) / 10 : 0
  const avgOTHours =
    employeeCount > 0
      ? Math.round(((totalOTHours + totalLunchBreakOT) / employeeCount) * 10) / 10
      : 0

  // Format date range
  const dateRangeText =
    dateRange?.from && dateRange?.to
      ? `ตั้งแต่วันที่ ${formatThaiDateLong(dateRange.from)} ถึง ${formatThaiDateLong(
          dateRange.to
        )}`
      : ""

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title></title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      padding: 20px;
      background: white;
      color: #000;
      font-size: 16px;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 26px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .header .company {
      font-size: 20px;
      margin-bottom: 10px;
    }
    .header .info {
      font-size: 18px;
      line-height: 1.6;
      margin-bottom: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #000;
      font-size: 14px;
      margin: 0 auto;
      background-color: white;
    }
    .nowrap {
      white-space: nowrap;
    }
    .workday-main {
      font-weight: 600;
      line-height: 1.3;
    }
    .workday-sub {
      font-size: 12px;
      line-height: 1.2;
    }
    thead {
      background-color: #f5f5f5;
    }
    th {
      background-color: #f5f5f5;
      border: 1px solid #000;
      padding: 10px 8px;
      text-align: left;
      font-weight: bold;
      border-bottom: 2px solid #000;
    }
    th.text-center {
      text-align: center;
    }
    tbody tr {
      border-bottom: 1px solid #000;
    }
    tbody tr:last-child {
      border-bottom: none;
    }
    td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
      background-color: white;
    }
    td.text-center {
      text-align: center;
    }
    tr.summary-row {
      background-color: #f5f5f5 !important;
      font-weight: bold;
    }
    tr.summary-row td {
      background-color: #f5f5f5 !important;
      border-top: 2px solid #000;
    }
    @media print {
      body {
        padding: 0;
      }
      .header {
        margin-bottom: 15px;
      }
      @page {
        margin: 1cm;
        size: A4;
      }
      @page {
        @top-center {
          content: "";
        }
        @bottom-center {
          content: "";
        }
        @bottom-left {
          content: "";
        }
        @bottom-right {
          content: "";
        }
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>ตารางเวลาทำงาน</h1>
    <div class="info">${dateRangeText}</div>
    <div class="info">จำนวนพนักงาน ${employeeCount} คน</div>
    <div class="info">วันทำงานเฉลี่ย ${avgWorkDays.toFixed(
      1
    )} วัน ล่วงเวลาโอทีเฉลี่ย ${avgOTHours.toFixed(1)} ชั่วโมง (รวมพักกลางวัน)</div>
    <div class="info">หมายเหตุ: OT = OT จากเปิดล่วงเวลา, 7D = ทำงานต่อเนื่อง 7 วัน, SD = วันหยุดนักขัตฤกษ์</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>ชื่อ-นามสกุล</th>
        <th class="nowrap">วันที่</th>
        <th class="text-center">เข้า</th>
        <th class="text-center">ออก</th>
        <th class="text-center">วันทำงาน</th>
        <th class="text-center">พักกลางวัน (โอที)</th>
        <th class="text-center">ล่วงเวลา (โอที)</th>
      </tr>
    </thead>
    <tbody>
      ${htmlRows}
    </tbody>
  </table>
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`
}
