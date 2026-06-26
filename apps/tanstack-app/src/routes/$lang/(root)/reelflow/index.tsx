import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { Button } from '@libs/react-shared/ui/button'
import { AlertCircle, ArrowRight, Clock3, Coins, Film, Gift, ImageIcon, Layers3, ListChecks, Loader2, LockKeyhole, Mic2, Play, Sparkles, Video, WandSparkles, type LucideIcon } from 'lucide-react'
import { StatusPill } from '@/components/reelflow-ui'

export const Route = createFileRoute('/$lang/(root)/reelflow/')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.home),
  component: ReelflowHomePage,
})

type HomeCreditSummary = {
  balance: number
  frozenBalance: number
  debtBalance: number
}

type HomeJobSummary = {
  active: number
  issues: number
}

type ReelflowJobHomeItem = {
  id: string
  templateName: string
  status: string
  qualityStatus: string
  debtCredits?: string | number
  createdAt: string
  updatedAt: string
}

type HomeGalleryItem = {
  title: string
  category: string
  description: string
}

type HomeRecommendationItem = {
  title: string
  description: string
}

type ReelflowRouteTo =
  | '/$lang/reelflow/draft'
  | '/$lang/reelflow/image'
  | '/$lang/reelflow/jobs'
  | '/$lang/reelflow/credits'
  | '/$lang/reelflow/templates'

