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
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { config as loadEnv } from 'dotenv'
import { registerStructure, listStructures, getStructure } from '../libs/reelflow/templates/_recipe/structure'
import { narratedStoryboardEngine } from '../libs/reelflow/templates/_recipe/engines/narrated-storyboard'
import type { VideoRecipe } from '../libs/reelflow/templates/_recipe/recipe'

// Load local env (.env.local) so DB + providers are available for preview.
if (existsSync('.env.local')) loadEnv({ path: '.env.local' })

registerStructure(narratedStoryboardEngine)

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}

async function importRecipe(file: string): Promise<VideoRecipe> {
  const mod = (await import(pathToFileURL(resolve(process.cwd(), file)).href)) as { default?: VideoRecipe }
  if (!mod.default) throw new Error(`${file} has no default export (expected a VideoRecipe)`)
  return mod.default
}

async function cmdPreview(args: string[]) {
  const file = args[0]
  if (!file) { fail('usage: preview <recipe.ts> [--input data.json] [--out result.json] [--max-images N]'); process.exitCode = 1; return }
  const recipe = await importRecipe(file)
  const inputPath = flag(args, 'input')
  const input = inputPath ? JSON.parse(readFileSync(resolve(process.cwd(), inputPath), 'utf8')) : {}
  const maxImages = flag(args, 'max-images') ? Number(flag(args, 'max-images')) : undefined
  const mp4 = args.includes('--no-mp4') ? false : undefined
  const { runRecipePreview } = await import('../libs/reelflow/templates/_recipe/preview')

  console.log(`Preview "${recipe.code}" v${recipe.version} (real providers, dev workspace, meter-only${mp4 === false ? ', no MP4' : ''})…`)
  const result = await runRecipePreview(recipe, input, { maxImages, mp4 })
  ok(`preview done — ${result.shots.length} shots, ${(result.durationMs / 1000).toFixed(1)}s`)
  console.log(`  draft: ${result.draftUrl ?? '(none)'}`)
  console.log(`  mp4:   ${result.mp4Url ?? '(pending/none)'}`)
  for (const s of result.shots) console.log(`  · shot ${s.index + 1} [${s.startMs}-${s.endMs}ms] ${s.narration.slice(0, 24)}…`)

  const out = flag(args, 'out')
  if (out) { writeFileSync(resolve(process.cwd(), out), JSON.stringify(result, null, 2)); ok(`wrote ${out}`) }
}

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
  if (!recipe.params?.length && !recipe.input?.fields?.length) errors.push('params is empty (declare dynamic params)')
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

async function cmdPublish(args: string[]) {
  const file = args[0]
  if (!file) { fail('usage: template:publish <recipe.ts> [--changelog "..."]'); process.exitCode = 1; return }
  const recipe = await importRecipe(file)
  const engine = getStructure(recipe.structure)
  if (!engine) { fail(`unknown structure: ${recipe.structure}`); process.exitCode = 1; return }
  try { engine.parseConfig((recipe as { config: unknown }).config) }
  catch (e) { fail(`config invalid: ${e instanceof Error ? e.message : e}`); process.exitCode = 1; return }

  const { publishRecipe } = await import('../libs/reelflow/templates/_recipe/published-recipes')
  const res = await publishRecipe(recipe, { changelog: flag(args, 'changelog') })
  ok(`published ${res.code} v${res.version}`)
}

async function cmdVersions(args: string[]) {
  const code = args[0]
  if (!code) { fail('usage: template:versions <code>'); process.exitCode = 1; return }
  const { listRecipeVersions } = await import('../libs/reelflow/templates/_recipe/published-recipes')
  const rows = await listRecipeVersions(code)
  if (!rows.length) { console.log(`no versions for ${code}`); return }
  console.log(`versions of ${code}:`)
  for (const r of rows) console.log(`  ${r.status === 'published' ? '●' : '○'} v${r.version} [${r.status}] ${r.structureId}${r.changelog ? ` — ${r.changelog}` : ''}`)
}

async function cmdRollback(args: string[]) {
  const [code, version] = args
  if (!code || !version) { fail('usage: template:rollback <code> <version>'); process.exitCode = 1; return }
  const { rollbackRecipe } = await import('../libs/reelflow/templates/_recipe/published-recipes')
  const res = await rollbackRecipe(code, version)
  ok(`rolled back ${res.code} → published v${res.version}`)
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2)
  switch (cmd) {
    case 'structures': return cmdStructures()
    case 'validate': return cmdValidate(args[0])
    case 'caps': return cmdCaps()
    case 'preview': return cmdPreview(args)
    case 'template:publish': return cmdPublish(args)
    case 'template:versions': return cmdVersions(args)
    case 'template:rollback': return cmdRollback(args)
    default:
      console.log('reelflow CLI — commands:\n  structures | validate <recipe.ts> | caps\n  preview <recipe.ts> [--input f.json] [--out f.json] [--max-images N]\n  template:publish <recipe.ts> [--changelog "..."] | template:versions <code> | template:rollback <code> <version>')
      if (cmd) process.exitCode = 1
  }
}

main().catch((e) => { fail(e instanceof Error ? e.message : String(e)); process.exit(1) })
