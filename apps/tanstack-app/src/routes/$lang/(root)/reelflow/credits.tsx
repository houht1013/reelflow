import { createFileRoute, Link } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Coins, Crown, History, LockKeyhole, RefreshCw, ShieldCheck, TrendingDown, TrendingUp, WalletCards } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Badge } from '@libs/react-shared/ui/badge'
import { Button } from '@libs/react-shared/ui/button'
import { Input } from '@libs/react-shared/ui/input'
import { Label } from '@libs/react-shared/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@libs/react-shared/ui/table'
import { cn } from '@libs/ui/utils/cn'
import { PageHeader, SkeletonRows } from '@/components/reelflow-ui'

export const Route = createFileRoute('/$lang/(root)/reelflow/credits')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.credits),
  component: ReelflowCreditsPage,
})

// Placeholder custom-amount maths (mirrors the checkout page). Easy to tune later.
const CUSTOM_RATE = 0.09 // $ per credit
const CUSTOM_MIN = 100
const CUSTOM_STEP = 50
const CUSTOM_DEFAULT = 300

type CreditPack = { id: string; credits: number; bonus?: number; amount: number; recommended?: boolean }

type WorkspaceCreditAccount = {
  balance: number
  frozenBalance: number
  debtBalance: number
  totalGranted: number
  totalConsumed: number
  updatedAt: string
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
  ledger: WorkspaceCreditLedger[]
}

