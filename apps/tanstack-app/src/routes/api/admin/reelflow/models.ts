import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/admin/reelflow/models')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }: { request: Request }) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const category = new URL(request.url).searchParams.get('category') || undefined
          const { listModels } = await import('@libs/reelflow/models')
          return Response.json({ models: await listModels(category as never) })
        } catch (error) {
          console.error('Error listing AI models:', error)
          return Response.json({ error: 'Failed to list models' }, { status: 500 })
        }
      }),

      POST: withCfDb(async ({ request }: { request: Request }) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const body = await request.json().catch(() => null)
          if (!body || typeof body !== 'object') return Response.json({ error: 'Invalid request body' }, { status: 400 })
          for (const k of ['category', 'code', 'displayName', 'provider', 'protocol'] as const) {
            if (!body[k] || typeof body[k] !== 'string') return Response.json({ error: `Missing field: ${k}` }, { status: 400 })
          }
          const { createModel } = await import('@libs/reelflow/models')
          const model = await createModel(body)
          return Response.json({ model }, { status: 201 })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create model'
          console.error('Error creating AI model:', error)
          return Response.json({ error: message }, { status: 500 })
        }
      }),
    },
  },
})
