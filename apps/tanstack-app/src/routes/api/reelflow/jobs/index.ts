import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/reelflow/jobs/')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { db } = await import('@libs/database')
          const { job, template } = await import('@libs/database/schema')
          const { getDefaultWorkspaceForUser } = await import('@libs/reelflow/workspaces')
          const { desc, eq, sql } = await import('drizzle-orm')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const workspace = await getDefaultWorkspaceForUser(session.user.id)
          if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 409 })

          const url = new URL(request.url)
          const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1)
          const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10), 1), 100)
          const offset = (page - 1) * limit

          const totalResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(job)
            .where(eq(job.workspaceId, workspace.id))
          const total = totalResult[0]?.count || 0

          const jobs = await db
            .select({
              id: job.id,
              templateCode: template.code,
              templateName: template.name,
              category: template.category,
              status: job.status,
              qualityStatus: job.qualityStatus,
              estimatedCredits: job.estimatedCredits,
              frozenCredits: job.frozenCredits,
              actualCredits: job.actualCredits,
              debtCredits: job.debtCredits,
              settlementStatus: job.settlementStatus,
              artifactStatus: job.artifactStatus,
              renderMp4Requested: job.renderMp4Requested,
              lastErrorCode: job.lastErrorCode,
              lastErrorMessage: job.lastErrorMessage,
              startedAt: job.startedAt,
              completedAt: job.completedAt,
              createdAt: job.createdAt,
              updatedAt: job.updatedAt,
            })
            .from(job)
            .innerJoin(template, eq(job.templateId, template.id))
            .where(eq(job.workspaceId, workspace.id))
            .orderBy(desc(job.createdAt))
            .limit(limit)
            .offset(offset)

          return Response.json({ jobs, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) })
        } catch (error) {
          console.error('Error fetching Reelflow jobs:', error)
          return Response.json({ error: 'Failed to fetch jobs' }, { status: 500 })
        }
      }),

      POST: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { createReelflowJob } = await import('@libs/reelflow/jobs')
          const { getDefaultWorkspaceForUser } = await import('@libs/reelflow/workspaces')
          const { enqueueReelflowJob, recoverQueuedJobs } = await import('@libs/reelflow/task-queue')

          // First request after a server start re-enqueues any leftover queued jobs.
          void recoverQueuedJobs()

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const body = await request.json().catch(() => null)
          if (!body || typeof body !== 'object') {
            return Response.json({ error: 'Invalid request body' }, { status: 400 })
          }

          const templateCode = typeof body.templateCode === 'string' ? body.templateCode : ''
          const inputParams = body.inputParams && typeof body.inputParams === 'object' && !Array.isArray(body.inputParams)
            ? body.inputParams as Record<string, unknown>
            : null

          if (!templateCode) return Response.json({ error: 'Template code is required' }, { status: 400 })
          if (!inputParams) return Response.json({ error: 'Input params must be an object' }, { status: 400 })

          const workspace = await getDefaultWorkspaceForUser(session.user.id)
          if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 409 })

          const result = await createReelflowJob({
            workspaceId: workspace.id,
            userId: session.user.id,
            templateCode,
            inputParams,
            renderMp4Requested: Boolean(body.renderMp4Requested),
          })

          // Hand the freshly-frozen job to the in-process queue (non-blocking).
          enqueueReelflowJob(result.jobId)

          return Response.json(result, { status: 201 })
        } catch (error) {
          console.error('Error creating Reelflow job:', error)
          if (error && typeof error === 'object' && (error as { name?: string }).name === 'ReelflowPreflightError') {
            const result = (error as { result?: unknown }).result
            return Response.json({ error: 'Reelflow preflight failed', preflight: result }, { status: 409 })
          }
          const message = error instanceof Error ? error.message : 'Failed to create job'
          const status = message.includes('Insufficient credits') ? 402 : 400
          return Response.json({ error: message }, { status })
        }
      }),
    },
  },
})
