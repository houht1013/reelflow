import { createFileRoute, Link } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import { AlertTriangle, ArrowRight, CheckCircle2, Coins, CreditCard, History, Loader2, LockKeyhole, RefreshCw, ShieldCheck, TrendingDown, TrendingUp, WalletCards } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Badge } from '@libs/react-shared/ui/badge'
import { Button } from '@libs/react-shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@libs/react-shared/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@libs/react-shared/ui/table'
import { PageHeader, SkeletonRows } from '@/components/reelflow-ui'

export const Route = createFileRoute('/$lang/(root)/reelflow/credits')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.credits),
  component: ReelflowCreditsPage,
})

type WorkspaceCreditAccount = {
  balance: number
  frozenBalance: number
  debtBalance: number
  totalGranted: number
  totalConsumed: number
  updatedAt: string
}

type WorkspaceCreditPlan = {
  id: string
  provider: string
  amount: number
  currency: string
  credits: number
  recommended: boolean
  i18n?: Record<string, { name: string; description: string; duration: string; features?: string[] }>
}

type WorkspaceCreditLedger = {
  id: string
  type: string
  amount: number
  balanceAfter: number
  frozenAfter: number
  debtAfter: number
  description: string | null
  orderId: string | null
  jobId: string | null
  createdAt: string
}

type CreditsResponse = {
  workspace: { id: string; name: string }
  account: WorkspaceCreditAccount
  plans: WorkspaceCreditPlan[]
  ledger: WorkspaceCreditLedger[]
}

