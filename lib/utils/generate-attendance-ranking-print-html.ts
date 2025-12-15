import type { AttendanceRanking } from "@/app/(app)/dashboard/actions"

export function generateAttendanceRankingPrintHTML(
  data: AttendanceRanking[],
  filterText: string,
  totalDaysWithData: number
): string {
  let htmlRows = ""

  data.forEach((ranking) => {
    const employeeName = (ranking.employeeName || `ไม่พบข้อมูล (รหัส: ${ranking.fingerprint})`)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
    const ratingText = ranking.rating
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")

    const workDaysText =
      totalDaysWithData > 0
        ? `${ranking.workDays} วัน (${((ranking.workDays / totalDaysWithData) * 100).toFixed(1)}%)`
        : `${ranking.workDays} วัน`
    const workDaysTextEscaped = workDaysText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")

    htmlRows += `<tr>
      <td style="border: 1px solid #000; padding: 8px; text-align: left;">${employeeName}</td>
      <td style="border: 1px solid #000; padding: 8px; text-align: center; font-family: monospace;">${workDaysTextEscaped}</td>
      <td style="border: 1px solid #000; padding: 8px; text-align: center; font-family: monospace;">${ranking.lateDays} วัน</td>
      <td style="border: 1px solid #000; padding: 8px; text-align: center;">${ratingText}</td>
    </tr>`
  })

  const filterTextEscaped = filterText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

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
      font-family: 'Sarabun', 'Kanit', 'Prompt', sans-serif;
      padding: 20px;
      background: white;
      color: #000;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .header .filter {
      font-size: 14px;
      margin-bottom: 4px;
    }
    .header .info {
      font-size: 12px;
      margin-bottom: 4px;
      line-height: 1.6;
    }
    .header .note {
      font-size: 11px;
      margin-top: 8px;
      color: #666;
      line-height: 1.5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #000;
      font-size: 12px;
      margin: 0 auto;
      background-color: white;
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
    <h1>อันดับการเข้างาน</h1>
    ${filterTextEscaped ? `<div class="filter">${filterTextEscaped}</div>` : ""}
    <div class="info">จาก ${totalDaysWithData} วันทำงานทั้งหมด</div>
    <div class="info">เกณฑ์การประเมิน: อัตราการเข้าสาย ≤ 10% = ดี, &gt; 10% = ควรปรับปรุง</div>
    <div class="note">หมายเหตุ: เข้างานหลังเวลาเริ่มงาน 10 นาที ถือว่าเข้างานสาย</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>ชื่อ-นามสกุล</th>
        <th class="text-center">จำนวนวันทำงาน</th>
        <th class="text-center">จำนวนวันเข้าสาย</th>
        <th class="text-center">เกณฑ์</th>
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
