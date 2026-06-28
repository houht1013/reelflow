import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/reelflow/jobs/$id/cancel')({
  server: {
    handlers: {
      POST: withCfDb(async ({ request, params }: { request: Request; params: { id: string } }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { cancelReelflowJob } = await import('@libs/reelflow/jobs')
          const { getDefaultWorkspaceForUser } = await import('@libs/reelflow/workspaces')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const workspace = await getDefaultWorkspaceForUser(session.user.id)
          if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 409 })

          const result = await cancelReelflowJob({
            workspaceId: workspace.id,
            userId: session.user.id,
            jobId: params.id,
          })

          if (!result.canceled) {
            return Response.json({ error: '任务当前状态不可结束' }, { status: 409 })
          }
          return Response.json(result)
        } catch (error) {
          console.error('Error canceling Reelflow job:', error)
          const message = error instanceof Error ? error.message : 'Failed to cancel job'
          const status = message.includes('not found') ? 404 : 400
          return Response.json({ error: message }, { status })
        }
      }),
    },
  },
})
