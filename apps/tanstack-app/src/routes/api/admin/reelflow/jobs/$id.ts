import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/admin/reelflow/jobs/$id')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request, params }: { request: Request; params: { id: string } }) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const { db } = await import('@libs/database')
          const {
            asset,
            job,
            jobEvent,
            jobQualityIssue,
            jobStage,
            template,
            usageRecord,
            workspace,
          } = await import('@libs/database/schema')
          const { asc, desc, eq } = await import('drizzle-orm')

          const [detail] = await db
            .select({
              id: job.id,
              workspaceId: job.workspaceId,
              workspaceName: workspace.name,
              createdByUserId: job.createdByUserId,
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
            .innerJoin(workspace, eq(job.workspaceId, workspace.id))
            .where(eq(job.id, params.id))
            .limit(1)

          if (!detail) return Response.json({ error: 'Job not found' }, { status: 404 })

          const [stages, events, qualityIssues, assets, usageRecords] = await Promise.all([
            db
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
              .orderBy(asc(jobStage.sortOrder)),
            db
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
              .limit(200),
            db
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
              .orderBy(desc(jobQualityIssue.createdAt)),
            db
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
                status: asset.status,
                visibility: asset.visibility,
                metadata: asset.metadata,
                createdAt: asset.createdAt,
              })
              .from(asset)
              .where(eq(asset.jobId, detail.id))
              .orderBy(asc(asset.createdAt)),
            db
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
                pricingSnapshot: usageRecord.pricingSnapshot,
                rawUsage: usageRecord.rawUsage,
                createdAt: usageRecord.createdAt,
              })
              .from(usageRecord)
              .where(eq(usageRecord.jobId, detail.id))
              .orderBy(asc(usageRecord.createdAt)),
          ])

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
          console.error('Error fetching Reelflow admin job detail:', error)
          return Response.json({ error: 'Failed to fetch Reelflow admin job detail' }, { status: 500 })
        }
      }),
      PATCH: withCfDb(async ({ request, params }: { request: Request; params: { id: string } }) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const body = await request.json().catch(() => null)
          if (!body || typeof body !== 'object') {
            return Response.json({ error: 'Invalid request body' }, { status: 400 })
          }

          const priority = Number((body as { priority?: unknown }).priority)
          if (!Number.isInteger(priority) || priority < 0 || priority > 1000) {
            return Response.json({ error: 'Priority must be an integer from 0 to 1000' }, { status: 400 })
          }

          const { db } = await import('@libs/database')
          const { job, jobEvent } = await import('@libs/database/schema')
          const { eq } = await import('drizzle-orm')

          const [updated] = await db
            .update(job)
            .set({ priority, updatedAt: new Date() })
            .where(eq(job.id, params.id))
            .returning({
              id: job.id,
              priority: job.priority,
            })

          if (!updated) return Response.json({ error: 'Job not found' }, { status: 404 })

          await db.insert(jobEvent).values({
            id: crypto.randomUUID(),
            jobId: updated.id,
            level: 'info',
            eventType: 'job_priority_updated',
            message: `Admin updated job priority to ${priority}`,
            data: { priority },
            createdAt: new Date(),
          })

          return Response.json({ job: updated })
        } catch (error) {
          console.error('Error updating Reelflow admin job:', error)
          return Response.json({ error: 'Failed to update Reelflow job' }, { status: 500 })
        }
      }),
    },
  },
})
