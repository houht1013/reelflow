// Strips near-white background paths from the traced logo.svg, leaving the
// coloured artwork on a transparent canvas.
//   in:  apps/tanstack-app/public/logo.svg
//   out: apps/tanstack-app/public/reelflow-logo.svg
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pub = resolve(root, 'apps/tanstack-app/public')
const src = readFileSync(resolve(pub, 'logo.svg'), 'utf8')

const WHITE_MIN = 240 // drop paths whose fill min-channel >= this (bg + perforations)

let kept = 0
let dropped = 0

const out = src.replace(/<path\b[^>]*\/>/g, (tag) => {
  const m = tag.match(/fill:rgb\((\d+),(\d+),(\d+)\)/)
  if (m) {
    const min = Math.min(Number(m[1]), Number(m[2]), Number(m[3]))
    if (min >= WHITE_MIN) {
      dropped++
      return ''
    }
  }
  kept++
  return tag
})

writeFileSync(resolve(pub, 'reelflow-logo.svg'), out, 'utf8')
console.log(`kept ${kept} paths, dropped ${dropped} near-white paths`)
console.log(`out size: ${(out.length / 1024).toFixed(0)} KB`)
