import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export const Route = createFileRoute('/api/reelflow/tools/voice')({
  server: {
    handlers: {
      POST: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { getDefaultWorkspaceForUser } = await import('@libs/reelflow/workspaces')
          const { generateReelflowVoiceAsset } = await import('@libs/reelflow/tools')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const workspace = await getDefaultWorkspaceForUser(session.user.id)
          if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 409 })

          const body = await request.json().catch(() => null)
          if (!body || typeof body !== 'object') {
            return Response.json({ error: 'Invalid request body' }, { status: 400 })
          }

          const record = body as Record<string, unknown>
          const result = await generateReelflowVoiceAsset({
            workspaceId: workspace.id,
            userId: session.user.id,
            text: text(record.text),
            voice: text(record.voice) || undefined,
            provider: text(record.provider) || undefined,
            model: text(record.model) || undefined,
            speed: numberValue(record.speed),
          })

          return Response.json({ success: true, data: result })
        } catch (error) {
          const { ToolExecutionError } = await import('@libs/reelflow/tools')
          if (error instanceof ToolExecutionError) {
            return Response.json({ error: error.code, message: error.message, details: error.details }, { status: error.status })
          }

          console.error('Error generating Reelflow voice asset:', error)
          return Response.json({ error: 'generation_failed', message: 'Failed to generate voice' }, { status: 500 })
        }
      }),
    },
  },
})
