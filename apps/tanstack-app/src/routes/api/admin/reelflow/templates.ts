import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/admin/reelflow/templates')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }: { request: Request }) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const { listAllTemplates } = await import('@libs/reelflow/templates/loader')
          const { listTemplates } = await import('@libs/reelflow/templates/registry')
          const { db } = await import('@libs/database')
          const { template } = await import('@libs/database/schema')

          const all = await listAllTemplates()
          const builtinCodes = new Set(listTemplates().map((t) => t.code))
          const rows = await db.select({ code: template.code, status: template.status, visibility: template.visibility, builderVersion: template.builderVersion }).from(template)
          const byCode = new Map(rows.map((r) => [r.code, r]))

          const templates = all.map((t) => {
            const row = byCode.get(t.code)
            return {
              code: t.code,
              name: t.name,
              category: t.category,
              version: t.version,
              fields: t.fields.length,
              outputs: t.outputs?.length ?? 0,
              source: builtinCodes.has(t.code) ? 'builtin' : 'dynamic',
              status: row?.status ?? 'unpublished',
              visibility: row?.visibility ?? null,
              dbVersion: row?.builderVersion ?? null,
            }
          })
          return Response.json({ templates })
        } catch (error) {
          console.error('Error listing Reelflow templates:', error)
          return Response.json({ error: 'Failed to list templates' }, { status: 500 })
        }
      }),
    },
  },
})
