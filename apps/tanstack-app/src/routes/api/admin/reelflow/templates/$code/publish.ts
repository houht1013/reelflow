import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/admin/reelflow/templates/$code/publish')({
  server: {
    handlers: {
      POST: withCfDb(async ({ request, params }: { request: Request; params: { code: string } }) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const body = await request.json().catch(() => null)
          const publish = body?.publish !== false // default true

          const { setTemplatePublished, TemplateFileError } = await import('@libs/reelflow/templates/template-files')
          try {
            const result = await setTemplatePublished(params.code, publish)
            return Response.json(result)
          } catch (error) {
            if (error instanceof TemplateFileError) return Response.json({ error: error.message }, { status: 400 })
            throw error
          }
        } catch (error) {
          console.error('Error publishing template:', error)
          return Response.json({ error: 'Failed to publish template' }, { status: 500 })
        }
      }),
    },
  },
})
