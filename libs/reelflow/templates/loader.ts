// Runtime template loader (the "B" model): resolve a template by code from the
// built-in registry first, then — if dynamic loading is enabled — by importing
// template .ts files from a trusted directory AT RUNTIME via jiti. Dropping a
// file in (or editing one) takes effect without a rebuild/redeploy; freshness is
// keyed by file mtime so unchanged files are not re-evaluated.
//
// SECURITY: only files inside the configured dynamicDir are loaded. This dir must
// hold trusted, agent/admin-authored code only — never execute untrusted code.
import { createJiti } from 'jiti';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { reelflowConfig } from '@config';
import { getTemplate, listTemplates } from './registry';
import type { ReelflowTemplate } from './_sdk/types';

// Monorepo root: the app may run with cwd=apps/tanstack-app, so walk up from cwd
// until we find libs/reelflow. This anchors jiti aliases (@libs/@config) and the
// dynamic templates dir to the real repo root regardless of the process cwd.
function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    if (fs.existsSync(path.join(dir, 'libs', 'reelflow'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}
const root = findRepoRoot();

// jiti resolves a dynamic template's imports: real packages (zod, …) from
// node_modules, and our project aliases (@config / @libs/*) to the on-disk
// source so `import { defineTemplate } from '@libs/reelflow/templates/_sdk/types'`
// works at runtime.
let _jiti: ReturnType<typeof createJiti> | null = null;
function jiti() {
  if (!_jiti) {
    _jiti = createJiti(path.join(root, 'reelflow-template-loader.ts'), {
      alias: { '@config': path.join(root, 'config'), '@libs': path.join(root, 'libs') },
      moduleCache: false,
      fsCache: false,
    });
  }
  return _jiti;
}

type CacheEntry = { template: ReelflowTemplate<unknown>; mtimeMs: number };
const cache = new Map<string, CacheEntry>(); // keyed by absolute file path

function dynamicDirAbs(): string {
  const dir = reelflowConfig.templates.dynamicDir;
  return path.isAbsolute(dir) ? dir : path.join(root, dir);
}

/** Each template = `<dir>/<name>/index.{ts,js}` or `<dir>/<name>.{ts,js}` (skips _-prefixed). */
function listTemplateFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) {
      for (const f of ['index.ts', 'index.js', 'index.mjs']) {
        const p = path.join(dir, entry.name, f);
        if (fs.existsSync(p)) { files.push(p); break; }
      }
    } else if (entry.isFile() && /\.(ts|js|mjs)$/.test(entry.name)) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function isTemplate(value: unknown): value is ReelflowTemplate<unknown> {
  const t = value as Partial<ReelflowTemplate<unknown>> | null;
  return Boolean(t && typeof t.code === 'string' && typeof t.run === 'function' && (t.schema as unknown));
}

async function loadFile(file: string): Promise<ReelflowTemplate<unknown> | undefined> {
  const { mtimeMs } = fs.statSync(file);
  const cached = cache.get(file);
  if (cached && cached.mtimeMs === mtimeMs) return cached.template;
  const mod = (await jiti().import(file)) as { default?: unknown };
  const exported = mod?.default ?? mod;
  if (!isTemplate(exported)) return undefined;
  cache.set(file, { template: exported, mtimeMs });
  return exported;
}

/** Load a template module from an absolute path (fresh import, for validation). */
export async function loadTemplateFromPath(file: string): Promise<ReelflowTemplate<unknown> | undefined> {
  const mod = (await jiti().import(file)) as { default?: unknown };
  const exported = mod?.default ?? mod;
  return isTemplate(exported) ? exported : undefined;
}

/** Absolute path of the dynamic templates directory. */
export function dynamicTemplatesDir(): string {
  return dynamicDirAbs();
}

/** Resolve a template by code: built-in registry first, then dynamic dir. */
export async function resolveTemplate(code: string): Promise<ReelflowTemplate<unknown> | undefined> {
  const builtin = getTemplate(code);
  if (builtin) return builtin;
  if (!reelflowConfig.templates.dynamicEnabled) return undefined;
  for (const file of listTemplateFiles(dynamicDirAbs())) {
    const template = await loadFile(file).catch(() => undefined);
    if (template?.code === code) return template;
  }
  return undefined;
}

/** All resolvable templates (built-in + dynamic). Dynamic overrides are ignored
 *  for codes already provided by the built-in registry. */
export async function listAllTemplates(): Promise<ReelflowTemplate<unknown>[]> {
  const all = new Map<string, ReelflowTemplate<unknown>>();
  for (const t of listTemplates()) all.set(t.code, t);
  if (reelflowConfig.templates.dynamicEnabled) {
    for (const file of listTemplateFiles(dynamicDirAbs())) {
      const t = await loadFile(file).catch(() => undefined);
      if (t && !all.has(t.code)) all.set(t.code, t);
    }
  }
  return [...all.values()];
}