function ReelflowCreditsPage() {
  const { t, locale } = useTranslation()
  const r = t.reelflow.credits.recharge
  const [data, setData] = useState<CreditsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customCredits, setCustomCredits] = useState(CUSTOM_DEFAULT)

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
  }, [])

  const formatCredits = (value: number) =>
    new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', { maximumFractionDigits: 2 }).format(value)

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))

  const customAmount = useMemo(() => {
    const credits = Math.max(CUSTOM_MIN, Number(customCredits) || 0)
    return Math.round(credits * CUSTOM_RATE)
  }, [customCredits])

  const account = data?.account
  const ledgerTypeText = (type: string) => (t.reelflow.credits.ledgerTypes as Record<string, string>)[type] || type
  const packs = r.packs as CreditPack[]

  return (
    <main className="min-h-screen" data-testid="reelflow-credits-page">
      <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title={t.reelflow.credits.title}
          actions={
            <>
              <Button type="button" variant="outline" onClick={loadCredits} disabled={loading}>
                <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
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
            {/* Balance + account metrics */}
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <div className="reelflow-hero-panel p-6" data-testid="reelflow-credit-balance">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <WalletCards className="h-4 w-4" aria-hidden="true" />
                      {t.reelflow.credits.balance}
                    </div>
                    <p className="reelflow-display reelflow-num mt-3 text-5xl leading-none sm:text-6xl">{formatCredits(account.balance)}</p>
                  </div>
                  <Badge variant={account.debtBalance > 0 ? 'destructive' : 'secondary'} className="w-fit">
                    {account.debtBalance > 0 ? t.reelflow.credits.debtAttention : t.reelflow.credits.accountHealthy}
                  </Badge>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <CreditMetric icon={LockKeyhole} testId="reelflow-credit-frozen" title={t.reelflow.credits.frozen} value={formatCredits(account.frozenBalance)} hint={t.reelflow.credits.frozenHint} tone="amber" />
                  <CreditMetric icon={AlertTriangle} testId="reelflow-credit-debt" title={t.reelflow.credits.debt} value={formatCredits(account.debtBalance)} hint={t.reelflow.credits.debtHint} danger={account.debtBalance > 0} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <CreditMetric icon={TrendingUp} testId="reelflow-credit-total-granted" title={t.reelflow.credits.totalGranted} value={formatCredits(account.totalGranted)} tone="green" />
                <CreditMetric icon={TrendingDown} testId="reelflow-credit-total-consumed" title={t.reelflow.credits.totalConsumed} value={formatCredits(account.totalConsumed)} tone="blue" />
              </div>
            </section>

            {/* Recharge: 3 packs + custom amount -> checkout (reserved payment selection) */}
            <section className="reelflow-panel p-5" data-testid="reelflow-credit-recharge">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="reelflow-display text-xl">{r.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{r.subtitle}</p>
                </div>
                <Badge variant="secondary" className="gap-1.5">
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                  {t.reelflow.credits.noExpiry}
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {packs.map((pack) => {
                  const total = pack.credits + (pack.bonus || 0)
                  const perCredit = (pack.amount / total).toFixed(3)
                  const href = `/${locale}/checkout?type=credits&pack=${pack.id}`
                  return (
                    <article
                      key={pack.id}
                      className={cn('relative flex flex-col overflow-hidden rounded-2xl p-5', pack.recommended ? 'reelflow-hero-panel ring-1 ring-primary/30' : 'reelflow-soft-tile')}
                      style={{ overflow: 'visible' }}
                      data-testid={`reelflow-credit-pack-${pack.id}`}
                    >
                      {pack.recommended && (
                        <span className="absolute -top-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-[0_8px_20px_-8px_var(--reelflow-coral)]">
                          <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                          {t.reelflow.credits.recommended}
                        </span>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="reelflow-display reelflow-num text-4xl">{total.toLocaleString()}</span>
                        <span className="text-sm text-muted-foreground">{r.unit}</span>
                      </div>
                      {pack.bonus ? (
                        <span className="mt-2 w-fit">
                          <span className="reelflow-pill" data-tone="warning">{r.bonusTag.replace('{n}', String(pack.bonus))}</span>
                        </span>
                      ) : (
                        <span className="mt-2 text-xs text-muted-foreground">{r.perCredit.replace('{n}', perCredit)}</span>
                      )}
                      <div className="mt-5 flex items-end gap-1">
                        <span className="reelflow-display reelflow-num text-3xl">${pack.amount}</span>
                      </div>
                      {pack.bonus ? <span className="mt-1 text-xs text-muted-foreground">{r.perCredit.replace('{n}', perCredit)}</span> : null}
                      <Button asChild size="lg" variant={pack.recommended ? 'default' : 'outline'} className="mt-5 w-full">
                        <a href={href} data-testid={`reelflow-credit-buy-${pack.id}`}>
                          {r.buy}
                          <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                        </a>
                      </Button>
                    </article>
                  )
                })}
              </div>

              {/* Custom amount */}
              <div className="reelflow-muted-tile mt-4 flex flex-col gap-5 rounded-2xl p-5 md:flex-row md:items-end md:justify-between">
                <div className="max-w-md">
                  <h3 className="reelflow-display text-lg">{r.custom.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{r.custom.hint}</p>
                  <div className="mt-4 max-w-xs">
                    <Label htmlFor="custom-credits">{r.custom.label}</Label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Input
                        id="custom-credits"
                        type="number"
                        min={CUSTOM_MIN}
                        step={CUSTOM_STEP}
                        value={customCredits}
                        onChange={(event) => setCustomCredits(Number(event.target.value))}
                        onBlur={() => setCustomCredits((c) => Math.max(CUSTOM_MIN, Math.round(c / CUSTOM_STEP) * CUSTOM_STEP))}
                        className="reelflow-num"
                        data-testid="reelflow-credit-custom-input"
                      />
                      <span className="text-sm text-muted-foreground">{r.unit}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">{r.custom.minHint.replace('{n}', String(CUSTOM_MIN)).replace('{step}', String(CUSTOM_STEP))}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 md:items-end">
                  <div className="md:text-right">
                    <p className="text-xs text-muted-foreground">{r.custom.amountLabel}</p>
                    <p className="reelflow-display reelflow-num text-3xl">${customAmount}</p>
                  </div>
                  <Button asChild size="lg">
                    <a href={`/${locale}/checkout?type=credits&credits=${Math.max(CUSTOM_MIN, customCredits)}&custom=1`} data-testid="reelflow-credit-buy-custom">
                      {r.custom.cta}
                      <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                </div>
              </div>
            </section>

            {/* Ledger */}
            <section className="reelflow-panel overflow-hidden">
              <div className="px-5 py-4 shadow-[inset_0_-1px_0_var(--reelflow-hairline)]">
                <h2 className="reelflow-display text-lg">{t.reelflow.credits.ledgerTitle}</h2>
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
                              {(item.orderId || item.jobId) && <p className="mt-1 text-xs text-muted-foreground">{item.orderId || item.jobId}</p>}
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
      <p className={`reelflow-display reelflow-num mt-4 text-2xl ${danger ? 'text-destructive' : ''}`}>{value}</p>
      {hint && <p className="mt-2 text-xs leading-5 text-muted-foreground">{hint}</p>}
    </section>
  )
}
