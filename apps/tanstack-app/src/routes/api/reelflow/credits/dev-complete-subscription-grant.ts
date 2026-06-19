import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'
import { config } from '@config'

export const Route = createFileRoute('/api/reelflow/credits/dev-complete-subscription-grant')({
  server: {
    handlers: {
      POST: withCfDb(async ({ request }) => {
        try {
          if (process.env.NODE_ENV === 'production' && process.env.REELFLOW_ENABLE_DEV_CHECKOUT !== '1') {
            return Response.json({ error: 'Dev checkout is disabled' }, { status: 404 })
          }

          const { auth } = await import('@libs/auth')
          const { grantWorkspaceSubscriptionCredits } = await import('@libs/reelflow/billing')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const body = await request.json().catch(() => null)
          const planId = body && typeof body === 'object' && typeof (body as { planId?: unknown }).planId === 'string'
            ? (body as { planId: string }).planId
            : 'monthly'
          const subscriptionId = body && typeof body === 'object' && typeof (body as { subscriptionId?: unknown }).subscriptionId === 'string'
            ? (body as { subscriptionId: string }).subscriptionId
            : `reelflow_dev_sub_${session.user.id}`
          const periodStartRaw = body && typeof body === 'object' && typeof (body as { periodStart?: unknown }).periodStart === 'string'
            ? (body as { periodStart: string }).periodStart
            : new Date().toISOString()
          const periodStart = new Date(periodStartRaw)

          if (Number.isNaN(periodStart.getTime())) {
            return Response.json({ error: 'Invalid period start' }, { status: 400 })
          }

          const plan = config.payment.plans[planId as keyof typeof config.payment.plans] as
            | {
                id: string
                provider: string
                duration: { type: string; months?: number }
                reelflowCredits?: number
              }
            | undefined

          if (!plan || plan.duration.type !== 'recurring' || !plan.reelflowCredits) {
            return Response.json({ error: 'Invalid subscription plan' }, { status: 400 })
          }

          const periodEnd = new Date(periodStart)
          periodEnd.setMonth(periodEnd.getMonth() + (plan.duration.months || 1))

          const ledger = await grantWorkspaceSubscriptionCredits({
            userId: session.user.id,
            amount: plan.reelflowCredits,
            provider: plan.provider,
            planId,
            subscriptionId,
            periodStart,
            periodEnd,
            metadata: {
              simulated: true,
              completedBy: 'reelflow_dev_subscription_grant',
            },
          })

          return Response.json({
            planId,
            subscriptionId,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            credits: plan.reelflowCredits,
            ledgerId: ledger?.id ?? null,
          }, { status: 201 })
        } catch (error) {
          console.error('Error completing Reelflow dev subscription grant:', error)
          return Response.json({ error: 'Failed to complete dev subscription grant' }, { status: 500 })
        }
      }),
    },
  },
})
