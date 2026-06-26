import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { useTranslation } from '@/hooks/use-translation'
import { useState } from 'react'
import { Button } from '@libs/react-shared/ui/button'
import { cn } from '@libs/ui/utils/cn'
import { ArrowRight, Check, Coins, Crown, Shield, Sparkles, Zap } from 'lucide-react'

// Yearly = pay 10 months, get 12 (~17% off). Easy to tune later or move server-side.
const YEARLY_MULTIPLIER = 10

type Billing = 'monthly' | 'yearly'

type Plan = {
  id: string
  name: string
  monthly: number
  credits: number
  free?: boolean
  recommended?: boolean
  inheritFrom?: string
  features: string[]
}

export const Route = createFileRoute('/$lang/(root)/pricing')({
  head: ({ params }) => seoHead(params.lang, (t) => t.pricing.metadata),
  component: PricingPage,
})

function PricingPage() {
  const { t, locale } = useTranslation()
  const v = t.pricing.v2
  const plans = v.plans as Plan[]
  const [billing, setBilling] = useState<Billing>('yearly')
  const yearlySavePct = Math.round((1 - YEARLY_MULTIPLIER / 12) * 100)

  return (
    <div className="reelflow-app min-h-screen">
      <section className="px-5 pb-20 pt-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Hero */}
          <div className="reelflow-reveal mx-auto max-w-2xl text-center">
            <h1 className="reelflow-display text-4xl leading-[1.1] sm:text-5xl">{v.title}</h1>
            <p className="mt-4 text-lg text-foreground/80">{v.subtitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{v.subtitle2}</p>
          </div>

          {/* Billing toggle */}
          <div className="reelflow-reveal mt-8 flex items-center justify-center" data-delay="1">
            <div className="inline-flex items-center rounded-full border border-border/70 bg-muted p-1">
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  billing === 'monthly' ? 'bg-background text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {v.billing.monthly}
              </button>
              <button
                type="button"
                onClick={() => setBilling('yearly')}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  billing === 'yearly' ? 'bg-background text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {v.billing.yearly}
                <span className="reelflow-pill" data-tone="success">{v.billing.save.replace('{n}', String(yearlySavePct))}</span>
              </button>
            </div>
          </div>

          {/* Plans */}
          <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan, index) => {
              const isYearly = billing === 'yearly' && !plan.free
              const perMonth = isYearly ? Math.round((plan.monthly * YEARLY_MULTIPLIER) / 12) : plan.monthly
              const yearlyTotal = plan.monthly * YEARLY_MULTIPLIER
              const showOriginal = isYearly && plan.monthly > 0
              const href = `/${locale}/checkout?type=subscription&plan=${plan.id}&billing=${billing}`
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'reelflow-reveal relative flex flex-col rounded-2xl p-6',
                    plan.recommended ? 'reelflow-hero-panel ring-1 ring-primary/30' : 'reelflow-panel',
                  )}
                  style={{ overflow: 'visible' }}
                  data-delay={String(index + 1)}
                >
                  {plan.recommended && (
                    <span className="absolute -top-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-[0_8px_20px_-8px_var(--reelflow-coral)]">
                      <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                      {v.mostPopular}
                    </span>
                  )}

                  <h3 className="reelflow-display text-xl">{plan.name}</h3>

                  {/* Price */}
                  <div className="mt-4 min-h-[68px]">
                    <div className="flex items-end gap-1.5">
                      {showOriginal ? (
                        <span className="mb-1 text-base text-muted-foreground line-through">${plan.monthly}</span>
                      ) : null}
                      <span className="reelflow-display reelflow-num text-4xl">${perMonth}</span>
                      <span className="mb-1 text-sm text-muted-foreground">{v.billing.perMonth}</span>
                    </div>
                    {plan.free ? null : isYearly ? (
                      <p className="mt-1 text-xs text-muted-foreground">{v.billing.billedYearlyAs.replace('{total}', String(yearlyTotal))}</p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">{v.billing.billedMonthly}</p>
                    )}
                  </div>

                  {/* Credits */}
                  <div className="mt-2">
                    <span className="reelflow-pill" data-tone="brand">
                      <Coins className="h-3.5 w-3.5" aria-hidden="true" />
                      {v.monthlyCredits.replace('{n}', plan.credits.toLocaleString())}
                    </span>
                  </div>

                  {/* CTA */}
                  {plan.free ? (
                    <Button size="lg" variant="outline" className="mt-5 w-full" disabled>
                      {v.currentFree}
                    </Button>
                  ) : (
                    <Button asChild size="lg" variant={plan.recommended ? 'default' : 'outline'} className="mt-5 w-full">
                      <a href={href}>
                        {v.subscribe} {plan.name}
                        <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                      </a>
                    </Button>
                  )}

                  {/* Features */}
                  {plan.inheritFrom ? (
                    <p className="mt-5 text-sm text-muted-foreground">{v.includesPrefix.replace('{name}', plan.inheritFrom)}</p>
                  ) : (
                    <div className="mt-5" />
                  )}
                  <ul className="mt-3 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm leading-6">
                        <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full', plan.recommended ? 'bg-primary text-primary-foreground' : 'bg-primary/12 text-primary')}>
                          <Check className="h-3 w-3" aria-hidden="true" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          {/* Trust row */}
          <div className="reelflow-reveal mt-16 grid gap-6 md:grid-cols-3" data-delay="2">
            {(v.trust as Array<{ title: string; desc: string }>).map((item, index) => {
              const Icon = [Shield, Zap, Sparkles][index % 3]
              return (
                <div key={item.title} className="flex flex-col items-center gap-3 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="max-w-xs text-sm leading-6 text-muted-foreground">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