function ReelflowHomePage() {
  const { t, locale } = useTranslation()
  const [homeCredits, setHomeCredits] = useState<HomeCreditSummary | null>(null)
  const [homeJobs, setHomeJobs] = useState<HomeJobSummary>({ active: 0, issues: 0 })
  const [recentJobs, setRecentJobs] = useState<ReelflowJobHomeItem[]>([])

  useEffect(() => {
    let alive = true

    async function loadHomeStatus() {
      try {
        const [creditsResponse, jobsResponse] = await Promise.all([
          fetch('/api/reelflow/credits'),
          fetch('/api/reelflow/jobs?limit=50'),
        ])

        const creditsPayload = await creditsResponse.json()
        if (alive && creditsResponse.ok && creditsPayload?.account) {
          setHomeCredits({
            balance: Number(creditsPayload.account.balance || 0),
            frozenBalance: Number(creditsPayload.account.frozenBalance || 0),
            debtBalance: Number(creditsPayload.account.debtBalance || 0),
          })
        }

        const jobsPayload = await jobsResponse.json()
        if (alive && jobsResponse.ok && Array.isArray(jobsPayload.jobs)) {
          const loadedJobs = jobsPayload.jobs as ReelflowJobHomeItem[]
          const summary = jobsPayload.jobs.reduce(
            (acc: HomeJobSummary, jobItem: ReelflowJobHomeItem) => {
              if (jobItem.status === 'queued' || jobItem.status === 'running') acc.active += 1
              if (jobItem.status === 'failed' || jobItem.qualityStatus === 'needs_fix' || Number(jobItem.debtCredits || 0) > 0) acc.issues += 1
              return acc
            },
            { active: 0, issues: 0 },
          )
          setHomeJobs(summary)
          setRecentJobs(loadedJobs.slice(0, 3))
        }
      } catch {
        // Home status is informational; detailed pages surface actionable errors.
      }
    }

    void loadHomeStatus()
    return () => {
      alive = false
    }
  }, [])

  const statusText = (status: string) => (t.reelflow.status as Record<string, string>)[status] || status

  return (
    <main className="min-h-screen" data-testid="reelflow-home-page">
      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="reelflow-hero-panel reelflow-reveal p-6 sm:p-8" data-delay="1">
              <div className="max-w-3xl">
                <span className="reelflow-eyebrow">{t.reelflow.home.eyebrow}</span>
                <h1 className="reelflow-display mt-4 max-w-2xl text-[2rem] leading-[1.1] sm:text-[2.6rem]">{t.reelflow.home.title}</h1>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  <Button size="lg" asChild>
                    <Link to="/$lang/reelflow/draft" params={{ lang: locale }}>
                      <WandSparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                      {t.reelflow.home.primaryCta}
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="bg-background/60 backdrop-blur" asChild>
                    <Link to="/$lang/reelflow/image" params={{ lang: locale }}>
                      <ImageIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                      {t.reelflow.home.secondaryCta}
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <QuickAction icon={Film} label={t.reelflow.home.actions.draft} to="/$lang/reelflow/draft" lang={locale} />
                <QuickAction icon={ImageIcon} label={t.reelflow.home.actions.image} to="/$lang/reelflow/image" lang={locale} />
                <QuickAction icon={ListChecks} label={t.reelflow.home.actions.tasks} to="/$lang/reelflow/jobs" lang={locale} />
                <QuickAction icon={Coins} label={t.reelflow.home.actions.credits} to="/$lang/reelflow/credits" lang={locale} />
              </div>
            </div>

            <div className="reelflow-panel reelflow-reveal flex flex-col p-5" data-delay="2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{t.reelflow.home.statusTitle}</h2>
                <Link to="/$lang/reelflow/jobs" params={{ lang: locale }} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                  {t.reelflow.common.viewTasks}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <StatusMetric icon={Coins} label={t.reelflow.home.stats.availableCredits} value={homeCredits ? formatHomeNumber(homeCredits.balance, locale) : '--'} loading={!homeCredits} />
                <StatusMetric icon={LockKeyhole} label={t.reelflow.home.stats.frozenCredits} value={homeCredits ? formatHomeNumber(homeCredits.frozenBalance, locale) : '--'} tone="amber" loading={!homeCredits} />
                <StatusMetric icon={Loader2} label={t.reelflow.home.stats.activeTasks} value={formatHomeNumber(homeJobs.active, locale)} tone="blue" />
                <StatusMetric icon={AlertCircle} label={t.reelflow.home.stats.issues} value={formatHomeNumber(homeCredits ? homeJobs.issues + (homeCredits.debtBalance > 0 ? 1 : 0) : homeJobs.issues, locale)} tone="green" />
              </div>
              <div className="mt-5 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t.reelflow.home.recentTasks}</h3>
                <span className="text-xs text-muted-foreground">{recentJobs.length}</span>
              </div>
              <div className="mt-3 space-y-2">
                {recentJobs.length > 0 ? (
                  recentJobs.map((jobItem) => (
                    <Link
                      key={jobItem.id}
                      to="/$lang/reelflow/jobs/$id"
                      params={{ lang: locale, id: jobItem.id }}
                      className="reelflow-muted-tile group flex items-center gap-3 p-3 transition-colors hover:bg-background/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/75 text-muted-foreground ring-1 ring-border/35">
                        <Film className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{jobItem.templateName}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{formatHomeDate(jobItem.updatedAt || jobItem.createdAt, locale)}</span>
                      </span>
                      <StatusPill status={jobItem.status} label={statusText(jobItem.status)} />
                    </Link>
                  ))
                ) : (
                  <p className="reelflow-muted-tile px-3 py-4 text-sm text-muted-foreground">{t.reelflow.home.emptyRecentTasks}</p>
                )}
              </div>
            </div>
          </div>

          <section id="creation" className="reelflow-reveal mt-8" data-delay="3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="reelflow-eyebrow">{t.reelflow.home.createCenterEyebrow}</span>
                <h2 className="reelflow-display mt-3 text-2xl">{t.reelflow.home.createCenterTitle}</h2>
              </div>
              <Button variant="outline" asChild>
                <Link to="/$lang/reelflow/templates" params={{ lang: locale }}>
                  <Layers3 className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t.reelflow.shell.nav.templates}
                </Link>
              </Button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <AbilityCard icon={Film} title={t.reelflow.home.abilities.draft.title} description={t.reelflow.home.abilities.draft.description} to="/$lang/reelflow/draft" lang={locale} cta={t.reelflow.home.primaryCta} />
              <AbilityCard icon={ImageIcon} title={t.reelflow.home.abilities.image.title} description={t.reelflow.home.abilities.image.description} to="/$lang/reelflow/image" lang={locale} cta={t.reelflow.home.secondaryCta} />
              <AbilityCard icon={Video} title={t.reelflow.home.abilities.video.title} description={t.reelflow.home.abilities.video.description} disabled badge={t.reelflow.shell.comingSoon} />
              <AbilityCard icon={Mic2} title={t.reelflow.home.abilities.voice.title} description={t.reelflow.home.abilities.voice.description} disabled badge={t.reelflow.shell.comingSoon} />
            </div>
          </section>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section id="templates" className="reelflow-reveal" data-delay="4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="reelflow-eyebrow">{t.reelflow.home.galleryEyebrow}</span>
                  <h2 className="reelflow-display mt-3 text-2xl">{t.reelflow.home.galleryTitle}</h2>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                  <Layers3 className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(t.reelflow.home.gallery as HomeGalleryItem[]).map((item, index) => (
                  <OfficialWorkCard key={item.title} item={item} index={index} />
                ))}
              </div>
            </section>

            <section className="reelflow-reveal" data-delay="5">
              <span className="reelflow-eyebrow">{t.reelflow.home.recommendationEyebrow}</span>
              <h2 className="reelflow-display mt-3 text-2xl">{t.reelflow.home.recommendationTitle}</h2>
              <div className="mt-4 space-y-3">
                {(t.reelflow.home.recommendations as HomeRecommendationItem[]).map((item, index) => {
                  const RecIcon = [Gift, Sparkles, Layers3][index % 3]
                  return (
                    <div key={item.title} className="reelflow-muted-tile group flex gap-3 p-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/70 text-primary ring-1 ring-border/50">
                        <RecIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}

function QuickAction({ icon: Icon, label, to, lang }: { icon: LucideIcon; label: string; to: ReelflowRouteTo; lang: string }) {
  return (
    <Link to={to} params={{ lang }} className="reelflow-soft-tile group flex min-h-16 items-center gap-3 p-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/70 text-foreground transition-colors group-hover:bg-primary/12 group-hover:text-primary">
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 truncate whitespace-nowrap">{label}</span>
      <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-[transform,opacity] group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
    </Link>
  )
}

function StatusMetric({
  icon: Icon,
  label,
  value,
  tone,
  loading,
}: {
  icon?: LucideIcon
  label: string
  value: string
  tone?: 'amber' | 'blue' | 'green'
  loading?: boolean
}) {
  const color = tone === 'amber' ? 'var(--reelflow-amber)' : tone === 'blue' ? 'var(--reelflow-blue)' : tone === 'green' ? 'var(--reelflow-green)' : 'var(--foreground)'
  return (
    <div className="reelflow-muted-tile p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        <p className="text-xs">{label}</p>
      </div>
      {loading ? (
        <div className="reelflow-skeleton mt-2.5 h-7 w-12" />
      ) : (
        <p className="reelflow-display reelflow-num mt-1.5 text-2xl" style={{ color }}>{value}</p>
      )}
    </div>
  )
}

function AbilityCard({
  icon: Icon,
  title,
  description,
  to,
  lang,
  disabled,
  badge,
  cta,
}: {
  icon: LucideIcon
  title: string
  description: string
  to?: ReelflowRouteTo
  lang?: string
  disabled?: boolean
  badge?: string
  cta?: string
}) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${disabled ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        {disabled && badge && (
          <span className="reelflow-pill" data-tone="neutral">
            <Clock3 aria-hidden="true" />
            {badge}
          </span>
        )}
      </div>
      <div className="mt-5">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {!disabled && cta && (
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          {cta}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      )}
    </>
  )

  if (disabled || !to || !lang) {
    return <div className="reelflow-muted-tile flex flex-col p-5 opacity-90">{content}</div>
  }

  return (
    <Link to={to} params={{ lang }} className="reelflow-soft-tile group flex flex-col p-5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
      {content}
    </Link>
  )
}

function OfficialWorkCard({ item, index }: { item: HomeGalleryItem; index: number }) {
  const palettes = [
    'from-[#2b1116] via-[#f9735b] to-[#f7c66f]',
    'from-[#11151f] via-[#5b7089] to-[#9ec1f0]',
    'from-[#1d160f] via-[#e8932a] to-[#fbe7c2]',
  ]
  return (
    <article className="reelflow-soft-tile group overflow-hidden transition-[transform,box-shadow,border-color] hover:-translate-y-1">
      <div className={`relative aspect-[4/5] bg-gradient-to-br ${palettes[index % palettes.length]} p-4 text-white`}>
        <div className="flex h-full flex-col justify-between">
          <span className="w-fit rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium backdrop-blur">{item.category}</span>
          <div>
            <p className="reelflow-display text-lg leading-tight drop-shadow-sm">{item.title}</p>
            <div className="mt-3 h-1.5 w-20 rounded-full bg-white/70" />
          </div>
        </div>
        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
          <Play className="h-4 w-4 translate-x-px fill-current" aria-hidden="true" />
        </span>
      </div>
      <div className="p-4">
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
      </div>
    </article>
  )
}

function formatHomeNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(value)
}

function formatHomeDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
