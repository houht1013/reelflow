import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

// Lightweight order-status poller for the checkout QR flow. The Alipay async
// notify webhook is the source of truth: it flips the order to PAID and grants
// credits. This endpoint just reports the current DB status so the frontend can
// poll while the user scans + pays.
export const Route = createFileRoute('/api/payment/status')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { db } = await import('@libs/database')
          const { order, orderStatus } = await import('@libs/database/schema/order')
          const { eq } = await import('drizzle-orm')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const orderId = new URL(request.url).searchParams.get('orderId')
          if (!orderId) return Response.json({ error: 'Missing orderId' }, { status: 400 })

          const row = await db.query.order.findFirst({ where: eq(order.id, orderId) })
          if (!row) return Response.json({ error: 'Order not found' }, { status: 404 })
          if (row.userId !== session.user.id) return Response.json({ error: 'Access denied' }, { status: 403 })

          const status =
            row.status === orderStatus.PAID
              ? 'paid'
              : row.status === orderStatus.CANCELED || row.status === orderStatus.FAILED
                ? 'canceled'
                : 'pending'

          return Response.json({ orderId, status })
        } catch (error) {
          console.error('Payment status error:', error)
          return Response.json({ error: 'Status check failed' }, { status: 500 })
        }
      }),
    },
  },
})
