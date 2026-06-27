import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { useTranslation } from '@/hooks/use-translation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import { Button } from '@libs/react-shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@libs/react-shared/ui/dialog'
import { cn } from '@libs/ui/utils/cn'
import { ArrowLeft, Check, CheckCircle2, CreditCard, Globe, Loader2, Lock, PackageOpen, QrCode, RefreshCw } from 'lucide-react'

type PayPhase = 'loading' | 'pending' | 'paid' | 'expired' | 'error'
const PAY_WINDOW_SECONDS = 180

const YEARLY_MULTIPLIER = 10
const CUSTOM_RATE = 1 // ¥ per credit (1元 = 1积分)
const CUSTOM_MIN = 100

type CheckoutSearch = {
  type?: 'subscription' | 'credits'
  plan?: string
  billing?: 'monthly' | 'yearly'
  pack?: string
  credits?: number
  custom?: boolean
}

export const Route = createFileRoute('/$lang/(root)/checkout')({
  validateSearch: (search: Record<string, unknown>): CheckoutSearch => ({
    type: search.type === 'credits' ? 'credits' : search.type === 'subscription' ? 'subscription' : undefined,
    plan: typeof search.plan === 'string' ? search.plan : undefined,
    billing: search.billing === 'yearly' ? 'yearly' : search.billing === 'monthly' ? 'monthly' : undefined,
    pack: typeof search.pack === 'string' ? search.pack : undefined,
    credits: search.credits != null ? Number(search.credits) : undefined,
    custom: search.custom === '1' || search.custom === 1 || search.custom === true,
  }),
  head: ({ params }) => seoHead(params.lang, (t) => t.pricing.checkout.metadata),
  component: CheckoutPage,
})

type Order = {
  title: string
  meta: string | null
  amount: number
  bonus?: number
}

