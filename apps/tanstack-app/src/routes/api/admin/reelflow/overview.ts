import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/admin/reelflow/overview')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const { db } = await import('@libs/database')
          const {
            creditAccount,
            job,
            pricingItem,
            providerHealthCheck,
            providerProfile,
            template,
            workspace,
          } = await import('@libs/database/schema')
          const { count, desc, eq, inArray, sql } = await import('drizzle-orm')

          const [
            [templateTotal],
            [publishedTemplateTotal],
            [jobTotal],
            [runningJobTotal],
            [failedJobTotal],
            [workspaceTotal],
            [creditTotals],
          ] = await Promise.all([
            db.select({ count: count() }).from(template),
            db.select({ count: count() }).from(template).where(eq(template.status, 'published')),
            db.select({ count: count() }).from(job),
            db.select({ count: count() }).from(job).where(eq(job.status, 'running')),
            db.select({ count: count() }).from(job).where(eq(job.status, 'failed')),
            db.select({ count: count() }).from(workspace),
            db
              .select({
                balance: sql<string>`COALESCE(SUM(CAST(${creditAccount.balance} AS DECIMAL)), 0)`,
                frozen: sql<string>`COALESCE(SUM(CAST(${creditAccount.frozenBalance} AS DECIMAL)), 0)`,
                debt: sql<string>`COALESCE(SUM(CAST(${creditAccount.debtBalance} AS DECIMAL)), 0)`,
              })
              .from(creditAccount),
          ])

          const jobStatusRows = await db
            .select({
              status: job.status,
              count: count(),
            })
            .from(job)
            .groupBy(job.status)

          const templates = await db
            .select({
              id: template.id,
              code: template.code,
              name: template.name,
              category: template.category,
              visibility: template.visibility,
              status: template.status,
              recommended: template.recommended,
              featuredOrder: template.featuredOrder,
              builderVersion: template.builderVersion,
              createdAt: template.createdAt,
              updatedAt: template.updatedAt,
            })
            .from(template)
            .orderBy(desc(template.updatedAt))
            .limit(100)

          const recentJobs = await db
            .select({
              id: job.id,
              templateName: template.name,
              workspaceName: workspace.name,
              status: job.status,
              qualityStatus: job.qualityStatus,
              artifactStatus: job.artifactStatus,
              priority: job.priority,
              estimatedCredits: job.estimatedCredits,
              actualCredits: job.actualCredits,
              lastErrorMessage: job.lastErrorMessage,
              createdAt: job.createdAt,
              updatedAt: job.updatedAt,
            })
            .from(job)
            .innerJoin(template, eq(job.templateId, template.id))
            .innerJoin(workspace, eq(job.workspaceId, workspace.id))
            .orderBy(desc(job.createdAt))
            .limit(30)

          const providers = await db
            .select({
              id: providerProfile.id,
              providerType: providerProfile.providerType,
              provider: providerProfile.provider,
              displayName: providerProfile.displayName,
              enabled: providerProfile.enabled,
              priority: providerProfile.priority,
              updatedAt: providerProfile.updatedAt,
            })
            .from(providerProfile)
            .orderBy(providerProfile.providerType, desc(providerProfile.priority))

          const providerIds = providers.map((provider) => provider.id)
          const providerHealthRows = providerIds.length
            ? await db
                .select({
                  providerProfileId: providerHealthCheck.providerProfileId,
                  status: providerHealthCheck.status,
                  latencyMs: providerHealthCheck.latencyMs,
                  errorCode: providerHealthCheck.errorCode,
                  errorMessage: providerHealthCheck.errorMessage,
                  checkedBy: providerHealthCheck.checkedBy,
                  createdAt: providerHealthCheck.createdAt,
                })
                .from(providerHealthCheck)
                .where(inArray(providerHealthCheck.providerProfileId, providerIds))
                .orderBy(desc(providerHealthCheck.createdAt))
            : []

          const latestProviderHealth = new Map<string, (typeof providerHealthRows)[number]>()
          for (const row of providerHealthRows) {
            if (!latestProviderHealth.has(row.providerProfileId)) latestProviderHealth.set(row.providerProfileId, row)
          }

          const pricing = await db
            .select({
              id: pricingItem.id,
              resourceType: pricingItem.resourceType,
              provider: pricingItem.provider,
              model: pricingItem.model,
              usageUnit: pricingItem.usageUnit,
              providerCostUnitPrice: pricingItem.providerCostUnitPrice,
              providerCostCurrency: pricingItem.providerCostCurrency,
              creditUnitPrice: pricingItem.creditUnitPrice,
              minCreditCost: pricingItem.minCreditCost,
              enabled: pricingItem.enabled,
              updatedAt: pricingItem.updatedAt,
            })
            .from(pricingItem)
            .orderBy(pricingItem.resourceType, pricingItem.provider)

          return Response.json({
            stats: {
              templates: {
                total: templateTotal?.count || 0,
                published: publishedTemplateTotal?.count || 0,
              },
              jobs: {
                total: jobTotal?.count || 0,
                running: runningJobTotal?.count || 0,
                failed: failedJobTotal?.count || 0,
                byStatus: Object.fromEntries(jobStatusRows.map((row) => [row.status, row.count])),
              },
              workspaces: {
                total: workspaceTotal?.count || 0,
              },
              credits: {
                balance: creditTotals?.balance || '0',
                frozen: creditTotals?.frozen || '0',
                debt: creditTotals?.debt || '0',
              },
            },
            templates,
            recentJobs,
            providers: providers.map((provider) => ({
              ...provider,
              latestHealth: latestProviderHealth.get(provider.id) ?? null,
            })),
            pricing,
          })
        } catch (error) {
          console.error('Error fetching Reelflow admin overview:', error)
          return Response.json({ error: 'Failed to fetch Reelflow admin overview' }, { status: 500 })
        }
      }),
    },
  },
})
