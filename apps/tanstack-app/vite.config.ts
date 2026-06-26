import { config as dotenvConfig } from 'dotenv'
import path from 'node:path'

// Load local overrides first (.env.local wins), then base .env. dotenv does not
// overwrite already-set vars, so .env.local takes precedence over .env.
dotenvConfig({ path: path.resolve(__dirname, '../../.env.local') })
dotenvConfig({ path: path.resolve(__dirname, '../../.env') })

// Resolve SQLITE_DB_PATH to absolute — relative paths are resolved against monorepo root
const rootDir = path.resolve(__dirname, '../..')
process.env.SQLITE_DB_PATH = path.resolve(rootDir, process.env.SQLITE_DB_PATH || './data/local.sqlite')

import { defineConfig, type PluginOption } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'

const isCfDeploy = !!process.env.CF_DEPLOY

async function getCfPlugin(): Promise<PluginOption[]> {
  if (!isCfDeploy) return []
  const { cloudflare } = await import('@cloudflare/vite-plugin')
  return [cloudflare({ viteEnvironment: { name: 'ssr' } })]
}

const cfPlugin = await getCfPlugin()

export default defineConfig({
  server: {
    port: 7001,
  },
  plugins: [
    ...cfPlugin,
    tailwindcss(),
    tsconfigPaths(),
    svgr({ svgrOptions: { icon: true }, include: '**/*.svg' }),
    tanstackStart(),
    viteReact(),
  ],
  environments: isCfDeploy
    ? {
        ssr: {
          optimizeDeps: {
            include: [
              'react',
              'react-dom',
              'react-dom/server',
              'react/jsx-runtime',
              'react/jsx-dev-runtime',
              'sonner',
              'drizzle-orm',
              'drizzle-orm/node-postgres',
              'drizzle-orm/better-sqlite3',
              'drizzle-orm/d1',
              'drizzle-orm/pg-core',
              'drizzle-orm/sqlite-core',
              'better-sqlite3',
              'pg',
              'nanoid',
              'stripe',
              'zod',
            ],
          },
        },
      }
    : undefined,
  ssr: {
    noExternal: ['streamdown', 'katex', 'rehype-katex'],
  },
})