function CheckoutPage() {
  const { t, locale } = useTranslation()
  const c = t.pricing.checkout
  const v = t.pricing.v2
  const search = Route.useSearch()
  const [method, setMethod] = useState<string>('alipay')
  const [payOpen, setPayOpen] = useState(false)
  const [phase, setPhase] = useState<PayPhase>('loading')
  const [qr, setQr] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(PAY_WINDOW_SECONDS)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const order = resolveOrder(search, v, c, t.reelflow.credits.recharge)
  const planId = resolveBackendPlanId(search)

  const stopTimers = () => {
    if (tickRef.current) clearInterval(tickRef.current)
    if (pollRef.current) clearInterval(pollRef.current)
    tickRef.current = null
    pollRef.current = null
  }

  // Clean up timers on unmount.
  useEffect(() => stopTimers, [])

  const startPayment = async () => {
    if (method !== 'alipay' || !planId) {
      toast.info(c.reservedNote)
      return
    }
    stopTimers()
    setPayOpen(true)
    setPhase('loading')
    setQr('')
    setSecondsLeft(PAY_WINDOW_SECONDS)
    try {
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, provider: 'alipay' }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.paymentUrl || !data?.orderId) {
        setPhase('error')
        return
      }
      const dataUrl = await QRCode.toDataURL(data.paymentUrl, { width: 240, margin: 1 })
      setQr(dataUrl)
      setPhase('pending')

      tickRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            stopTimers()
            setPhase('expired')
            return 0
          }
          return s - 1
        })
      }, 1000)

      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/payment/status?orderId=${encodeURIComponent(data.orderId)}`)
          const d = await r.json().catch(() => null)
          if (d?.status === 'paid') {
            stopTimers()
            setPhase('paid')
          } else if (d?.status === 'canceled') {
            stopTimers()
            setPhase('expired')
          }
        } catch {
          /* keep polling */
        }
      }, 3000)
    } catch {
      setPhase('error')
    }
  }

  const closePay = (open: boolean) => {
    if (!open) {
      stopTimers()
      setPayOpen(false)
    }
  }

  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`

  const methods = [
    { id: 'wechat', label: c.methods.wechat, desc: c.methods.wechatDesc, icon: QrCode },
    { id: 'alipay', label: c.methods.alipay, desc: c.methods.alipayDesc, icon: QrCode },
    { id: 'card', label: c.methods.card, desc: c.methods.cardDesc, icon: CreditCard },
    { id: 'paypal', label: c.methods.paypal, desc: c.methods.paypalDesc, icon: Globe },
  ]

  return (
    <div className="reelflow-app min-h-screen">
      <section className="px-5 py-12 md:px-8">
        <div className="mx-auto max-w-4xl">
          <a
            href={`/${locale}/pricing`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {c.back}
          </a>

          <div className="reelflow-reveal mt-4">
            <span className="reelflow-eyebrow">{c.eyebrow}</span>
            <h1 className="reelflow-display mt-3 text-3xl leading-tight sm:text-4xl">{c.title}</h1>
          </div>

          {!order ? (
            <div className="reelflow-panel reelflow-reveal mt-8 flex flex-col items-center px-6 py-14 text-center" data-delay="1">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <PackageOpen className="h-7 w-7" aria-hidden="true" />
              </span>
              <h2 className="reelflow-display mt-5 text-xl">{c.emptyTitle}</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{c.emptyHint}</p>
              <Button asChild className="mt-6">
                <a href={`/${locale}/pricing`}>{c.toPricing}</a>
              </Button>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
              {/* Payment method selection (reserved design) */}
              <section className="reelflow-panel reelflow-reveal p-6" data-delay="1">
                <h2 className="reelflow-display text-lg">{c.methodTitle}</h2>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{c.methodHint}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {methods.map((item) => {
                    const Icon = item.icon
                    const active = method === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setMethod(item.id)}
                        aria-pressed={active}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                          active
                            ? 'border-primary/50 bg-primary/[0.06] shadow-[var(--reelflow-tile-shadow)]'
                            : 'border-border/55 bg-background/50 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background',
                        )}
                      >
                        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{item.label}</span>
                          <span className="block text-xs text-muted-foreground">{item.desc}</span>
                        </span>
                        <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border', active ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                          {active && <Check className="h-3 w-3" aria-hidden="true" />}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="reelflow-muted-tile mt-4 flex items-start gap-2.5 p-3.5 text-sm text-muted-foreground">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--reelflow-amber)' }} aria-hidden="true" />
                  <span>{c.reservedNote}</span>
                </div>
              </section>

              {/* Order summary */}
              <aside className="reelflow-panel reelflow-reveal h-fit p-6 lg:sticky lg:top-24" data-delay="2">
                <h2 className="reelflow-display text-lg">{c.orderSummary}</h2>

                <div className="reelflow-muted-tile mt-4 p-4">
                  <p className="font-semibold">{order.title}</p>
                  {order.meta && <p className="mt-1 text-sm text-muted-foreground">{order.meta}</p>}
                  {order.bonus ? (
                    <span className="mt-3 inline-block">
                      <span className="reelflow-pill" data-tone="warning">
                        {c.bonusIncluded.replace('{n}', String(order.bonus))}
                      </span>
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <span className="text-sm text-muted-foreground">{c.total}</span>
                  <span className="reelflow-display reelflow-num text-3xl">¥{order.amount}</span>
                </div>

                <Button size="lg" className="mt-5 w-full" onClick={startPayment}>
                  <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
                  {c.confirm}
                </Button>
              </aside>
            </div>
          )}
        </div>
      </section>

      <Dialog open={payOpen} onOpenChange={closePay}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="text-center">
            {phase === 'paid' ? c.paidTitle : phase === 'expired' ? c.expiredTitle : c.qrTitle}
          </DialogTitle>

          {phase === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
              {c.qrGenerating}
            </div>
          )}

          {phase === 'pending' && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="rounded-2xl border border-border bg-white p-3 shadow-sm">
                {qr ? <img src={qr} alt="" width={216} height={216} className="h-[216px] w-[216px]" /> : null}
              </div>
              {order ? <p className="reelflow-display reelflow-num text-2xl">¥{order.amount}</p> : null}
              <p className="text-sm text-muted-foreground">{c.qrHint}</p>
              <p className="text-sm">
                <span className="text-muted-foreground">{c.qrExpiresIn} </span>
                <span className="reelflow-num font-semibold text-foreground">{countdown}</span>
              </p>
            </div>
          )}

          {phase === 'paid' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--reelflow-green)_16%,transparent)]">
                <CheckCircle2 className="h-8 w-8" style={{ color: 'var(--reelflow-green)' }} aria-hidden="true" />
              </span>
              <p className="text-sm text-muted-foreground">{c.paidHint}</p>
              <div className="grid w-full gap-2">
                <Button asChild size="lg" className="w-full">
                  <a href={`/${locale}/reelflow`}>{c.backToWorkbench}</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <a href={`/${locale}/reelflow/credits`}>{c.viewCredits}</a>
                </Button>
              </div>
            </div>
          )}

          {phase === 'expired' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-sm text-muted-foreground">{c.expiredHint}</p>
              <Button size="lg" className="w-full" onClick={startPayment}>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                {c.regenerate}
              </Button>
            </div>
          )}

          {phase === 'error' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-sm text-muted-foreground">{c.payError}</p>
              <Button size="lg" className="w-full" onClick={startPayment}>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                {c.regenerate}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Maps the checkout query (pricing tier + billing, or a credit pack) to a
// backend plan id in config.payment.plans. Custom credit amounts return null
// (no fixed plan yet) and stay reserved.
function resolveBackendPlanId(search: CheckoutSearch): string | null {
  if (search.type === 'subscription' && search.plan && search.plan !== 'free') {
    const billing = search.billing === 'yearly' ? 'yearly' : 'monthly'
    return `reelflow_${search.plan}_${billing}`
  }
  if (search.type === 'credits' && search.pack) {
    return `reelflow_credits_${search.pack}`
  }
  return null
}

function resolveOrder(search: CheckoutSearch, v: any, c: any, r: any): Order | null {
  if (search.type === 'subscription' && search.plan) {
    const plan = (v.plans as any[]).find((p) => p.id === search.plan)
    if (!plan || plan.free) return null
    const yearly = search.billing === 'yearly'
    const amount = yearly ? plan.monthly * YEARLY_MULTIPLIER : plan.monthly
    return {
      title: c.subscriptionItem.replace('{name}', plan.name),
      meta: `${yearly ? c.cycleYearly : c.cycleMonthly} · ${v.monthlyCredits.replace('{n}', plan.credits.toLocaleString())}`,
      amount,
    }
  }

  if (search.type === 'credits') {
    if (search.pack) {
      const pack = (r.packs as any[]).find((p) => p.id === search.pack)
      if (!pack) return null
      const total = pack.credits + (pack.bonus || 0)
      return {
        title: c.creditsItem.replace('{n}', total.toLocaleString()),
        meta: null,
        amount: pack.amount,
        bonus: pack.bonus,
      }
    }
    if (search.custom && search.credits) {
      const credits = Math.max(CUSTOM_MIN, Number(search.credits) || 0)
      return {
        title: c.creditsItem.replace('{n}', credits.toLocaleString()),
        meta: null,
        amount: Math.round(credits * CUSTOM_RATE),
      }
    }
  }

  return null
}
