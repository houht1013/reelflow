import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/reelflow/jobs/$id/download-draft')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request, params }: { request: Request; params: { id: string } }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { db } = await import('@libs/database')
          const { asset, job, jobStage, template, usageRecord } = await import('@libs/database/schema')
          const { getDefaultWorkspaceForUser } = await import('@libs/reelflow/workspaces')
          const { buildDraftPackageBuffer, getDraftPackageFileName } = await import('@libs/reelflow/draft-package')
          const { asc, eq } = await import('drizzle-orm')

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
              inputParams: job.inputParams,
              estimatedCredits: job.estimatedCredits,
              actualCredits: job.actualCredits,
              artifactStatus: job.artifactStatus,
              renderMp4Requested: job.renderMp4Requested,
              createdAt: job.createdAt,
              completedAt: job.completedAt,
            })
            .from(job)
            .innerJoin(template, eq(job.templateId, template.id))
            .where(eq(job.id, params.id))
            .limit(1)

          if (!detail || detail.workspaceId !== workspace.id) {
            return Response.json({ error: 'Job not found' }, { status: 404 })
          }

          if (detail.artifactStatus !== 'downloadable') {
            return Response.json({ error: 'Draft package is not downloadable' }, { status: 409 })
          }

          const assets = await db
            .select({
              id: asset.id,
              assetType: asset.assetType,
              storageProvider: asset.storageProvider,
              storageKey: asset.storageKey,
              url: asset.url,
              mimeType: asset.mimeType,
              status: asset.status,
              metadata: asset.metadata,
            })
            .from(asset)
            .where(eq(asset.jobId, detail.id))
            .orderBy(asc(asset.createdAt))

          const draftAsset = assets.find((item) => item.assetType === 'draft_package')
          if (!draftAsset || draftAsset.status !== 'available') {
            return Response.json({ error: 'Draft package asset is not available' }, { status: 409 })
          }

          // Template jobs deliver a remote CapCut draft (get_draft URL) — redirect to it
          // instead of building the legacy local zip package.
          if (draftAsset.storageProvider === 'capcut-mate' && draftAsset.url) {
            return Response.redirect(draftAsset.url, 302)
          }

          const stages = await db
            .select({
              stageCode: jobStage.stageCode,
              status: jobStage.status,
              outputSnapshot: jobStage.outputSnapshot,
            })
            .from(jobStage)
            .where(eq(jobStage.jobId, detail.id))
            .orderBy(asc(jobStage.sortOrder))

          const usageRecords = await db
            .select({
              resourceType: usageRecord.resourceType,
              provider: usageRecord.provider,
              model: usageRecord.model,
              usageAmount: usageRecord.usageAmount,
              usageUnit: usageRecord.usageUnit,
              creditCost: usageRecord.creditCost,
            })
            .from(usageRecord)
            .where(eq(usageRecord.jobId, detail.id))
            .orderBy(asc(usageRecord.createdAt))

          const buffer = buildDraftPackageBuffer({
            job: {
              id: detail.id,
              workspaceId: detail.workspaceId,
              templateId: detail.templateId,
              templateCode: detail.templateCode,
              templateName: detail.templateName,
              inputParams: (detail.inputParams ?? {}) as Record<string, unknown>,
              estimatedCredits: detail.estimatedCredits,
              actualCredits: detail.actualCredits,
              renderMp4Requested: detail.renderMp4Requested,
              createdAt: detail.createdAt,
              completedAt: detail.completedAt,
            },
            stages,
            assets,
            usageRecords,
          })

          const fileName = getDraftPackageFileName(detail.id)
          const body = new Uint8Array(buffer)
          return new Response(body, {
            headers: {
              'Content-Type': 'application/zip',
              'Content-Length': buffer.byteLength.toString(),
              'Content-Disposition': `attachment; filename="${fileName}"`,
              'Cache-Control': 'private, no-store',
            },
          })
        } catch (error) {
          console.error('Error downloading Reelflow draft package:', error)
          return Response.json({ error: 'Failed to download draft package' }, { status: 500 })
        }
      }),
    },
  },
})
