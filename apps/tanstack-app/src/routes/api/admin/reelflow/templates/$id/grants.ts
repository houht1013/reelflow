import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

type Ctx = { request: Request; params: { id: string } }

async function listGrants(templateId: string) {
  const { db } = await import('@libs/database')
  const { templateWorkspaceGrant, workspace } = await import('@libs/database/schema')
  const { eq, desc } = await import('drizzle-orm')

  return db
    .select({
      id: templateWorkspaceGrant.id,
      workspaceId: templateWorkspaceGrant.workspaceId,
      workspaceName: workspace.name,
      status: templateWorkspaceGrant.status,
      createdAt: templateWorkspaceGrant.createdAt,
    })
    .from(templateWorkspaceGrant)
    .leftJoin(workspace, eq(templateWorkspaceGrant.workspaceId, workspace.id))
    .where(eq(templateWorkspaceGrant.templateId, templateId))
    .orderBy(desc(templateWorkspaceGrant.createdAt))
}

export const Route = createFileRoute('/api/admin/reelflow/templates/$id/grants')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request, params }: Ctx) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          return Response.json({ grants: await listGrants(params.id) })
        } catch (error) {
          console.error('Error listing template grants:', error)
          return Response.json({ error: 'Failed to list grants' }, { status: 500 })
        }
      }),

      POST: withCfDb(async ({ request, params }: Ctx) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const body = await request.json().catch(() => null)
          const workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId.trim() : ''
          if (!workspaceId) {
            return Response.json({ error: 'workspaceId is required' }, { status: 400 })
          }

          const { db } = await import('@libs/database')
          const { template, workspace, templateWorkspaceGrant } = await import('@libs/database/schema')
          const { eq } = await import('drizzle-orm')

          const [tpl] = await db.select({ id: template.id }).from(template).where(eq(template.id, params.id)).limit(1)
          if (!tpl) return Response.json({ error: 'Template not found' }, { status: 404 })

          const [ws] = await db.select({ id: workspace.id }).from(workspace).where(eq(workspace.id, workspaceId)).limit(1)
          if (!ws) return Response.json({ error: 'Workspace not found' }, { status: 404 })

          await db
            .insert(templateWorkspaceGrant)
            .values({
              id: crypto.randomUUID(),
              templateId: params.id,
              workspaceId,
              status: 'active',
              grantedByUserId: authResult.user.id,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [templateWorkspaceGrant.templateId, templateWorkspaceGrant.workspaceId],
              set: { status: 'active', grantedByUserId: authResult.user.id, updatedAt: new Date() },
            })

          return Response.json({ grants: await listGrants(params.id) })
        } catch (error) {
          console.error('Error granting template:', error)
          return Response.json({ error: 'Failed to grant template' }, { status: 500 })
        }
      }),

      DELETE: withCfDb(async ({ request, params }: Ctx) => {
        try {
          const { requireAdminAPI } = await import('@/lib/api-auth')
          const authResult = await requireAdminAPI(request)
          if (authResult instanceof Response) return authResult

          const url = new URL(request.url)
          const workspaceId = url.searchParams.get('workspaceId')?.trim() || ''
          if (!workspaceId) {
            return Response.json({ error: 'workspaceId is required' }, { status: 400 })
          }

          const { db } = await import('@libs/database')
          const { templateWorkspaceGrant } = await import('@libs/database/schema')
          const { and, eq } = await import('drizzle-orm')

          await db
            .delete(templateWorkspaceGrant)
            .where(and(
              eq(templateWorkspaceGrant.templateId, params.id),
              eq(templateWorkspaceGrant.workspaceId, workspaceId),
            ))

          return Response.json({ grants: await listGrants(params.id) })
        } catch (error) {
          console.error('Error revoking template grant:', error)
          return Response.json({ error: 'Failed to revoke grant' }, { status: 500 })
        }
      }),
    },
  },
})
