import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'
import { config } from '@config'

export const Route = createFileRoute('/api/reelflow/credits')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { db } = await import('@libs/database')
          const { creditLedger } = await import('@libs/database/schema')
          const { ensureWorkspaceCreditAccount, getDefaultWorkspaceForUser } = await import('@libs/reelflow/workspaces')
          const { desc, eq } = await import('drizzle-orm')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

          const workspace = await getDefaultWorkspaceForUser(session.user.id)
          if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 409 })

          const account = await ensureWorkspaceCreditAccount(workspace.id)
          const ledger = await db
            .select({
              id: creditLedger.id,
              type: creditLedger.type,
              amount: creditLedger.amount,
              balanceAfter: creditLedger.balanceAfter,
              frozenAfter: creditLedger.frozenAfter,
              debtAfter: creditLedger.debtAfter,
              description: creditLedger.description,
              orderId: creditLedger.orderId,
              jobId: creditLedger.jobId,
              createdAt: creditLedger.createdAt,
            })
            .from(creditLedger)
            .where(eq(creditLedger.workspaceId, workspace.id))
            .orderBy(desc(creditLedger.createdAt))
            .limit(200)

          const plans = (Object.values(config.payment.plans) as Array<{
            id: string
            provider: string
            amount: number
            currency: string
            duration: { type: string }
            credits?: number
            recommended?: boolean
            i18n: unknown
          }>)
            .filter((plan) => plan.duration.type === 'credits' && plan.credits)
            .map((plan) => ({
              id: plan.id,
              provider: plan.provider,
              amount: plan.amount,
              currency: plan.currency,
              credits: plan.credits,
              recommended: Boolean('recommended' in plan && plan.recommended),
              i18n: plan.i18n,
            }))
            .sort((a, b) => Number(b.recommended) - Number(a.recommended) || Number(a.credits) - Number(b.credits))

          return Response.json({
            workspace: {
              id: workspace.id,
              name: workspace.name,
            },
            account: {
              balance: Number(account.balance || 0),
              frozenBalance: Number(account.frozenBalance || 0),
              debtBalance: Number(account.debtBalance || 0),
              totalGranted: Number(account.totalGranted || 0),
              totalConsumed: Number(account.totalConsumed || 0),
              updatedAt: account.updatedAt,
            },
            plans,
            ledger: ledger.map((item) => ({
              ...item,
              amount: Number(item.amount || 0),
              balanceAfter: Number(item.balanceAfter || 0),
              frozenAfter: Number(item.frozenAfter || 0),
              debtAfter: Number(item.debtAfter || 0),
            })),
          })
        } catch (error) {
          console.error('Error fetching Reelflow credits:', error)
          return Response.json({ error: 'Failed to fetch credits' }, { status: 500 })
        }
      }),
    },
  },
})
