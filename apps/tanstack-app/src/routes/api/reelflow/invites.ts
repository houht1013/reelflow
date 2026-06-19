import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/reelflow/invites')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { getInviteDashboard } = await import('@libs/reelflow/invites')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const url = new URL(request.url)
          const origin = request.headers.get('origin') || `${url.protocol}//${url.host}`
          const locale = url.searchParams.get('locale') || 'zh-CN'

          return Response.json(await getInviteDashboard(session.user.id, origin, locale))
        } catch (error) {
          console.error('Error fetching Reelflow invites:', error)
          return Response.json({ error: 'Failed to fetch invites' }, { status: 500 })
        }
      }),
      POST: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { claimInviteBonus } = await import('@libs/reelflow/invites')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const body = await request.json().catch(() => ({}))
          const code = typeof body.code === 'string' ? body.code : ''
          if (!code.trim()) return Response.json({ error: 'Invite code is required' }, { status: 400 })

          const result = await claimInviteBonus(session.user.id, code)
          const status = result.status === 'invalid_code' ? 404 : 200
          return Response.json(result, { status })
        } catch (error) {
          console.error('Error claiming Reelflow invite:', error)
          return Response.json({ error: 'Failed to claim invite' }, { status: 500 })
        }
      }),
    },
  },
})
