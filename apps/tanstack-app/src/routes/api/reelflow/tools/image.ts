import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

const PROVIDER_CALL_STATUS: Record<string, number> = {
  invalid_input: 400,
  insufficient_credits: 402,
  provider_unconfigured: 503,
  generation_failed: 500,
}

export const Route = createFileRoute('/api/reelflow/tools/image')({
  server: {
    handlers: {
      POST: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { getDefaultWorkspaceForUser } = await import('@libs/reelflow/workspaces')
          const { generateReelflowImage } = await import('@libs/reelflow/image-gen')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const workspace = await getDefaultWorkspaceForUser(session.user.id)
          if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 409 })

          const body = await request.json().catch(() => null)
          if (!body || typeof body !== 'object') {
            return Response.json({ error: 'Invalid request body' }, { status: 400 })
          }

          const record = body as Record<string, unknown>
          const quality = text(record.quality)
          const result = await generateReelflowImage({
            workspaceId: workspace.id,
            userId: session.user.id,
            prompt: text(record.prompt),
            size: text(record.size) || undefined,
            quality: ['low', 'medium', 'high', 'auto'].includes(quality)
              ? (quality as 'low' | 'medium' | 'high' | 'auto')
              : undefined,
            billing: 'charge',
          })

          return Response.json({ success: true, data: result })
        } catch (error) {
          const { ProviderCallError } = await import('@libs/reelflow/provider-runtime')
          if (error instanceof ProviderCallError) {
            const status = PROVIDER_CALL_STATUS[error.code] ?? error.status
            return Response.json({ error: error.code, message: error.message, details: error.details }, { status })
          }

          console.error('Error generating Reelflow image asset:', error)
          return Response.json({ error: 'generation_failed', message: 'Failed to generate image' }, { status: 500 })
        }
      }),
    },
  },
})
