import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

function numericString(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value.toString()
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0) {
    return Number(value).toString()
  }
  return undefined
}

export const Route = createFileRoute('/api/admin/reelflow/pricing/$id')({
  server: {
    handlers: {
      PATCH: withCfDb(async ({ request, params }: { request: Request; params: { id: string } }) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const body = await request.json().catch(() => null)
          if (!body || typeof body !== 'object') {
            return Response.json({ error: 'Invalid request body' }, { status: 400 })
          }

          const update: {
            creditUnitPrice?: string
            minCreditCost?: string | null
            providerCostUnitPrice?: string
            enabled?: boolean
            updatedAt: Date
          } = { updatedAt: new Date() }

          const creditUnitPrice = numericString((body as Record<string, unknown>).creditUnitPrice)
          if (creditUnitPrice !== undefined) update.creditUnitPrice = creditUnitPrice

          const providerCostUnitPrice = numericString((body as Record<string, unknown>).providerCostUnitPrice)
          if (providerCostUnitPrice !== undefined) update.providerCostUnitPrice = providerCostUnitPrice

          // minCreditCost is nullable: allow clearing with null/empty string
          const rawMin = (body as Record<string, unknown>).minCreditCost
          if (rawMin === null || rawMin === '') {
            update.minCreditCost = null
          } else {
            const minCreditCost = numericString(rawMin)
            if (minCreditCost !== undefined) update.minCreditCost = minCreditCost
          }

          if (typeof (body as Record<string, unknown>).enabled === 'boolean') {
            update.enabled = (body as Record<string, unknown>).enabled as boolean
          }

          if (Object.keys(update).length === 1) {
            return Response.json({ error: 'No valid fields to update' }, { status: 400 })
          }

          const { db } = await import('@libs/database')
          const { pricingItem, pricingChangeLog } = await import('@libs/database/schema')
          const { eq } = await import('drizzle-orm')

          const [before] = await db.select().from(pricingItem).where(eq(pricingItem.id, params.id)).limit(1)
          if (!before) return Response.json({ error: 'Pricing item not found' }, { status: 404 })

          const [updated] = await db
            .update(pricingItem)
            .set(update)
            .where(eq(pricingItem.id, params.id))
            .returning({
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

          await db.insert(pricingChangeLog).values({
            id: crypto.randomUUID(),
            pricingItemId: params.id,
            changedByUserId: authResult.user.id,
            before: {
              creditUnitPrice: before.creditUnitPrice,
              minCreditCost: before.minCreditCost,
              providerCostUnitPrice: before.providerCostUnitPrice,
              enabled: before.enabled,
            },
            after: {
              creditUnitPrice: updated.creditUnitPrice,
              minCreditCost: updated.minCreditCost,
              providerCostUnitPrice: updated.providerCostUnitPrice,
              enabled: updated.enabled,
            },
            noticeStatus: 'none',
            createdAt: new Date(),
          })

          return Response.json({ pricing: updated })
        } catch (error) {
          console.error('Error updating Reelflow pricing item:', error)
          return Response.json({ error: 'Failed to update pricing item' }, { status: 500 })
        }
      }),
    },
  },
})