function ReelflowCreditsPage() {
  const { t, locale } = useTranslation()
  const [data, setData] = useState<CreditsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [buyingPlanId, setBuyingPlanId] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [qrOrderId, setQrOrderId] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  const loadCredits = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/reelflow/credits')
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || t.reelflow.credits.loadError)
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.reelflow.credits.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCredits()
    return () => {
      if (pollingInterval) clearInterval(pollingInterval)
    }
  }, [])

  const formatCredits = (value: number) => {
    return new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', { maximumFractionDigits: 2 }).format(value)
  }

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const formatDate = (value: string) => {
    return new Intl.DateTimeFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  }

  const startWechatPolling = (orderId: string) => {
    if (pollingInterval) clearInterval(pollingInterval)

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payment/query?orderId=${orderId}&provider=wechat`)
        const payload = await response.json()

        if (payload.status === 'paid') {
          clearInterval(interval)
          setPollingInterval(null)
          setQrCodeUrl(null)
          setQrOrderId(null)
          toast.success(t.reelflow.credits.purchaseSuccess)
          void loadCredits()
        } else if (payload.status === 'failed') {
          clearInterval(interval)
          setPollingInterval(null)
          toast.error(t.reelflow.credits.purchaseFailed)
          setQrCodeUrl(null)
          setQrOrderId(null)
        }
      } catch (err) {
        console.error('Reelflow credit payment polling failed:', err)
      }
    }, 3000)

    setPollingInterval(interval)
  }

  const closeQrDialog = () => {
    if (pollingInterval) clearInterval(pollingInterval)
    setPollingInterval(null)
    setQrCodeUrl(null)
    setQrOrderId(null)
  }

  const buyPlan = async (plan: WorkspaceCreditPlan) => {
    setBuyingPlanId(plan.id)
    try {
      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, provider: plan.provider }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || t.reelflow.credits.purchaseFailed)

      if (plan.provider === 'wechat') {
        const qrDataUrl = await QRCode.toDataURL(payload.paymentUrl)
        setQrCodeUrl(qrDataUrl)
        setQrOrderId(payload.providerOrderId)
        startWechatPolling(payload.providerOrderId)
      } else if (payload.paymentUrl) {
        window.location.href = payload.paymentUrl
      } else {
        throw new Error(t.reelflow.credits.purchaseFailed)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t.reelflow.credits.purchaseFailed
      toast.error(t.reelflow.credits.purchaseFailed, { description: message })
    } finally {
      setBuyingPlanId(null)
    }
  }

  const account = data?.account
  const ledgerTypeText = (type: string) => (t.reelflow.credits.ledgerTypes as Record<string, string>)[type] || type
  const providerText = (provider: string) => (t.reelflow.credits.providers as Record<string, string>)[provider] || provider

  return (
    <main className="min-h-screen" data-testid="reelflow-credits-page">
      <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow={t.reelflow.shell.workspaceName}
          title={t.reelflow.credits.title}
          description={t.reelflow.credits.description}
          actions={
            <>
              <Button type="button" variant="outline" onClick={loadCredits} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />}
                {t.reelflow.common.refresh}
              </Button>
              <Button variant="outline" asChild>
                <Link to="/$lang/reelflow/jobs" params={{ lang: locale }}>
                  <History className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t.reelflow.common.viewTasks}
                </Link>
              </Button>
            </>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{t.reelflow.credits.loadError}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading ? (
          <SkeletonRows count={4} className="h-28" />
        ) : data && account ? (
          <>
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <div className="reelflow-hero-panel p-6" data-testid="reelflow-credit-balance">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <WalletCards className="h-4 w-4" aria-hidden="true" />
                      {t.reelflow.credits.balance}
                    </div>
                    <p className="reelflow-display reelflow-num mt-3 text-5xl leading-none sm:text-6xl">
                      {formatCredits(account.balance)}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">{t.reelflow.credits.balanceHint}</p>
                  </div>
                  <Badge variant={account.debtBalance > 0 ? 'destructive' : 'secondary'} className="w-fit">
                    {account.debtBalance > 0 ? t.reelflow.credits.debtAttention : t.reelflow.credits.accountHealthy}
                  </Badge>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <CreditMetric
                    icon={LockKeyhole}
                    testId="reelflow-credit-frozen"
                    title={t.reelflow.credits.frozen}
                    value={formatCredits(account.frozenBalance)}
                    hint={t.reelflow.credits.frozenHint}
                    tone="amber"
                  />
                  <CreditMetric
                    icon={AlertTriangle}
                    testId="reelflow-credit-debt"
                    title={t.reelflow.credits.debt}
                    value={formatCredits(account.debtBalance)}
                    hint={t.reelflow.credits.debtHint}
                    danger={account.debtBalance > 0}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <CreditMetric
                  icon={TrendingUp}
                  testId="reelflow-credit-total-granted"
                  title={t.reelflow.credits.totalGranted}
                  value={formatCredits(account.totalGranted)}
                  hint={t.reelflow.credits.totalGrantedHint}
                  tone="green"
                />
                <CreditMetric
                  icon={TrendingDown}
                  testId="reelflow-credit-total-consumed"
                  title={t.reelflow.credits.totalConsumed}
                  value={formatCredits(account.totalConsumed)}
                  hint={t.reelflow.credits.totalConsumedHint}
                  tone="blue"
                />
              </div>
            </section>

            <section className="reelflow-panel p-5">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="reelflow-display text-xl">{t.reelflow.credits.buyTitle}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t.reelflow.credits.buyDescription}</p>
                </div>
                <Badge variant="secondary" className="gap-1.5">
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                  {t.reelflow.credits.noExpiry}
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.plans.map((plan) => {
                  const planText = plan.i18n?.[locale] || plan.i18n?.en
                  return (
                    <article
                      key={plan.id}
                      className={[
                        'relative flex min-h-72 flex-col overflow-hidden p-5',
                        plan.recommended ? 'reelflow-hero-panel' : 'reelflow-soft-tile',
                      ].join(' ')}
                      data-testid={`reelflow-credit-plan-${plan.id}`}
                    >
                      {plan.recommended && (
                        <span className="absolute right-0 top-0 h-24 w-24 translate-x-10 -translate-y-10 rounded-full bg-primary/15 blur-2xl" aria-hidden="true" />
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold">{planText?.name || plan.id}</h3>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t.reelflow.credits.planCardDescription}</p>
                        </div>
                        {plan.recommended && <Badge>{t.reelflow.credits.recommended}</Badge>}
                      </div>
                      <div className="mt-6">
                        <p className="text-sm font-medium text-muted-foreground">{formatMoney(plan.amount, plan.currency)}</p>
                        <p className="reelflow-display reelflow-num mt-2 text-4xl leading-none">
                          {formatCredits(plan.credits)}
                          <span className="ml-2 text-sm font-normal text-muted-foreground">{t.reelflow.common.credits}</span>
                        </p>
                        <p className="mt-3 text-sm text-muted-foreground">{providerText(plan.provider)}</p>
                      </div>
                      <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                        {[t.reelflow.credits.planBenefitWorkspace, t.reelflow.credits.planBenefitNoExpiry].map((feature) => (
                          <li key={feature} className="flex gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                            <span className="min-w-0">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-auto pt-5">
                        <Button type="button" className="w-full" onClick={() => buyPlan(plan)} disabled={buyingPlanId === plan.id} data-testid={`reelflow-buy-plan-${plan.id}`}>
                          {buyingPlanId === plan.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
                          )}
                          {t.reelflow.credits.buyNow}
                          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            <section className="reelflow-panel overflow-hidden">
              <div className="px-5 py-4 shadow-[inset_0_-1px_0_var(--reelflow-hairline)]">
                <h2 className="text-lg font-semibold">{t.reelflow.credits.ledgerTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.reelflow.credits.ledgerDescription}</p>
              </div>
              {data.ledger.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">{t.reelflow.credits.emptyLedger}</div>
              ) : (
                <div className="overflow-x-auto" data-testid="reelflow-credit-ledger">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.reelflow.credits.table.time}</TableHead>
                        <TableHead>{t.reelflow.credits.table.type}</TableHead>
                        <TableHead>{t.reelflow.credits.table.description}</TableHead>
                        <TableHead>{t.reelflow.credits.table.amount}</TableHead>
                        <TableHead>{t.reelflow.credits.table.balanceAfter}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.ledger.map((item) => (
                        <TableRow key={item.id} data-testid={`reelflow-credit-ledger-${item.type}`}>
                          <TableCell className="whitespace-nowrap">{formatDate(item.createdAt)}</TableCell>
                          <TableCell>
                            <Badge variant={item.amount >= 0 ? 'default' : 'secondary'}>{ledgerTypeText(item.type)}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="min-w-56">
                              <p>{item.description || ledgerTypeText(item.type)}</p>
                              {(item.orderId || item.jobId) && (
                                <p className="mt-1 text-xs text-muted-foreground">{item.orderId || item.jobId}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={item.amount >= 0 ? 'text-primary' : 'text-destructive'}>
                            {item.amount >= 0 ? '+' : ''}
                            {formatCredits(item.amount)}
                          </TableCell>
                          <TableCell>{formatCredits(item.balanceAfter)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>

      <Dialog open={!!qrCodeUrl} onOpenChange={(open) => !open && closeQrDialog()}>
        <DialogContent className="overscroll-contain sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">{t.reelflow.credits.wechatQrTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {qrCodeUrl && <img src={qrCodeUrl} alt={t.reelflow.credits.wechatQrAlt} width={256} height={256} className="h-64 w-64" />}
            <p className="text-center text-sm text-muted-foreground">{t.reelflow.credits.wechatQrHint}</p>
            {qrOrderId && <p className="text-xs text-muted-foreground">{qrOrderId}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function CreditMetric({
  icon: Icon = Coins,
  testId,
  title,
  value,
  hint,
  tone,
  danger = false,
}: {
  icon?: typeof Coins
  testId: string
  title: string
  value: string
  hint?: string
  tone?: 'amber' | 'blue' | 'green'
  danger?: boolean
}) {
  const colorClass = danger
    ? 'text-destructive'
    : tone === 'amber'
      ? 'text-[var(--reelflow-amber)]'
      : tone === 'blue'
        ? 'text-[var(--reelflow-blue)]'
        : tone === 'green'
          ? 'text-[var(--reelflow-green)]'
          : 'text-primary'

  return (
    <section className="reelflow-muted-tile p-5" data-testid={testId}>
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-background/70 ring-1 ring-border/30 ${colorClass}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </div>
      <p className={`reelflow-display reelflow-num mt-4 text-2xl ${danger ? 'text-destructive' : ''}`}>
        {value}
      </p>
      {hint && <p className="mt-2 text-xs leading-5 text-muted-foreground">{hint}</p>}
    </section>
  )
}
