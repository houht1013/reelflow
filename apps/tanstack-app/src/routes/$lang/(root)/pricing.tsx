import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { useTranslation } from '@/hooks/use-translation'
import { useMemo, useState } from 'react'
import { Button } from '@libs/react-shared/ui/button'
import { Input } from '@libs/react-shared/ui/input'
import { Label } from '@libs/react-shared/ui/label'
import { cn } from '@libs/ui/utils/cn'
import { ArrowRight, Check, Coins, CreditCard, Crown, Shield, Sparkles, Zap } from 'lucide-react'

/** Placeholder pricing maths — easy to tune later or move server-side. */
const YEARLY_MULTIPLIER = 10 // pay 10 months, get 12 (≈17% off)
const CUSTOM_RATE = 0.09 // ¥ per credit at base (no bonus)
const CUSTOM_MIN = 100
const CUSTOM_STEP = 50
const CUSTOM_DEFAULT = 300

type Billing = 'monthly' | 'yearly'
type Tab = 'subscription' | 'credits'

type SubPlan = {
  id: string
  name: string
  tagline: string
  monthly: number
  credits: number
  recommended?: boolean
  features: string[]
}

type CreditPack = {
  id: string
  credits: number
  bonus?: number
  amount: number
  recommended?: boolean
}

export const Route = createFileRoute('/$lang/(root)/pricing')({
  head: ({ params }) => seoHead(params.lang, (t) => t.pricing.metadata),
  component: PricingPage,
})

