import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { useTranslation } from '@/hooks/use-translation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@libs/react-shared/ui/button'
import { cn } from '@libs/ui/utils/cn'
import { ArrowLeft, Check, CreditCard, Globe, Lock, PackageOpen, QrCode } from 'lucide-react'

// Mirrors the placeholder maths used on the pricing page.
const YEARLY_MULTIPLIER = 10
const CUSTOM_RATE = 0.09
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
  const [method, setMethod] = useState<string>('wechat')

  const order = resolveOrder(search, v, c)

  const methods = [
    { id: 'wechat', label: c.methods.wechat, desc: c.methods.wechatDesc, icon: QrCode },
    { id: 'alipay', label: c.methods.alipay, desc: c.methods.alipayDesc, icon: QrCode },
    { id: 'card', label: c.methods.card, desc: c.methods.cardDesc, icon: CreditCard },
    { id: 'paypal', label: c.methods.paypal, desc: c.methods.paypalDesc, icon: Globe },
  ]

  const handleConfirm = () => {
    // Reserved design: payment channels are wired up later. Surface the
    // selected method so the flow reads as intentional, then stop here.
    toast.info(c.reservedNote)
  }

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

                <Button size="lg" className="mt-5 w-full" onClick={handleConfirm}>
                  <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
                  {c.confirm}
                </Button>
              </aside>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function resolveOrder(search: CheckoutSearch, v: any, c: any): Order | null {
  if (search.type === 'subscription' && search.plan) {
    const plan = (v.subscriptionPlans as any[]).find((p) => p.id === search.plan)
    if (!plan) return null
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
      const pack = (v.credits.packs as any[]).find((p) => p.id === search.pack)
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
