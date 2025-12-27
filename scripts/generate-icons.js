/**
 * PWA Icon Generator Script
 *
 * This script generates PWA icons from the base SVG icon.
 * Run: node scripts/generate-icons.js
 *
 * Note: Requires sharp package. Install with: pnpm add -D sharp
 */

const fs = require('fs')
const path = require('path')

// SVG icon template - CalClock logo with clock design
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F59E0B"/>
      <stop offset="100%" style="stop-color:#D97706"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="160" fill="white" opacity="0.95"/>
  <circle cx="256" cy="256" r="140" fill="none" stroke="#18181B" stroke-width="8"/>
  <!-- Clock hands -->
  <line x1="256" y1="256" x2="256" y2="140" stroke="#18181B" stroke-width="10" stroke-linecap="round"/>
  <line x1="256" y1="256" x2="340" y2="256" stroke="#18181B" stroke-width="8" stroke-linecap="round"/>
  <!-- Center dot -->
  <circle cx="256" cy="256" r="12" fill="#F59E0B"/>
  <!-- Hour markers -->
  <circle cx="256" cy="130" r="8" fill="#18181B"/>
  <circle cx="382" cy="256" r="8" fill="#18181B"/>
  <circle cx="256" cy="382" r="8" fill="#18181B"/>
  <circle cx="130" cy="256" r="8" fill="#18181B"/>
</svg>`

const iconsDir = path.join(__dirname, '../public/icons')

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

// Save SVG as base icon
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon)
console.log('Created icon.svg')

// Icon sizes for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

async function generateIcons() {
  try {
    // Try to use sharp for PNG generation
    const sharp = require('sharp')

    for (const size of sizes) {
      await sharp(Buffer.from(svgIcon))
        .resize(size, size)
        .png()
        .toFile(path.join(iconsDir, `icon-${size}x${size}.png`))
      console.log(`Created icon-${size}x${size}.png`)
    }

    // Create favicon
    await sharp(Buffer.from(svgIcon))
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, '../public/favicon.png'))
    console.log('Created favicon.png')

    console.log('\\nAll icons generated successfully!')
  } catch (err) {
    console.log('Sharp not installed. Creating placeholder PNGs...')
    console.log('For production, run: pnpm add -D sharp && node scripts/generate-icons.js')

    // Create simple placeholder files
    for (const size of sizes) {
      // Create a simple PNG placeholder with minimal header
      const pngPath = path.join(iconsDir, `icon-${size}x${size}.png`)
      // Just copy the SVG for now - browsers can handle it
      fs.writeFileSync(pngPath.replace('.png', '.svg'), svgIcon)
      console.log(`Created placeholder for icon-${size}x${size}`)
    }
  }
}

generateIcons()

