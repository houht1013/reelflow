import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/admin/reelflow/templates/$code/preview')({
  server: {
    handlers: {
      // Admin debug run: create a real job for the (possibly unpublished/draft)
      // template and enqueue it. The worker resolves dynamic code via the loader.
      POST: withCfDb(async ({ request, params }: { request: Request; params: { code: string } }) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const { auth } = await import('@libs/auth')
          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const body = await request.json().catch(() => null)
          const inputParams = body && typeof body.inputParams === 'object' && !Array.isArray(body.inputParams) ? body.inputParams : {}

          const { getDefaultWorkspaceForUser } = await import('@libs/reelflow/workspaces')
          const workspace = await getDefaultWorkspaceForUser(session.user.id)
          if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 409 })

          // Make sure a DB row exists (draft) so the job can reference it.
          const { syncTemplateRow } = await import('@libs/reelflow/templates/template-files')
          await syncTemplateRow(params.code).catch(() => {})

          const { createReelflowJob } = await import('@libs/reelflow/jobs')
          const { enqueueReelflowJob } = await import('@libs/reelflow/task-queue')
          const result = await createReelflowJob({
            workspaceId: workspace.id,
            userId: session.user.id,
            templateCode: params.code,
            inputParams,
            renderMp4Requested: Boolean(body?.renderMp4Requested),
            allowUnpublished: true,
          })
          enqueueReelflowJob(result.jobId)
          return Response.json({ jobId: result.jobId, estimatedCredits: result.estimatedCredits }, { status: 201 })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to start debug run'
          console.error('Error starting template debug run:', error)
          const status = message.includes('Insufficient credits') ? 402 : 400
          return Response.json({ error: message }, { status })
        }
      }),
    },
  },
})
