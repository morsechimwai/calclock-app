// Format date to Thai long format (วัน เดือน ปี พ.ศ.)
export function formatThaiDateLong(date: Date): string {
  const day = date.getDate()
  const monthNames = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ]
  const month = monthNames[date.getMonth()]
  const beYear = date.getFullYear() + 543
  return `${day} ${month} ${beYear}`
}

