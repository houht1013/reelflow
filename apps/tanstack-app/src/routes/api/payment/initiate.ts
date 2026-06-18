import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'
import { config } from '@config'
import { nanoid } from 'nanoid'

const ORDER_EXPIRATION_TIME = 2 * 60 * 60 * 1000

export const Route = createFileRoute('/api/payment/initiate')({
  server: {
    handlers: {
      POST: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { createPaymentProvider } = await import('@libs/payment')
          const { db } = await import('@libs/database')
          const { order, orderStatus, paymentProviders } = await import('@libs/database/schema/order')
          const { eq } = await import('drizzle-orm')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const { planId, provider = paymentProviders.STRIPE } = await request.json()
          if (!planId) return Response.json({ error: 'Plan ID is required' }, { status: 400 })

          const orderId = nanoid()
          const plan = config.payment.plans[planId as keyof typeof config.payment.plans]
          if (!plan) return Response.json({ error: 'Invalid plan' }, { status: 400 })

          await db.insert(order).values({
            id: orderId,
            userId: session.user.id,
            planId,
            amount: plan.amount.toString(),
            currency: plan.currency,
            status: orderStatus.PENDING,
            provider,
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          })

          setTimeout(async () => {
            try {
              const currentOrder = await db.query.order.findFirst({ where: eq(order.id, orderId) })
              if (currentOrder?.status === orderStatus.PENDING) {
                await db.update(order).set({ status: orderStatus.CANCELED, updatedAt: new Date() }).where(eq(order.id, orderId))
                if (provider === paymentProviders.WECHAT) {
                  const paymentProvider = createPaymentProvider('wechat')
                  await paymentProvider.closeOrder(orderId)
                }
              }
            } catch (error) {
              console.error(`Failed to process expired order ${orderId}:`, error)
            }
          }, ORDER_EXPIRATION_TIME)

          const paymentProvider = createPaymentProvider(provider as 'stripe' | 'wechat' | 'paypal')
          const forwardedFor = request.headers.get('x-forwarded-for')
          const realIp = request.headers.get('x-real-ip')
          const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || '127.0.0.1'

          const result = await paymentProvider.createPayment({
            orderId,
            userId: session.user.id,
            planId,
            amount: plan.amount,
            currency: plan.currency,
            metadata: { clientIp },
          })

          await db.update(order).set({ providerOrderId: result.providerOrderId, metadata: result.metadata || {}, updatedAt: new Date() }).where(eq(order.id, orderId))

          return Response.json(result)
        } catch (error) {
          console.error('Payment initiation error:', error)
          return Response.json({ error: 'Failed to initiate payment' }, { status: 500 })
        }
      }),
    },
  },
})
