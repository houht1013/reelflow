// Adds a tight viewBox to reelflow-logo.svg so the artwork fills its box
// (the trace has lots of empty margin). Measures the bbox by rasterising +
// trimming with sharp.
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'apps/tanstack-app/public/reelflow-logo.svg')
let svg = readFileSync(file, 'utf8')

// native size from header
const w0 = Number(svg.match(/width="(\d+)"/)?.[1] ?? 1254)
const h0 = Number(svg.match(/height="(\d+)"/)?.[1] ?? 1254)

const png = await sharp(Buffer.from(svg)).png().toBuffer()
const { info } = await sharp(png).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true })

const minX = Math.max(0, -(info.trimOffsetLeft ?? 0))
const minY = Math.max(0, -(info.trimOffsetTop ?? 0))
const bw = info.width
const bh = info.height

// square it up + small margin so the loop sits centered with breathing room
const size = Math.max(bw, bh)
const margin = Math.round(size * 0.04)
const cx = minX + bw / 2
const cy = minY + bh / 2
const half = size / 2 + margin
const vbX = Math.round(cx - half)
const vbY = Math.round(cy - half)
const vb = Math.round(half * 2)

const viewBox = `${vbX} ${vbY} ${vb} ${vb}`

if (/viewBox="/.test(svg)) {
  svg = svg.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`)
} else {
  svg = svg.replace(/<svg\b/, `<svg viewBox="${viewBox}"`)
}
// let it scale to the container
svg = svg.replace(/\swidth="\d+"/, ' width="100%"').replace(/\sheight="\d+"/, ' height="100%"')

writeFileSync(file, svg, 'utf8')
console.log(`native ${w0}x${h0} -> bbox ${bw}x${bh} @ (${minX},${minY}); viewBox="${viewBox}"`)
