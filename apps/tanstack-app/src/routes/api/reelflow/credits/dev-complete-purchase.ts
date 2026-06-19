import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'
import { config } from '@config'
import { nanoid } from 'nanoid'

export const Route = createFileRoute('/api/reelflow/credits/dev-complete-purchase')({
  server: {
    handlers: {
      POST: withCfDb(async ({ request }) => {
        try {
          if (process.env.NODE_ENV === 'production' && process.env.REELFLOW_ENABLE_DEV_CHECKOUT !== '1') {
            return Response.json({ error: 'Dev checkout is disabled' }, { status: 404 })
          }

          const { auth } = await import('@libs/auth')
          const { db } = await import('@libs/database')
          const { order, orderStatus } = await import('@libs/database/schema')
          const { grantWorkspaceCredits } = await import('@libs/reelflow/billing')
          const { eq } = await import('drizzle-orm')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const body = await request.json().catch(() => null)
          const planId = body && typeof body === 'object' && typeof (body as { planId?: unknown }).planId === 'string'
            ? (body as { planId: string }).planId
            : ''
          if (!planId) return Response.json({ error: 'Plan ID is required' }, { status: 400 })
          const requestedOrderId = body && typeof body === 'object' && typeof (body as { orderId?: unknown }).orderId === 'string'
            ? (body as { orderId: string }).orderId.trim()
            : ''
          const requestedProviderOrderId = body && typeof body === 'object' && typeof (body as { providerOrderId?: unknown }).providerOrderId === 'string'
            ? (body as { providerOrderId: string }).providerOrderId.trim()
            : ''

          const plan = config.payment.plans[planId as keyof typeof config.payment.plans] as
            | {
                id: string
                provider: string
                amount: number
                currency: string
                duration: { type: string }
                credits?: number
              }
            | undefined

          if (!plan || plan.duration.type !== 'credits' || !plan.credits) {
            return Response.json({ error: 'Invalid credit plan' }, { status: 400 })
          }

          const orderId = requestedOrderId || nanoid()
          const providerOrderId = requestedProviderOrderId || `reelflow_dev_${orderId}`
          const now = new Date()
          const [existingOrder] = await db.select().from(order).where(eq(order.id, orderId)).limit(1)

          if (existingOrder) {
            if (existingOrder.userId !== session.user.id) {
              return Response.json({ error: 'Order does not belong to current user' }, { status: 403 })
            }
            if (existingOrder.planId !== planId) {
              return Response.json({ error: 'Order plan does not match request' }, { status: 400 })
            }

            await db
              .update(order)
              .set({
                status: orderStatus.PAID,
                providerOrderId: existingOrder.providerOrderId || providerOrderId,
                metadata: {
                  ...(existingOrder.metadata && typeof existingOrder.metadata === 'object' ? existingOrder.metadata : {}),
                  simulated: true,
                  replayedBy: 'reelflow_dev_checkout',
                  completedAt: now.toISOString(),
                },
                updatedAt: now,
              })
              .where(eq(order.id, orderId))
          } else {
            await db.insert(order).values({
              id: orderId,
              userId: session.user.id,
              planId,
              amount: plan.amount.toString(),
              currency: plan.currency,
              status: orderStatus.PAID,
              provider: plan.provider,
              providerOrderId,
              metadata: {
                simulated: true,
                completedBy: 'reelflow_dev_checkout',
                completedAt: now.toISOString(),
              },
              createdAt: now,
              updatedAt: now,
            })
          }

          const ledger = await grantWorkspaceCredits({
            userId: session.user.id,
            amount: plan.credits,
            type: 'purchase',
            orderId,
            description: 'Purchase Reelflow workspace credits',
            metadata: {
              provider: 'reelflow_dev_checkout',
              originalProvider: plan.provider,
              planId,
              providerOrderId,
            },
          })

          return Response.json({
            orderId,
            providerOrderId,
            planId,
            credits: plan.credits,
            ledgerId: ledger.id,
          }, { status: existingOrder ? 200 : 201 })
        } catch (error) {
          console.error('Error completing Reelflow dev credit purchase:', error)
          return Response.json({ error: 'Failed to complete dev credit purchase' }, { status: 500 })
        }
      }),
    },
  },
})
