import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/admin/reelflow/providers/$id/health')({
  server: {
    handlers: {
      POST: withCfDb(async ({ request, params }: { request: Request; params: { id: string } }) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const { runProviderHealthCheck } = await import('@libs/reelflow')
          const healthCheck = await runProviderHealthCheck({
            providerProfileId: params.id,
            checkedBy: 'admin',
          })

          return Response.json({ healthCheck })
        } catch (error) {
          console.error('Error checking Reelflow provider health:', error)
          const message = error instanceof Error ? error.message : 'Failed to check provider health'
          const status = message === 'Provider not found' ? 404 : 500
          return Response.json({ error: message }, { status })
        }
      }),
    },
  },
})
