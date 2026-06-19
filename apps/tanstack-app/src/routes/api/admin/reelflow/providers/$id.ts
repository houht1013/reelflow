import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/admin/reelflow/providers/$id')({
  server: {
    handlers: {
      PATCH: withCfDb(async ({ request, params }: { request: Request; params: { id: string } }) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const body = await request.json().catch(() => null)
          if (!body || typeof body !== 'object') {
            return Response.json({ error: 'Invalid request body' }, { status: 400 })
          }

          const update: {
            enabled?: boolean
            priority?: number
            updatedAt: Date
          } = { updatedAt: new Date() }
          if (typeof body.enabled === 'boolean') update.enabled = body.enabled
          if (typeof body.priority === 'number') update.priority = body.priority

          if (Object.keys(update).length === 1) {
            return Response.json({ error: 'No valid fields to update' }, { status: 400 })
          }

          const { db } = await import('@libs/database')
          const { providerProfile } = await import('@libs/database/schema')
          const { eq } = await import('drizzle-orm')

          const [updated] = await db
            .update(providerProfile)
            .set(update)
            .where(eq(providerProfile.id, params.id))
            .returning({
              id: providerProfile.id,
              enabled: providerProfile.enabled,
              priority: providerProfile.priority,
              updatedAt: providerProfile.updatedAt,
            })

          if (!updated) return Response.json({ error: 'Provider not found' }, { status: 404 })
          return Response.json({ provider: updated })
        } catch (error) {
          console.error('Error updating Reelflow provider:', error)
          return Response.json({ error: 'Failed to update provider' }, { status: 500 })
        }
      }),
    },
  },
})
