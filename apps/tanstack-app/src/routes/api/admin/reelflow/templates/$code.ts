import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/admin/reelflow/templates/$code')({
  server: {
    handlers: {
      // Read a template file for editing.
      GET: withCfDb(async ({ request, params }: { request: Request; params: { code: string } }) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const { readTemplateFile, TemplateFileError } = await import('@libs/reelflow/templates/template-files')
          try {
            return Response.json(readTemplateFile(params.code))
          } catch (error) {
            if (error instanceof TemplateFileError) {
              return Response.json({ error: error.message, code: error.code }, { status: error.code === 'not_found' ? 404 : 400 })
            }
            throw error
          }
        } catch (error) {
          console.error('Error reading template file:', error)
          return Response.json({ error: 'Failed to read template' }, { status: 500 })
        }
      }),

      // Save a dynamic template file (then jiti hot-loads it).
      PUT: withCfDb(async ({ request, params }: { request: Request; params: { code: string } }) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const body = await request.json().catch(() => null)
          const content = body && typeof body.content === 'string' ? body.content : null
          if (content == null) return Response.json({ error: 'content is required' }, { status: 400 })

          const { writeTemplateFile, validateTemplateFile, TemplateFileError } = await import('@libs/reelflow/templates/template-files')
          try {
            writeTemplateFile(params.code, content)
            const validation = await validateTemplateFile(params.code)
            return Response.json({ saved: true, validation })
          } catch (error) {
            if (error instanceof TemplateFileError) {
              return Response.json({ error: error.message, code: error.code }, { status: 400 })
            }
            throw error
          }
        } catch (error) {
          console.error('Error saving template file:', error)
          return Response.json({ error: 'Failed to save template' }, { status: 500 })
        }
      }),
    },
  },
})
