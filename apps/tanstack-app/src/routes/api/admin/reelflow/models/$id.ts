import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/admin/reelflow/models/$id')({
  server: {
    handlers: {
      PATCH: withCfDb(async ({ request, params }: { request: Request; params: { id: string } }) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const body = await request.json().catch(() => null)
          if (!body || typeof body !== 'object') return Response.json({ error: 'Invalid request body' }, { status: 400 })

          const { updateModel } = await import('@libs/reelflow/models')
          const model = await updateModel(params.id, body)
          if (!model) return Response.json({ error: 'Model not found' }, { status: 404 })
          return Response.json({ model })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update model'
          console.error('Error updating AI model:', error)
          return Response.json({ error: message }, { status: 500 })
        }
      }),

      DELETE: withCfDb(async ({ request, params }: { request: Request; params: { id: string } }) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const { deleteModel } = await import('@libs/reelflow/models')
          await deleteModel(params.id)
          return Response.json({ ok: true })
        } catch (error) {
          console.error('Error deleting AI model:', error)
          return Response.json({ error: 'Failed to delete model' }, { status: 500 })
        }
      }),
    },
  },
})
