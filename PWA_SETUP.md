# CalClock PWA Setup Guide

## 📱 การติดตั้งเป็น Desktop App (PWA)

### 1. Build และ Start Server

```bash
# Build production version
pnpm build

# Start server (สำหรับการติดตั้ง PWA)
pnpm start
```

### 2. ติดตั้ง PWA บน Desktop

1. เปิด Chrome/Edge ไปที่ `http://localhost:3000`
2. คลิกไอคอน **ติดตั้ง** (Install icon) ที่ address bar
3. หรือไปที่ Menu → Install CalClock...
4. App จะถูกติดตั้งเป็น desktop application

### 3. หลังจากติดตั้งแล้ว

**⚠️ สำคัญ:** PWA จะทำงาน standalone แต่:

- ✅ **Offline Database** - ใช้งานได้โดยไม่ต้องมี server (ข้อมูลเก็บใน IndexedDB)
- ✅ **Sync Service** - จะ sync ข้อมูลเมื่อกลับมา online อัตโนมัติ
- ⚠️ **API Calls** - ยังต้องการ server รันอยู่ (`pnpm start`)

### 📊 การทำงาน Offline

เมื่อใช้งาน offline:
- ข้อมูลทั้งหมดถูกเก็บใน **IndexedDB** ผ่าน sql.js
- สามารถ **เพิ่ม/แก้ไข/ลบ** ข้อมูลได้ปกติ
- การเปลี่ยนแปลงจะถูกเก็บใน **Sync Queue**
- เมื่อกลับมา online จะ **sync อัตโนมัติ** ภายใน 30 วินาที

### 🔄 Sync Behavior

- **Online**: Sync ทุก 30 วินาที + เมื่อมีการเปลี่ยนแปลง
- **Offline**: เก็บใน Sync Queue, sync เมื่อกลับมา online
- **Manual Sync**: คลิกปุ่ม refresh ใน Offline Status indicator

### 🚀 Development Mode

```bash
# Development (PWA disabled, offline DB ยังทำงานได้)
pnpm dev

# Production build + start (PWA enabled)
pnpm build
pnpm start
```

### 💡 Tips

1. **สำหรับ Production**: Deploy บน server (Vercel, Railway, etc.) แล้ว install จาก production URL
2. **สำหรับ Local Testing**: ใช้ `pnpm start` หลัง build
3. **Offline Data**: ข้อมูลใน IndexedDB จะถูกเก็บใน browser local storage

### 🗂️ Data Storage

- **Server-side**: SQLite (`calclock.db`) - ใช้เมื่อมี server
- **Client-side**: IndexedDB (sql.js) - ใช้เมื่อ offline
- **Sync**: ข้อมูลจะ sync ระหว่างสองแหล่งเมื่อ online

