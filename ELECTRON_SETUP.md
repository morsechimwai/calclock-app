# Electron Desktop App Setup

## 📦 Build เป็น .exe (Windows) หรือ .app (macOS)

CalClock สามารถ build เป็น desktop application ที่รันได้เลยโดยไม่ต้อง `pnpm start`

## 🚀 Quick Start

### 1. Build Next.js App

```bash
pnpm build
```

### 2. Build Electron App

**Windows (.exe):**
```bash
pnpm build:electron
```

**macOS (.app):**
```bash
pnpm build:electron
```

**Linux (.AppImage):**
```bash
pnpm build:electron
```

Output จะอยู่ในโฟลเดอร์ `dist/`

## 📝 Development

สำหรับทดสอบ Electron app ในโหมด development:

```bash
# Terminal 1: Build Next.js
pnpm build

# Terminal 2: Start Electron
pnpm electron
```

หรือใช้ script ที่รวมไว้:
```bash
pnpm dev:electron
```

## 📦 Build Configuration

### Windows
- Output: `dist/CalClock Setup X.X.X.exe` (NSIS Installer)
- Architecture: x64, ia32
- Icon: `public/icons/icon-512x512.png`

### macOS
- Output: `dist/CalClock-X.X.X.dmg` (DMG Installer)
- Architecture: x64, arm64 (Apple Silicon)
- Icon: `public/icons/icon-512x512.png`

### Linux
- Output: `dist/CalClock-X.X.X.AppImage`
- Architecture: x64

## 🔧 Configuration Files

- `electron/main.js` - Electron main process
- `electron/preload.js` - Preload script
- `electron-builder.config.js` - Build configuration

## ⚙️ Customization

แก้ไข `electron-builder.config.js` เพื่อปรับแต่ง:
- App name, version, description
- Icons
- Installation directory
- Shortcuts
- และอื่นๆ

## 📋 Requirements

- Node.js 20+
- pnpm (แนะนำ) หรือ npm/yarn
- สำหรับ build Windows: ต้องใช้ Windows หรือ Docker
- สำหรับ build macOS: ต้องใช้ macOS
- สำหรับ build Linux: ใช้ Linux หรือ Docker

## 🎯 ใช้งาน

หลังจาก build แล้ว:

1. **Windows**: ดับเบิลคลิก `.exe` เพื่อติดตั้ง
2. **macOS**: เปิด `.dmg` แล้วลาก app ไปยัง Applications
3. **Linux**: ทำให้ `.AppImage` execute ได้ (`chmod +x`) แล้วรัน

App จะรัน Next.js server ภายในเอง - **ไม่ต้องรัน `pnpm start`**

## 🐛 Troubleshooting

### Build ล้มเหลว

- ตรวจสอบว่ามี `pnpm build` แล้ว
- ตรวจสอบว่า node_modules ติดตั้งครบ
- ลองลบ `dist/` และ build ใหม่

### App ไม่เริ่มต้น

- ตรวจสอบ Console logs
- ตรวจสอบว่า PORT 3000 ว่างอยู่
- ตรวจสอบไฟล์ใน `.next/` ว่ามีครบ

### Database ไม่ทำงาน

- ตรวจสอบว่า `calclock.db` อยู่ใน app directory
- ตรวจสอบ file permissions

## 📚 More Info

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Documentation](https://www.electron.build/)

