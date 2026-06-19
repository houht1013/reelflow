import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export const Route = createFileRoute('/api/reelflow/tools/image')({
  server: {
    handlers: {
      POST: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { getDefaultWorkspaceForUser } = await import('@libs/reelflow/workspaces')
          const { generateReelflowImageAsset } = await import('@libs/reelflow/tools')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const workspace = await getDefaultWorkspaceForUser(session.user.id)
          if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 409 })

          const body = await request.json().catch(() => null)
          if (!body || typeof body !== 'object') {
            return Response.json({ error: 'Invalid request body' }, { status: 400 })
          }

          const record = body as Record<string, unknown>
          const provider = text(record.provider) || 'qwen'
          if (!['qwen', 'fal', 'openai', 'gemini'].includes(provider)) {
            return Response.json({ error: 'Unsupported image provider' }, { status: 400 })
          }

          const result = await generateReelflowImageAsset({
            workspaceId: workspace.id,
            userId: session.user.id,
            prompt: text(record.prompt),
            provider: provider as 'qwen' | 'fal' | 'openai' | 'gemini',
            model: text(record.model) || undefined,
            negativePrompt: text(record.negativePrompt) || undefined,
            size: text(record.size) || undefined,
            aspectRatio: text(record.aspectRatio) || undefined,
            seed: numberValue(record.seed),
            promptExtend: typeof record.promptExtend === 'boolean' ? record.promptExtend : undefined,
            watermark: typeof record.watermark === 'boolean' ? record.watermark : undefined,
            numInferenceSteps: numberValue(record.numInferenceSteps),
            guidanceScale: numberValue(record.guidanceScale),
          })

          return Response.json({ success: true, data: result })
        } catch (error) {
          const { ToolExecutionError } = await import('@libs/reelflow/tools')
          if (error instanceof ToolExecutionError) {
            return Response.json({ error: error.code, message: error.message, details: error.details }, { status: error.status })
          }

          console.error('Error generating Reelflow image asset:', error)
          return Response.json({ error: 'generation_failed', message: 'Failed to generate image' }, { status: 500 })
        }
      }),
    },
  },
})
