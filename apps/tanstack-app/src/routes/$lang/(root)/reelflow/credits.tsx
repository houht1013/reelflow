import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import { AlertTriangle, ArrowRight, Coins, CreditCard, History, Loader2, RefreshCw, WalletCards } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Badge } from '@libs/react-shared/ui/badge'
import { Button } from '@libs/react-shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@libs/react-shared/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@libs/react-shared/ui/table'

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
    return new Date(value).toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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
    <main className="min-h-screen bg-background" data-testid="reelflow-credits-page">
      <section className="border-b bg-muted/20">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <WalletCards className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{data?.workspace.name || t.reelflow.common.productName}</p>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t.reelflow.credits.title}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{t.reelflow.credits.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadCredits} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {t.reelflow.common.refresh}
            </Button>
            <Button variant="outline" asChild>
              <a href={`/${locale}/reelflow/jobs`}>
                <History className="mr-2 h-4 w-4" />
                {t.reelflow.common.viewTasks}
              </a>
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t.reelflow.credits.loadError}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading ? (
          <div className="flex h-56 items-center justify-center rounded-lg border">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : data && account ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <CreditMetric testId="reelflow-credit-balance" title={t.reelflow.credits.balance} value={formatCredits(account.balance)} />
              <CreditMetric testId="reelflow-credit-frozen" title={t.reelflow.credits.frozen} value={formatCredits(account.frozenBalance)} />
              <CreditMetric testId="reelflow-credit-debt" title={t.reelflow.credits.debt} value={formatCredits(account.debtBalance)} danger={account.debtBalance > 0} />
              <CreditMetric testId="reelflow-credit-total-granted" title={t.reelflow.credits.totalGranted} value={formatCredits(account.totalGranted)} />
              <CreditMetric testId="reelflow-credit-total-consumed" title={t.reelflow.credits.totalConsumed} value={formatCredits(account.totalConsumed)} />
            </section>

            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{t.reelflow.credits.buyTitle}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t.reelflow.credits.buyDescription}</p>
                </div>
                <Badge variant="secondary">{t.reelflow.credits.noExpiry}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.plans.map((plan) => {
                  const planText = plan.i18n?.[locale] || plan.i18n?.en
                  return (
                    <article key={plan.id} className="flex min-h-64 flex-col rounded-lg border bg-background p-5" data-testid={`reelflow-credit-plan-${plan.id}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold">{planText?.name || plan.id}</h3>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{planText?.description}</p>
                        </div>
                        {plan.recommended && <Badge>{t.reelflow.credits.recommended}</Badge>}
                      </div>
                      <div className="mt-5">
                        <p className="text-3xl font-semibold">
                          {formatCredits(plan.credits)}
                          <span className="ml-2 text-sm font-normal text-muted-foreground">{t.reelflow.common.credits}</span>
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {formatMoney(plan.amount, plan.currency)} · {providerText(plan.provider)}
                        </p>
                      </div>
                      <div className="mt-auto pt-5">
                        <Button className="w-full" onClick={() => buyPlan(plan)} disabled={buyingPlanId === plan.id} data-testid={`reelflow-buy-plan-${plan.id}`}>
                          {buyingPlanId === plan.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="mr-2 h-4 w-4" />
                          )}
                          {t.reelflow.credits.buyNow}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
              <div className="border-b px-5 py-4">
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
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">{t.reelflow.credits.wechatQrTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {qrCodeUrl && <img src={qrCodeUrl} alt={t.reelflow.credits.wechatQrAlt} className="h-64 w-64" />}
            <p className="text-center text-sm text-muted-foreground">{t.reelflow.credits.wechatQrHint}</p>
            {qrOrderId && <p className="text-xs text-muted-foreground">{qrOrderId}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function CreditMetric({ testId, title, value, danger = false }: { testId: string; title: string; value: string; danger?: boolean }) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm" data-testid={testId}>
      <div className="flex items-center gap-3">
        <div className={danger ? 'flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive' : 'flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'}>
          <Coins className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </div>
      <p className={danger ? 'mt-4 text-2xl font-semibold text-destructive' : 'mt-4 text-2xl font-semibold'}>
        {value}
      </p>
    </section>
  )
}
