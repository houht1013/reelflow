import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export const Route = createFileRoute('/api/reelflow/assets')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { getDefaultWorkspaceForUser } = await import('@libs/reelflow/workspaces')
          const { listWorkspaceAssets } = await import('@libs/reelflow/assets')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const workspace = await getDefaultWorkspaceForUser(session.user.id)
          if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 409 })

          const url = new URL(request.url)
          const source = url.searchParams.get('source') || 'all'
          const assetType = normalizeText(url.searchParams.get('assetType'))
          const query = normalizeText(url.searchParams.get('query'))
          const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '60', 10), 1), 100)

          const assets = await listWorkspaceAssets({
            workspaceId: workspace.id,
            source: source === 'task' || source === 'personal' ? source : 'all',
            assetType,
            query,
            limit,
          })

          return Response.json({
            workspace: { id: workspace.id, name: workspace.name },
            assets,
          })
        } catch (error) {
          console.error('Error fetching Reelflow assets:', error)
          return Response.json({ error: 'Failed to fetch assets' }, { status: 500 })
        }
      }),

      POST: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { getDefaultWorkspaceForUser } = await import('@libs/reelflow/workspaces')
          const { AssetValidationError, registerUploadedAsset } = await import('@libs/reelflow/assets')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const workspace = await getDefaultWorkspaceForUser(session.user.id)
          if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 409 })

          const body = await request.json().catch(() => null)
          if (!body || typeof body !== 'object') {
            return Response.json({ error: 'Invalid request body' }, { status: 400 })
          }

          const assetType = normalizeText((body as Record<string, unknown>).assetType) || 'reference_image'
          const storageProvider = normalizeText((body as Record<string, unknown>).storageProvider)
          const storageKey = normalizeText((body as Record<string, unknown>).storageKey)
          const url = normalizeText((body as Record<string, unknown>).url)
          const mimeType = normalizeText((body as Record<string, unknown>).mimeType)
          const displayName = normalizeText((body as Record<string, unknown>).displayName)
          const fileSizeValue = (body as Record<string, unknown>).fileSize
          const fileSize = typeof fileSizeValue === 'number' && Number.isFinite(fileSizeValue) ? fileSizeValue : null

          const created = await registerUploadedAsset({
            workspaceId: workspace.id,
            userId: session.user.id,
            assetType,
            storageProvider,
            storageKey,
            url,
            mimeType,
            fileSize,
            originalName: normalizeText((body as Record<string, unknown>).originalName),
            displayName,
          })

          return Response.json({ asset: created }, { status: 201 })
        } catch (error) {
          const { AssetValidationError } = await import('@libs/reelflow/assets')
          if (error instanceof AssetValidationError) {
            return Response.json({ error: error.message, code: error.code }, { status: 400 })
          }
          console.error('Error creating Reelflow asset:', error)
          return Response.json({ error: 'Failed to create asset' }, { status: 500 })
        }
      }),
    },
  },
})
