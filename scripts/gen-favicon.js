/**
 * Generate favicon.ico and apple-touch-icon.png from favicon.svg
 * Uses sharp from app/server dependencies
 * 
 * Usage: cd app/server && node ../../scripts/gen-favicon.js
 *   or:  node scripts/gen-favicon.js (from project root, if sharp is accessible)
 */
const { readFileSync, writeFileSync } = require('fs')
const path = require('path')

// Resolve sharp from app/server/node_modules
const ROOT = path.resolve(__dirname, '..')
const sharp = require(path.resolve(ROOT, 'app/server/node_modules/sharp'))

const svgPath = path.resolve(ROOT, 'app/client/public/favicon.svg')
const svgBuffer = readFileSync(svgPath)

async function generateFavicons() {
  // Generate 32x32 PNG for favicon.ico
  const png32 = await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toBuffer()

  // Generate 16x16 PNG
  const png16 = await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toBuffer()

  // Generate 180x180 Apple Touch Icon
  const png180 = await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toBuffer()

  // Generate 192x192 for Android/PWA
  const png192 = await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toBuffer()

  // Write ICO file (16x16 + 32x32 PNG in ICO container)
  const ico = createIco([
    { png: png16, size: 16 },
    { png: png32, size: 32 },
  ])

  const outDir = path.resolve(ROOT, 'app/client/public')
  writeFileSync(path.resolve(outDir, 'favicon.ico'), ico)
  writeFileSync(path.resolve(outDir, 'apple-touch-icon.png'), png180)
  writeFileSync(path.resolve(outDir, 'favicon-192.png'), png192)

  console.log('✅ Generated:')
  console.log('   - favicon.ico (16x16 + 32x32)')
  console.log('   - apple-touch-icon.png (180x180)')
  console.log('   - favicon-192.png (192x192)')
}

/**
 * Create a minimal ICO file from PNG buffers
 * ICO format: Header + Directory entries + Image data
 */
function createIco(images) {
  const headerSize = 6
  const dirEntrySize = 16
  const dataOffset = headerSize + dirEntrySize * images.length

  // ICO Header
  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)             // Reserved
  header.writeUInt16LE(1, 2)             // Type: 1 = ICO
  header.writeUInt16LE(images.length, 4) // Number of images

  // Directory entries
  const dirEntries = Buffer.alloc(dirEntrySize * images.length)
  let currentOffset = dataOffset

  for (let i = 0; i < images.length; i++) {
    const { png, size } = images[i]
    const offset = i * dirEntrySize
    dirEntries.writeUInt8(size === 256 ? 0 : size, offset)     // Width
    dirEntries.writeUInt8(size === 256 ? 0 : size, offset + 1) // Height
    dirEntries.writeUInt8(0, offset + 2)                        // Color palette
    dirEntries.writeUInt8(0, offset + 3)                        // Reserved
    dirEntries.writeUInt16LE(1, offset + 4)                     // Color planes
    dirEntries.writeUInt16LE(32, offset + 6)                    // Bits per pixel
    dirEntries.writeUInt32LE(png.length, offset + 8)            // Image size
    dirEntries.writeUInt32LE(currentOffset, offset + 12)        // Image offset
    currentOffset += png.length
  }

  return Buffer.concat([header, dirEntries, ...images.map(i => i.png)])
}

generateFavicons().catch(err => {
  console.error('❌ Failed to generate favicons:', err.message)
  process.exit(1)
})
