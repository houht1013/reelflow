import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/reelflow/jobs/$id')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request, params }: { request: Request; params: { id: string } }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { db } = await import('@libs/database')
          const { asset, job, jobEvent, jobQualityIssue, jobStage, template, usageRecord } = await import('@libs/database/schema')
          const { getDefaultWorkspaceForUser } = await import('@libs/reelflow/workspaces')
          const { asc, desc, eq } = await import('drizzle-orm')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const workspace = await getDefaultWorkspaceForUser(session.user.id)
          if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 409 })

          const [detail] = await db
            .select({
              id: job.id,
              workspaceId: job.workspaceId,
              templateId: job.templateId,
              templateCode: template.code,
              templateName: template.name,
              status: job.status,
              qualityStatus: job.qualityStatus,
              priority: job.priority,
              inputParams: job.inputParams,
              normalizedParams: job.normalizedParams,
              estimatedCredits: job.estimatedCredits,
              frozenCredits: job.frozenCredits,
              actualCredits: job.actualCredits,
              debtCredits: job.debtCredits,
              settlementStatus: job.settlementStatus,
              artifactStatus: job.artifactStatus,
              renderMp4Requested: job.renderMp4Requested,
              lockedBy: job.lockedBy,
              lockedAt: job.lockedAt,
              attemptCount: job.attemptCount,
              lastErrorCode: job.lastErrorCode,
              lastErrorMessage: job.lastErrorMessage,
              startedAt: job.startedAt,
              completedAt: job.completedAt,
              createdAt: job.createdAt,
              updatedAt: job.updatedAt,
            })
            .from(job)
            .innerJoin(template, eq(job.templateId, template.id))
            .where(eq(job.id, params.id))
            .limit(1)

          if (!detail || detail.workspaceId !== workspace.id) {
            return Response.json({ error: 'Job not found' }, { status: 404 })
          }

          const stages = await db
            .select({
              id: jobStage.id,
              stageCode: jobStage.stageCode,
              status: jobStage.status,
              sortOrder: jobStage.sortOrder,
              attemptCount: jobStage.attemptCount,
              inputSnapshot: jobStage.inputSnapshot,
              outputSnapshot: jobStage.outputSnapshot,
              startedAt: jobStage.startedAt,
              completedAt: jobStage.completedAt,
              errorCode: jobStage.errorCode,
              errorMessage: jobStage.errorMessage,
              createdAt: jobStage.createdAt,
              updatedAt: jobStage.updatedAt,
            })
            .from(jobStage)
            .where(eq(jobStage.jobId, detail.id))
            .orderBy(asc(jobStage.sortOrder))

          const events = await db
            .select({
              id: jobEvent.id,
              stageId: jobEvent.stageId,
              level: jobEvent.level,
              eventType: jobEvent.eventType,
              message: jobEvent.message,
              data: jobEvent.data,
              createdAt: jobEvent.createdAt,
            })
            .from(jobEvent)
            .where(eq(jobEvent.jobId, detail.id))
            .orderBy(desc(jobEvent.createdAt))
            .limit(100)

          const qualityIssues = await db
            .select({
              id: jobQualityIssue.id,
              stageId: jobQualityIssue.stageId,
              assetId: jobQualityIssue.assetId,
              issueType: jobQualityIssue.issueType,
              severity: jobQualityIssue.severity,
              status: jobQualityIssue.status,
              message: jobQualityIssue.message,
              createdAt: jobQualityIssue.createdAt,
              updatedAt: jobQualityIssue.updatedAt,
            })
            .from(jobQualityIssue)
            .where(eq(jobQualityIssue.jobId, detail.id))
            .orderBy(desc(jobQualityIssue.createdAt))

          const assets = await db
            .select({
              id: asset.id,
              stageId: asset.stageId,
              assetType: asset.assetType,
              sourceType: asset.sourceType,
              storageProvider: asset.storageProvider,
              storageKey: asset.storageKey,
              url: asset.url,
              mimeType: asset.mimeType,
              fileSize: asset.fileSize,
              durationMs: asset.durationMs,
              width: asset.width,
              height: asset.height,
              status: asset.status,
              visibility: asset.visibility,
              metadata: asset.metadata,
              createdAt: asset.createdAt,
            })
            .from(asset)
            .where(eq(asset.jobId, detail.id))
            .orderBy(asc(asset.createdAt))

          const usageRecords = await db
            .select({
              id: usageRecord.id,
              stageId: usageRecord.stageId,
              assetId: usageRecord.assetId,
              resourceType: usageRecord.resourceType,
              provider: usageRecord.provider,
              model: usageRecord.model,
              usageAmount: usageRecord.usageAmount,
              usageUnit: usageRecord.usageUnit,
              providerCostAmount: usageRecord.providerCostAmount,
              providerCostCurrency: usageRecord.providerCostCurrency,
              creditCost: usageRecord.creditCost,
              createdAt: usageRecord.createdAt,
            })
            .from(usageRecord)
            .where(eq(usageRecord.jobId, detail.id))
            .orderBy(asc(usageRecord.createdAt))

          const completedStages = stages.filter((stage) => stage.status === 'completed' || stage.status === 'skipped').length
          const progress = stages.length > 0 ? Math.round((completedStages / stages.length) * 100) : 0

          return Response.json({
            job: detail,
            stages,
            events,
            qualityIssues,
            assets,
            usageRecords,
            progress,
          })
        } catch (error) {
          console.error('Error fetching Reelflow job detail:', error)
          return Response.json({ error: 'Failed to fetch job detail' }, { status: 500 })
        }
      }),
    },
  },
})
