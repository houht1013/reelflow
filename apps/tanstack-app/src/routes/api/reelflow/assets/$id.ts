import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/reelflow/assets/$id')({
  server: {
    handlers: {
      DELETE: withCfDb(async ({ request, params }: { request: Request; params: { id: string } }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { getDefaultWorkspaceForUser } = await import('@libs/reelflow/workspaces')
          const { archiveUploadedAsset } = await import('@libs/reelflow/assets')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const workspace = await getDefaultWorkspaceForUser(session.user.id)
          if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 409 })

          const result = await archiveUploadedAsset({
            workspaceId: workspace.id,
            assetId: params.id,
          })

          return Response.json({ asset: result })
        } catch (error) {
          const { AssetValidationError } = await import('@libs/reelflow/assets')
          if (error instanceof AssetValidationError) {
            const status = error.code === 'not_found' ? 404 : 409
            return Response.json({ error: error.message, code: error.code }, { status })
          }

          console.error('Error archiving Reelflow asset:', error)
          return Response.json({ error: 'Failed to remove asset' }, { status: 500 })
        }
      }),
    },
  },
})
