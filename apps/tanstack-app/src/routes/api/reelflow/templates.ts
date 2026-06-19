import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/reelflow/templates')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { db } = await import('@libs/database')
          const { template, templateWorkspaceGrant } = await import('@libs/database/schema')
          const { getDefaultWorkspaceForUser } = await import('@libs/reelflow/workspaces')
          const { estimateJobCredits } = await import('@libs/reelflow/jobs')
          const { and, asc, eq, or } = await import('drizzle-orm')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const workspace = await getDefaultWorkspaceForUser(session.user.id)
          if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 409 })

          const rows = await db
            .select({
              id: template.id,
              code: template.code,
              name: template.name,
              description: template.description,
              category: template.category,
              visibility: template.visibility,
              recommended: template.recommended,
              featuredOrder: template.featuredOrder,
              inputSchema: template.inputSchema,
              capabilityRequirements: template.capabilityRequirements,
              metadata: template.metadata,
            })
            .from(template)
            .leftJoin(
              templateWorkspaceGrant,
              and(
                eq(templateWorkspaceGrant.templateId, template.id),
                eq(templateWorkspaceGrant.workspaceId, workspace.id),
                eq(templateWorkspaceGrant.status, 'active'),
              ),
            )
            .where(
              and(
                eq(template.status, 'published'),
                or(eq(template.visibility, 'public'), eq(templateWorkspaceGrant.workspaceId, workspace.id)),
              ),
            )
            .orderBy(asc(template.featuredOrder), asc(template.name))

          return Response.json({
            templates: rows.map((row) => ({
              ...row,
              estimatedCredits: estimateJobCredits({ templateCode: row.code, renderMp4Requested: false }),
              estimatedCreditsWithMp4: estimateJobCredits({ templateCode: row.code, renderMp4Requested: true }),
            })),
          })
        } catch (error) {
          console.error('Error fetching Reelflow templates:', error)
          return Response.json({ error: 'Failed to fetch templates' }, { status: 500 })
        }
      }),
    },
  },
})
