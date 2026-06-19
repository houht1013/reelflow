import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/admin/reelflow/templates/$id')({
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
            status?: string
            recommended?: boolean
            featuredOrder?: number
            visibility?: string
            updatedAt: Date
          } = { updatedAt: new Date() }
          if (typeof body.status === 'string' && ['draft', 'published', 'archived'].includes(body.status)) {
            update.status = body.status
          }
          if (typeof body.recommended === 'boolean') update.recommended = body.recommended
          if (typeof body.featuredOrder === 'number') update.featuredOrder = body.featuredOrder
          if (typeof body.visibility === 'string' && ['public', 'private'].includes(body.visibility)) {
            update.visibility = body.visibility
          }

          if (Object.keys(update).length === 1) {
            return Response.json({ error: 'No valid fields to update' }, { status: 400 })
          }

          const { db } = await import('@libs/database')
          const { template } = await import('@libs/database/schema')
          const { eq } = await import('drizzle-orm')

          const [updated] = await db
            .update(template)
            .set(update)
            .where(eq(template.id, params.id))
            .returning({
              id: template.id,
              status: template.status,
              recommended: template.recommended,
              featuredOrder: template.featuredOrder,
              visibility: template.visibility,
              updatedAt: template.updatedAt,
            })

          if (!updated) return Response.json({ error: 'Template not found' }, { status: 404 })
          return Response.json({ template: updated })
        } catch (error) {
          console.error('Error updating Reelflow template:', error)
          return Response.json({ error: 'Failed to update template' }, { status: 500 })
        }
      }),
    },
  },
})
