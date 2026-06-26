import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/reelflow/jobs/$id/rerun')({
  server: {
    handlers: {
      POST: withCfDb(async ({ request, params }: { request: Request; params: { id: string } }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { rerunReelflowJob } = await import('@libs/reelflow/jobs')
          const { getDefaultWorkspaceForUser } = await import('@libs/reelflow/workspaces')
          const { enqueueReelflowJob } = await import('@libs/reelflow/task-queue')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const workspace = await getDefaultWorkspaceForUser(session.user.id)
          if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 409 })

          const result = await rerunReelflowJob({
            workspaceId: workspace.id,
            userId: session.user.id,
            jobId: params.id,
          })

          enqueueReelflowJob(result.jobId)

          return Response.json(result, { status: 201 })
        } catch (error) {
          console.error('Error rerunning Reelflow job:', error)
          if (error && typeof error === 'object' && (error as { name?: string }).name === 'ReelflowPreflightError') {
            const result = (error as { result?: unknown }).result
            return Response.json({ error: 'Reelflow preflight failed', preflight: result }, { status: 409 })
          }
          const message = error instanceof Error ? error.message : 'Failed to rerun job'
          const status = message.includes('Insufficient credits') ? 402 : message.includes('not found') ? 404 : 400
          return Response.json({ error: message }, { status })
        }
      }),
    },
  },
})