function PricingPage() {
  const { t, locale } = useTranslation()
  const v = t.pricing.v2
  const [tab, setTab] = useState<Tab>('subscription')
  const [billing, setBilling] = useState<Billing>('yearly')

  const yearlySavePct = Math.round((1 - YEARLY_MULTIPLIER / 12) * 100)

  return (
    <div className="reelflow-app min-h-screen">
      <section className="px-5 pb-20 pt-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Hero */}
          <div className="reelflow-reveal mx-auto max-w-2xl text-center">
            <span className="reelflow-eyebrow justify-center">{v.eyebrow}</span>
            <h1 className="reelflow-display mt-4 text-4xl leading-[1.08] sm:text-5xl">{v.title}</h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">{v.subtitle}</p>
          </div>

          {/* Tab switcher */}
          <div className="reelflow-reveal mt-9 flex justify-center" data-delay="1">
            <div className="inline-flex rounded-full border border-border/60 bg-card/60 p-1 shadow-xs backdrop-blur">
              <TabButton active={tab === 'subscription'} onClick={() => setTab('subscription')} icon={CreditCard}>
                {v.tabs.subscription}
              </TabButton>
              <TabButton active={tab === 'credits'} onClick={() => setTab('credits')} icon={Coins}>
                {v.tabs.credits}
              </TabButton>
            </div>
          </div>

          {tab === 'subscription' ? (
            <SubscriptionView
              plans={v.subscriptionPlans as SubPlan[]}
              billing={billing}
              setBilling={setBilling}
              yearlySavePct={yearlySavePct}
              v={v}
              locale={locale}
            />
          ) : (
            <CreditsView v={v} locale={locale} />
          )}

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

function SubscriptionView({
  plans,
  billing,
  setBilling,
  yearlySavePct,
  v,
  locale,
}: {
  plans: SubPlan[]
  billing: Billing
  setBilling: (b: Billing) => void
  yearlySavePct: number
  v: any
  locale: string
}) {
  return (
    <>
      {/* Billing toggle */}
      <div className="reelflow-reveal mt-7 flex items-center justify-center gap-3" data-delay="1">
        <div className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => setBilling('monthly')}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              billing === 'monthly' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {v.billing.monthly}
          </button>
          <button
            type="button"
            onClick={() => setBilling('yearly')}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              billing === 'yearly' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {v.billing.yearly}
            <span className="reelflow-pill" data-tone="success">
              {v.billing.save.replace('{n}', String(yearlySavePct))}
            </span>
          </button>
        </div>
      </div>

      <div className="mt-9 grid gap-5 lg:grid-cols-3">
        {plans.map((plan, index) => {
          const perMonth = billing === 'yearly' ? Math.round((plan.monthly * YEARLY_MULTIPLIER) / 12) : plan.monthly
          const yearlyTotal = plan.monthly * YEARLY_MULTIPLIER
          const href = `/${locale}/checkout?type=subscription&plan=${plan.id}&billing=${billing}`
          return (
            <div
              key={plan.id}
              className={cn(
                'reelflow-reveal relative flex flex-col rounded-2xl p-6',
                plan.recommended
                  ? 'reelflow-hero-panel ring-1 ring-primary/30'
                  : 'reelflow-panel',
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

              <div>
                <h3 className="reelflow-display text-xl">{plan.name}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{plan.tagline}</p>
              </div>

              <div className="mt-5">
                <div className="flex items-end gap-1">
                  <span className="reelflow-display reelflow-num text-4xl">¥{perMonth}</span>
                  <span className="mb-1 text-sm text-muted-foreground">{v.billing.perMonth}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {billing === 'yearly'
                    ? v.billing.billedYearlyAs.replace('{total}', String(yearlyTotal))
                    : v.billing.billedMonthly}
                </p>
              </div>

              <div className="mt-4">
                <span className="reelflow-pill" data-tone="brand">
                  <Coins className="h-3.5 w-3.5" aria-hidden="true" />
                  {v.monthlyCredits.replace('{n}', plan.credits.toLocaleString())}
                </span>
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm leading-6">
                    <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full', plan.recommended ? 'bg-primary text-primary-foreground' : 'bg-primary/12 text-primary')}>
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button asChild size="lg" variant={plan.recommended ? 'default' : 'outline'} className="mt-6 w-full">
                <a href={href}>
                  {v.choosePlan}
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </div>
          )
        })}
      </div>
    </>
  )
}

function CreditsView({ v, locale }: { v: any; locale: string }) {
  const packs = v.credits.packs as CreditPack[]
  const [customCredits, setCustomCredits] = useState(CUSTOM_DEFAULT)

  const customAmount = useMemo(() => {
    const credits = Math.max(CUSTOM_MIN, Number(customCredits) || 0)
    return Math.round(credits * CUSTOM_RATE)
  }, [customCredits])

  return (
    <div className="mt-9">
      <div className="reelflow-reveal mx-auto mb-7 max-w-xl text-center" data-delay="1">
        <h2 className="reelflow-display text-2xl">{v.credits.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{v.credits.subtitle}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {packs.map((pack, index) => {
          const total = pack.credits + (pack.bonus || 0)
          const perCredit = (pack.amount / total).toFixed(3)
          const href = `/${locale}/checkout?type=credits&pack=${pack.id}`
          return (
            <div
              key={pack.id}
              className={cn(
                'reelflow-reveal relative flex flex-col rounded-2xl p-6',
                pack.recommended ? 'reelflow-hero-panel ring-1 ring-primary/30' : 'reelflow-panel',
              )}
              style={{ overflow: 'visible' }}
              data-delay={String(index + 1)}
            >
              {pack.recommended && (
                <span className="absolute -top-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-[0_8px_20px_-8px_var(--reelflow-coral)]">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {v.mostPopular}
                </span>
              )}

              <div className="flex items-baseline gap-2">
                <span className="reelflow-display reelflow-num text-4xl">{total.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">{v.credits.unit}</span>
              </div>
              {pack.bonus ? (
                <span className="mt-2 w-fit">
                  <span className="reelflow-pill" data-tone="warning">
                    {v.credits.bonusTag.replace('{n}', String(pack.bonus))}
                  </span>
                </span>
              ) : (
                <span className="mt-2 text-xs text-muted-foreground">{v.credits.perCredit.replace('{n}', perCredit)}</span>
              )}

              <div className="mt-5 flex items-end gap-1">
                <span className="reelflow-display reelflow-num text-3xl">¥{pack.amount}</span>
              </div>
              {pack.bonus ? (
                <span className="mt-1 text-xs text-muted-foreground">{v.credits.perCredit.replace('{n}', perCredit)}</span>
              ) : null}

              <Button asChild size="lg" variant={pack.recommended ? 'default' : 'outline'} className="mt-6 w-full">
                <a href={href}>
                  {v.credits.buy}
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </div>
          )
        })}
      </div>

      {/* Custom amount */}
      <div className="reelflow-reveal reelflow-panel mt-5 flex flex-col gap-5 rounded-2xl p-6 md:flex-row md:items-end md:justify-between" data-delay="2">
        <div className="max-w-md">
          <h3 className="reelflow-display text-lg">{v.credits.custom.title}</h3>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{v.credits.custom.hint}</p>
          <div className="mt-4 max-w-xs">
            <Label htmlFor="custom-credits">{v.credits.custom.label}</Label>
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
              />
              <span className="text-sm text-muted-foreground">{v.credits.unit}</span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {v.credits.custom.minHint.replace('{n}', String(CUSTOM_MIN)).replace('{step}', String(CUSTOM_STEP))}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          <div className="md:text-right">
            <p className="text-xs text-muted-foreground">{v.credits.custom.amountLabel}</p>
            <p className="reelflow-display reelflow-num text-3xl">¥{customAmount}</p>
          </div>
          <Button asChild size="lg">
            <a href={`/${locale}/checkout?type=credits&credits=${Math.max(CUSTOM_MIN, customCredits)}&custom=1`}>
              {v.credits.custom.cta}
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Coins
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors',
        active ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </button>
  )
}
