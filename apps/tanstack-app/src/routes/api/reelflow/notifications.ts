import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/reelflow/notifications')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { db } = await import('@libs/database')
          const { notification, notificationDelivery } = await import('@libs/database/schema')
          const { getDefaultWorkspaceForUser } = await import('@libs/reelflow/workspaces')
          const { and, desc, eq, inArray, isNull, sql } = await import('drizzle-orm')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const workspace = await getDefaultWorkspaceForUser(session.user.id)
          if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 409 })

          const url = new URL(request.url)
          const unreadOnly = url.searchParams.get('status') === 'unread'
          const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10), 1), 100)

          const conditions = [
            eq(notification.workspaceId, workspace.id),
            eq(notification.userId, session.user.id),
          ]
          if (unreadOnly) conditions.push(isNull(notification.readAt))

          const rows = await db
            .select({
              id: notification.id,
              type: notification.type,
              title: notification.title,
              body: notification.body,
              data: notification.data,
              readAt: notification.readAt,
              createdAt: notification.createdAt,
            })
            .from(notification)
            .where(and(...conditions))
            .orderBy(desc(notification.createdAt))
            .limit(limit)

          const unreadResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(notification)
            .where(and(eq(notification.workspaceId, workspace.id), eq(notification.userId, session.user.id), isNull(notification.readAt)))

          const deliveryRows = rows.length
            ? await db
                .select({
                  notificationId: notificationDelivery.notificationId,
                  channel: notificationDelivery.channel,
                  status: notificationDelivery.status,
                  recipient: notificationDelivery.recipient,
                  provider: notificationDelivery.provider,
                  sentAt: notificationDelivery.sentAt,
                })
                .from(notificationDelivery)
                .where(inArray(notificationDelivery.notificationId, rows.map((item) => item.id)))
            : []

          const deliveriesByNotification = new Map<string, typeof deliveryRows>()
          for (const delivery of deliveryRows) {
            const list = deliveriesByNotification.get(delivery.notificationId) || []
            list.push(delivery)
            deliveriesByNotification.set(delivery.notificationId, list)
          }

          return Response.json({
            workspace: { id: workspace.id, name: workspace.name },
            unreadCount: unreadResult[0]?.count || 0,
            notifications: rows.map((item) => ({
              ...item,
              deliveries: deliveriesByNotification.get(item.id) || [],
            })),
          })
        } catch (error) {
          console.error('Error fetching Reelflow notifications:', error)
          return Response.json({ error: 'Failed to fetch notifications' }, { status: 500 })
        }
      }),

      POST: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { db } = await import('@libs/database')
          const { notification } = await import('@libs/database/schema')
          const { getDefaultWorkspaceForUser } = await import('@libs/reelflow/workspaces')
          const { and, eq, inArray, isNull } = await import('drizzle-orm')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const workspace = await getDefaultWorkspaceForUser(session.user.id)
          if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 409 })

          const body = await request.json().catch(() => null)
          if (!body || typeof body !== 'object') {
            return Response.json({ error: 'Invalid request body' }, { status: 400 })
          }

          const action = (body as Record<string, unknown>).action
          const now = new Date()

          if (action === 'mark_all_read') {
            const updated = await db
              .update(notification)
              .set({ readAt: now })
              .where(and(eq(notification.workspaceId, workspace.id), eq(notification.userId, session.user.id), isNull(notification.readAt)))
              .returning({ id: notification.id })
            return Response.json({ updated: updated.length })
          }

          if (action === 'mark_read') {
            const ids = (body as Record<string, unknown>).ids
            if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
              return Response.json({ error: 'Notification ids are required' }, { status: 400 })
            }
            const updated = await db
              .update(notification)
              .set({ readAt: now })
              .where(and(eq(notification.workspaceId, workspace.id), eq(notification.userId, session.user.id), inArray(notification.id, ids)))
              .returning({ id: notification.id })
            return Response.json({ updated: updated.length })
          }

          return Response.json({ error: 'Unsupported action' }, { status: 400 })
        } catch (error) {
          console.error('Error updating Reelflow notifications:', error)
          return Response.json({ error: 'Failed to update notifications' }, { status: 500 })
        }
      }),
    },
  },
})
