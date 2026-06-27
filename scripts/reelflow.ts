/**
 * reelflow — developer CLI for the video-template toolchain (agent-facing).
 * Driven by Claude Code / Codex via the Skill. Run from repo root:
 *   tsx scripts/reelflow.ts <command> [args]   (or: pnpm reelflow <command>)
 *
 * Commands (M3):
 *   structures                 List registered structure engines.
 *   validate <recipe.ts>       Import a recipe module (default export) and validate it.
 *   caps                       Probe capcut-mate capability enumerations.
 *
 * Later: recipe:new, preview, template:publish (M4/M6).
 */
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { registerStructure, listStructures, getStructure } from '../libs/reelflow/templates/_recipe/structure'
import { narratedStoryboardEngine } from '../libs/reelflow/templates/_recipe/engines/narrated-storyboard'
import type { VideoRecipe } from '../libs/reelflow/templates/_recipe/recipe'

registerStructure(narratedStoryboardEngine)

const CAPCUT_BASE = process.env.CAPCUT_MATE_BASE_URL || 'http://localhost:30000'
const CAPCUT_PREFIX = '/openapi/capcut-mate/v1'

function ok(msg: string) { console.log(`\x1b[32m✓\x1b[0m ${msg}`) }
function fail(msg: string) { console.error(`\x1b[31m✗\x1b[0m ${msg}`) }

async function cmdStructures() {
  const ids = listStructures()
  console.log(`Registered structure engines (${ids.length}):`)
  for (const id of ids) console.log(`  - ${id}`)
}

async function cmdValidate(file?: string) {
  if (!file) { fail('usage: validate <path-to-recipe.ts>'); process.exitCode = 1; return }
  const abs = resolve(process.cwd(), file)
  let mod: { default?: VideoRecipe }
  try {
    mod = await import(pathToFileURL(abs).href)
  } catch (e) {
    fail(`cannot import ${file}: ${e instanceof Error ? e.message : e}`); process.exitCode = 1; return
  }
  const recipe = mod.default
  if (!recipe) { fail('module has no default export (expected a VideoRecipe)'); process.exitCode = 1; return }

  const errors: string[] = []
  for (const k of ['schemaVersion', 'code', 'version', 'name', 'category', 'structure'] as const) {
    if (!recipe[k]) errors.push(`missing field: ${k}`)
  }
  if (!recipe.input?.fields?.length) errors.push('input.fields is empty')
  if (!recipe.canvas?.width || !recipe.canvas?.height) errors.push('canvas width/height required')

  const engine = getStructure(recipe.structure)
  if (!engine) errors.push(`unknown structure engine: ${recipe.structure}`)
  else {
    try { engine.parseConfig((recipe as { config: unknown }).config) }
    catch (e) { errors.push(`config invalid: ${e instanceof Error ? e.message : e}`) }
  }

  if (errors.length) {
    fail(`recipe "${recipe.code ?? '?'}" invalid:`)
    for (const e of errors) console.error(`    - ${e}`)
    process.exitCode = 1
  } else {
    ok(`recipe "${recipe.code}" v${recipe.version} (structure: ${recipe.structure}) is valid`)
  }
}

async function probe(path: string) {
  try {
    const res = await fetch(`${CAPCUT_BASE}${CAPCUT_PREFIX}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    })
    const text = await res.text()
    let n = ''
    try { const j = JSON.parse(text); n = ` (${Object.keys(j).join(', ').slice(0, 80)})` } catch { /* ignore */ }
    console.log(`  ${res.ok ? '✓' : '·'} ${path} → HTTP ${res.status}${n}`)
  } catch (e) {
    console.log(`  ✗ ${path} → ${e instanceof Error ? e.message : e}`)
  }
}

async function cmdCaps() {
  console.log(`Probing capcut-mate at ${CAPCUT_BASE}${CAPCUT_PREFIX}:`)
  for (const p of ['/get_effects', '/get_filters', '/get_image_animations', '/get_text_animations', '/get_text_effects']) {
    await probe(p)
  }
  console.log('Tip: inspect full request/response shapes via the OpenAPI at /openapi.json')
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2)
  switch (cmd) {
    case 'structures': return cmdStructures()
    case 'validate': return cmdValidate(args[0])
    case 'caps': return cmdCaps()
    default:
      console.log('reelflow CLI — commands: structures | validate <recipe.ts> | caps')
      if (cmd) process.exitCode = 1
  }
}

main().catch((e) => { fail(e instanceof Error ? e.message : String(e)); process.exit(1) })
