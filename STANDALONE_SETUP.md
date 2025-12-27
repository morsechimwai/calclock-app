# Standalone Desktop App Setup

## ⚠️ ข้อจำกัดของ Next.js PWA

Next.js PWA **ต้องมี server ทำงานอยู่** เพราะ:
- ใช้ Server Actions สำหรับจัดการข้อมูล
- ต้องการ Next.js runtime server
- ไม่สามารถ build เป็น pure static site ได้ (ถ้ามี Server Actions)

## 🎯 ทางเลือกสำหรับ Standalone App

### 1. ✅ แนะนำ: Deploy บน Production Server (ฟรี)

**ข้อดี:**
- ไม่ต้องรัน server เอง
- User แค่คลิก icon แล้วใช้งาน
- Sync ข้อมูลได้หลายเครื่อง
- ฟรี (Vercel, Railway, Render)

**วิธีการ:**

1. **Deploy บน Vercel** (แนะนำ)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

หรือ push code ไป GitHub แล้วเชื่อม Vercel อัตโนมัติ

2. **User ติดตั้ง PWA**
   - เปิด `https://your-app.vercel.app`
   - คลิกปุ่ม Install
   - ใช้งานได้เลย (ไม่ต้องรัน server)

---

### 2. 🔧 ใช้ Electron/Tauri (สำหรับ True Standalone)

ถ้าต้องการ app ที่ทำงาน standalone จริงๆ (ไม่มี server เลย) ควรใช้:

- **Electron** - Desktop app wrapper
- **Tauri** - Lightweight alternative

แต่ต้อง refactor code ใหม่ไม่ใช้ Server Actions

---

### 3. ⚙️ Local Development + PWA

สำหรับทดสอบ local:

```bash
# Terminal 1: Start server
pnpm build
pnpm start

# User: ติดตั้ง PWA จาก localhost:3000
# หลังจากติดตั้งแล้ว app จะทำงาน standalone
# แต่ยังต้องมี server รันอยู่
```

---

## 📊 สรุป

| วิธี | ต้องมี Server? | User ทำอะไร? | เหมาะกับ |
|------|---------------|-------------|----------|
| **Production Deploy** | ✅ (Vercel/Railway) | คลิก icon | ✅ แนะนำ |
| **Local + PWA** | ✅ (localhost) | คลิก icon + รัน server | ทดสอบเท่านั้น |
| **Electron/Tauri** | ❌ | คลิก icon | Standalone จริงๆ |

---

## 💡 คำแนะนำ

**สำหรับ Production Use:**
→ Deploy บน Vercel (ฟรี, ง่าย, เร็ว)
→ User ติดตั้ง PWA จาก production URL
→ ไม่ต้องรัน server เอง

**สำหรับ Development:**
→ ใช้ `pnpm dev` หรือ `pnpm start` แบบปกติ
→ ติดตั้ง PWA จาก localhost สำหรับทดสอบ

---

## 🚀 Quick Start: Deploy on Vercel

1. **สร้าง Vercel Account** ที่ [vercel.com](https://vercel.com)

2. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

3. **Deploy**
   ```bash
   cd calclock-app
   vercel --prod
   ```

4. **User ติดตั้ง PWA**
   - เปิด URL ที่ Vercel ให้
   - คลิก Install
   - ใช้งานได้เลย! 🎉

---

**หมายเหตุ:** ถ้าต้องการ standalone app จริงๆ ที่ไม่ต้องมี server เลย ควรพิจารณา Electron หรือ Tauri แต่ต้อง refactor code ให้ไม่ใช้ Server Actions

