import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/admin/reelflow/templates/$code/validate')({
  server: {
    handlers: {
      POST: withCfDb(async ({ request, params }: { request: Request; params: { code: string } }) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const { validateTemplateFile } = await import('@libs/reelflow/templates/template-files')
          return Response.json(await validateTemplateFile(params.code))
        } catch (error) {
          console.error('Error validating template:', error)
          return Response.json({ error: 'Failed to validate template' }, { status: 500 })
        }
      }),
    },
  },
})
