import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { useTranslation } from '@/hooks/use-translation'
import { useRef, useState } from 'react'
import { Button } from '@libs/react-shared/ui/button'
import { cn } from '@libs/ui/utils/cn'
import { ArrowRight, Check, ChevronDown, Coins, Crown, Shield, Sparkles, Zap } from 'lucide-react'
import { LandingAtmosphere, LandingFooter, useScrollFX, useScrollReveal } from '@/components/landing-fx'

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
  const faq = v.faq as Array<{ q: string; a: string }>
  const [billing, setBilling] = useState<Billing>('yearly')
  const yearlySavePct = Math.round((1 - YEARLY_MULTIPLIER / 12) * 100)

  const heroRef = useRef<HTMLElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  useScrollReveal()
  useScrollFX(progressRef, heroRef)

  return (
    <main className="reelflow-landing min-h-screen overflow-hidden text-white" data-testid="reelflow-pricing-page">
      <div ref={progressRef} className="landing-scroll-progress" aria-hidden="true" />

      {/* Hero + plans */}
      <section ref={heroRef} className="relative px-5 pb-20 pt-16 md:px-8">
        <LandingAtmosphere />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="reelflow-display text-4xl leading-[1.1] sm:text-5xl" data-reveal style={rd(0)}>
              {v.title}
            </h1>
            <p className="mt-4 text-lg text-white/70" data-reveal style={rd(80)}>
              {v.subtitle}
            </p>
            <p className="mt-1 text-sm text-white/45" data-reveal style={rd(140)}>
              {v.subtitle2}
            </p>
          </div>

          {/* Billing toggle */}
          <div className="mt-9 flex items-center justify-center" data-reveal style={rd(200)}>
            <div className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.05] p-1 backdrop-blur">
              {(['monthly', 'yearly'] as Billing[]).map((mode) => {
                const active = billing === mode
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBilling(mode)}
                    aria-pressed={active}
                    className={cn(
                      'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-white text-slate-950 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.7)]'
                        : 'text-white/65 hover:text-white',
                    )}
                  >
                    {mode === 'monthly' ? v.billing.monthly : v.billing.yearly}
                    {mode === 'yearly' && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[0.7rem] font-semibold leading-none',
                          active ? 'bg-emerald-500/15 text-emerald-600' : 'bg-emerald-400/15 text-emerald-300',
                        )}
                      >
                        {v.billing.save.replace('{n}', String(yearlySavePct))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Plans */}
          <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                    'landing-panel relative flex flex-col rounded-2xl p-6',
                    plan.recommended && 'ring-1 ring-[#ff6045]/45 shadow-[0_34px_90px_-44px_rgba(255,96,69,0.55)]',
                  )}
                  style={{ overflow: 'visible', ...rd(index * 90) }}
                  data-reveal
                >
                  {plan.recommended && (
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      style={{ background: 'radial-gradient(circle at 75% -12%, rgb(255 96 69 / 22%), transparent 16rem)' }}
                      aria-hidden="true"
                    />
                  )}
                  {plan.recommended && (
                    <span className="absolute -top-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#ff6045] px-3 py-1 text-xs font-semibold text-white shadow-[0_10px_24px_-10px_#ff6045]">
                      <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                      {v.mostPopular}
                    </span>
                  )}

                  <div className="relative">
                    <h3 className="reelflow-display text-xl text-white">{plan.name}</h3>

                    {/* Price */}
                    <div className="mt-4 min-h-[68px]">
                      <div className="flex items-end gap-1.5">
                        {showOriginal ? (
                          <span className="mb-1 text-base text-white/40 line-through">${plan.monthly}</span>
                        ) : null}
                        <span className="reelflow-display reelflow-num text-4xl text-white">${perMonth}</span>
                        <span className="mb-1 text-sm text-white/45">{v.billing.perMonth}</span>
                      </div>
                      {plan.free ? null : isYearly ? (
                        <p className="mt-1 text-xs text-white/45">{v.billing.billedYearlyAs.replace('{total}', String(yearlyTotal))}</p>
                      ) : (
                        <p className="mt-1 text-xs text-white/45">{v.billing.billedMonthly}</p>
                      )}
                    </div>

                    {/* Credits */}
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-white/85">
                        <Coins className="h-3.5 w-3.5 text-[#ffb84d]" aria-hidden="true" />
                        {v.monthlyCredits.replace('{n}', plan.credits.toLocaleString())}
                      </span>
                    </div>

                    {/* CTA */}
                    {plan.free ? (
                      <Button
                        size="lg"
                        variant="outline"
                        className="mt-5 w-full border-white/15 bg-white/[0.05] text-white/70 hover:bg-white/[0.05]"
                        disabled
                      >
                        {v.currentFree}
                      </Button>
                    ) : plan.recommended ? (
                      <Button
                        asChild
                        size="lg"
                        className="landing-cta mt-5 w-full bg-[#ff6045] text-white shadow-[0_18px_44px_-22px_#ff6045] transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[#ff735b]"
                      >
                        <a href={href}>
                          {v.subscribe} {plan.name}
                          <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                        </a>
                      </Button>
                    ) : (
                      <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="mt-5 w-full border-white/18 bg-white/[0.04] text-white transition-transform hover:-translate-y-0.5 hover:bg-white/[0.09] hover:text-white"
                      >
                        <a href={href}>
                          {v.subscribe} {plan.name}
                          <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                        </a>
                      </Button>
                    )}

                    {/* Features */}
                    {plan.inheritFrom ? (
                      <p className="mt-5 text-sm text-white/55">{v.includesPrefix.replace('{name}', plan.inheritFrom)}</p>
                    ) : (
                      <div className="mt-5" />
                    )}
                    <ul className="mt-3 flex-1 space-y-2.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5 text-sm leading-6 text-white/75">
                          <span
                            className={cn(
                              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                              plan.recommended ? 'bg-[#ff6045] text-white' : 'bg-[#ff6045]/18 text-[#ff8e78]',
                            )}
                          >
                            <Check className="h-3 w-3" aria-hidden="true" />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Trust row */}
          <div className="mt-16 grid gap-6 md:grid-cols-3" data-reveal style={rd(120)}>
            {(v.trust as Array<{ title: string; desc: string }>).map((item, index) => {
              const Icon = [Shield, Zap, Sparkles][index % 3]
              return (
                <div key={item.title} className="flex flex-col items-center gap-3 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-[#ffb84d]">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="max-w-xs text-sm leading-6 text-white/55">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="reelflow-display text-center text-3xl leading-tight md:text-4xl" data-reveal>
            {v.faqTitle}
          </h2>
          <div className="mt-10 space-y-3">
            {faq.map((item, index) => (
              <details
                key={item.q}
                className="group rounded-xl border border-white/10 bg-white/[0.035] px-5 py-4 transition-colors hover:border-white/20"
                data-reveal
                style={rd(index * 70)}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-white [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-white/50 transition-transform duration-300 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-3 text-sm leading-7 text-white/60">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}

/** data-reveal stagger delay helper. */
function rd(ms: number): React.CSSProperties {
  return { '--reveal-delay': `${ms}ms` } as React.CSSProperties
}
