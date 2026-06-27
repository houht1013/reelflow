/**
 * reelflow — developer CLI for the high-code video-template toolchain (agent-facing).
 * Driven by Claude Code / Codex via the Skill. Run from repo root:
 *   tsx scripts/reelflow.ts <command> [args]   (or: pnpm reelflow <command>)
 *
 * Commands:
 *   templates                  List resolvable templates (built-in + dynamic dir).
 *   validate <template.ts>     Import a template module (default export) and check the contract.
 *   caps                       Probe capcut-mate capability enumerations.
 */
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { config as loadEnv } from 'dotenv'

// Load local env (.env.local) so DB + providers are available.
if (existsSync('.env.local')) loadEnv({ path: '.env.local' })

const CAPCUT_BASE = process.env.CAPCUT_MATE_BASE_URL || 'http://localhost:30000'
const CAPCUT_PREFIX = '/openapi/capcut-mate/v1'

function ok(msg: string) { console.log(`\x1b[32m✓\x1b[0m ${msg}`) }
function fail(msg: string) { console.error(`\x1b[31m✗\x1b[0m ${msg}`) }

async function cmdTemplates() {
  const { listAllTemplates } = await import('../libs/reelflow/templates/loader')
  const templates = await listAllTemplates()
  console.log(`Resolvable templates (${templates.length}):`)
  for (const t of templates) {
    console.log(`  - ${t.code}  v${t.version}  ${t.name}  [${t.category}]  fields=${t.fields.length} outputs=${(t.outputs?.length ?? 0)}`)
  }
}

async function cmdValidate(file?: string) {
  if (!file) { fail('usage: validate <path-to-template.ts>'); process.exitCode = 1; return }
  let mod: { default?: unknown }
  try {
    mod = await import(pathToFileURL(resolve(process.cwd(), file)).href)
  } catch (e) {
    fail(`cannot import ${file}: ${e instanceof Error ? e.message : e}`); process.exitCode = 1; return
  }
  const t = mod.default as Record<string, unknown> | undefined
  if (!t) { fail('module has no default export (expected a ReelflowTemplate from defineTemplate)'); process.exitCode = 1; return }

  const errors: string[] = []
  for (const k of ['code', 'name', 'description', 'category', 'version'] as const) {
    if (!t[k] || typeof t[k] !== 'string') errors.push(`missing/invalid string field: ${k}`)
  }
  if (typeof t.run !== 'function') errors.push('missing run(ctx, input) function')
  if (typeof t.estimate !== 'function') errors.push('missing estimate(input) function')
  if (!t.schema) errors.push('missing zod schema')
  if (!Array.isArray(t.fields)) errors.push('fields must be an array (input metadata)')
  if (!Array.isArray(t.stages) || (t.stages as unknown[]).length === 0) errors.push('stages must be a non-empty array')

  if (errors.length) {
    fail(`template "${(t.code as string) ?? '?'}" invalid:`)
    for (const e of errors) console.error(`    - ${e}`)
    process.exitCode = 1
  } else {
    ok(`template "${t.code}" v${t.version} (${(t.fields as unknown[]).length} fields, ${((t.outputs as unknown[])?.length ?? 0)} outputs) is valid`)
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
    case 'templates': return cmdTemplates()
    case 'validate': return cmdValidate(args[0])
    case 'caps': return cmdCaps()
    default:
      console.log('reelflow CLI — commands:\n  templates | validate <template.ts> | caps')
      if (cmd) process.exitCode = 1
  }
}

main().catch((e) => { fail(e instanceof Error ? e.message : String(e)); process.exit(1) })
