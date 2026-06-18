# TanStack Start — Cloudflare Workers Notes

Known pitfalls and constraints when running TanStack Start on Cloudflare Workers.

## Verification commands

| Command | What it checks |
|---------|---------------|
| `pnpm dev:cf` | Local dev with `@cloudflare/vite-plugin` (workerd SSR) |
| `pnpm preview:cf` | Full build + `wrangler dev` (closest to production) |
| `pnpm build` | Production build (CF_DEPLOY=1 enabled by default) |

## Known pitfalls

### 1. Duplicate React instances → "Invalid hook call"

**Symptom:** `TypeError: Cannot read properties of null (reading 'useContext')` during SSR.

**Root cause:** Vite's SSR dependency scanner fails, so dependencies are discovered on-demand
and React ends up in multiple chunks. Each chunk has its own `ReactSharedInternals`, so hooks
registered by `react-dom/server` are invisible to components loaded from other chunks.

**Common triggers:**
- Importing a module that doesn't exist (e.g., `vinxi/http` — removed in TanStack Start 1.x).
  This crashes the entire dep scan: `Failed to run dependency scan. Skipping dependency pre-bundling.`
- `vite-tsconfig-paths` v6 has a bug where it doesn't follow path aliases during the dep scan
  ([workers-sdk#11825](https://github.com/cloudflare/workers-sdk/issues/11825)).
  **Fix:** Pin `vite-tsconfig-paths` to v5.1.4.

### 2. `require is not defined`

**Symptom:** Runtime error in Workers/workerd because `require()` is CJS-only.

**Rule:** Never use `require()` in any code reachable from the TanStack app.
Use `await import()` for dynamic imports or static `import` for everything else.

### 3. Accessing Cloudflare bindings (D1, KV, R2, etc.)

**Correct way (TanStack Start ≥ 1.x without Vinxi):**
```ts
import { env } from 'cloudflare:workers'
const db = env.DB  // D1 binding
```

**Wrong way (legacy — will crash dependency scan):**
```ts
import { getEvent } from 'vinxi/http'  // ❌ vinxi is removed
```

`cloudflare:workers` is a virtual module handled by `@cloudflare/vite-plugin` in dev
and by the workerd runtime in production. It does not need installation.

### 4. Native Node.js modules

Packages like `better-sqlite3` and `pg` contain native C++ addons that cannot run in Workers.
They must be tree-shaken out of the CF build. The current architecture uses `getDialect()`
guards so that only the D1 code path is included when `DB_DIALECT=d1`.

Do **not** add these to `ssr.external` — it conflicts with `@cloudflare/vite-plugin`'s
bundling strategy and causes build failures.

### 5. Plugin order in vite.config.ts

`cloudflare()` must be the **first** plugin in the `plugins` array.
