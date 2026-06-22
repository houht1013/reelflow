// Regenerates all app icons from the master logo SVG.
//   Source: apps/tanstack-app/public/reelflow-logo.svg (transparent)
// Run:     node scripts/gen-reelflow-icons.mjs [sourcePath]
//
// Tab/browser favicons and apple-touch are flattened on WHITE (so they read on
// any tab bar / home screen). android-chrome (PWA) also on white for a clean
// app tile. A real favicon.ico is written by wrapping a 32x32 PNG.
import sharp from 'sharp'
import { existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pub = resolve(root, 'apps/tanstack-app/public')
const src = process.argv[2] ? resolve(process.argv[2]) : resolve(pub, 'reelflow-logo.svg')

if (!existsSync(src)) {
  console.error(`Source logo not found: ${src}`)
  process.exit(1)
}

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }

// Render the logo onto a white square at `size`, with `pad` fraction of margin.
async function whiteTile(size, pad = 0.16) {
  const inner = Math.round(size * (1 - pad * 2))
  const logo = await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
}

const targets = [
  { file: 'favicon-16x16.png', size: 16, pad: 0.1 },
  { file: 'favicon-32x32.png', size: 32, pad: 0.12 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0.16 },
  { file: 'android-chrome-192x192.png', size: 192, pad: 0.16 },
  { file: 'android-chrome-512x512.png', size: 512, pad: 0.16 },
]

for (const { file, size, pad } of targets) {
  await (await whiteTile(size, pad)).toFile(resolve(pub, file))
  console.log('wrote', file, `${size}x${size}`)
}

// favicon.ico — wrap a 48x48 white-tile PNG in an ICO container (PNG-encoded).
const icoPng = await (await whiteTile(48, 0.12)).toBuffer()
const ico = Buffer.alloc(6 + 16 + icoPng.length)
ico.writeUInt16LE(0, 0) // reserved
ico.writeUInt16LE(1, 2) // type: icon
ico.writeUInt16LE(1, 4) // count
ico.writeUInt8(48, 6) // width
ico.writeUInt8(48, 7) // height
ico.writeUInt8(0, 8) // palette
ico.writeUInt8(0, 9) // reserved
ico.writeUInt16LE(1, 10) // color planes
ico.writeUInt16LE(32, 12) // bpp
ico.writeUInt32LE(icoPng.length, 14) // size of png data
ico.writeUInt32LE(6 + 16, 18) // offset to png data
icoPng.copy(ico, 6 + 16)
writeFileSync(resolve(pub, 'favicon.ico'), ico)
console.log('wrote favicon.ico (48x48, white)')

console.log('Done.')
