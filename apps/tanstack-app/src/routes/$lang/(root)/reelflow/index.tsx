import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { Button } from '@libs/react-shared/ui/button'
import {
  ArrowRight,
  Coins,
  Download,
  Flame,
  Loader2,
  Plus,
  Snowflake,
  Sparkles,
  Star,
} from 'lucide-react'
import { StatusPill, StatCard, SkeletonRows, categoryVisual } from '@/components/reelflow-ui'
import { ossThumb } from '@/lib/image-url'

export const Route = createFileRoute('/$lang/(root)/reelflow/')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.home),
  component: ReelflowHomePage,
})

type HomeCreditSummary = { balance: number; frozenBalance: number; debtBalance: number }

type ReelflowJobHomeItem = {
  id: string
  templateName: string
  category?: string | null
  status: string
  qualityStatus: string
  artifactStatus?: string
  debtCredits?: string | number
  createdAt: string
  updatedAt: string
}

type HomeTemplateItem = {
  id: string
  code: string
  name: string
  category: string | null
  estimatedCredits?: number
  metadata?: { badges?: TemplateBadge[]; coverImageUrl?: string | null } | null
}

type TemplateBadge = 'new' | 'recommended' | 'hot'
type BadgeOrder = TemplateBadge
const BADGE_ORDER: BadgeOrder[] = ['hot', 'recommended', 'new']

function ReelflowHomePage() {
  const { t, locale } = useTranslation()
  const [credits, setCredits] = useState<HomeCreditSummary | null>(null)
  const [jobs, setJobs] = useState<ReelflowJobHomeItem[] | null>(null)
  const [templates, setTemplates] = useState<HomeTemplateItem[] | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [creditsRes, jobsRes, templatesRes] = await Promise.all([
          fetch('/api/reelflow/credits'),
          fetch('/api/reelflow/jobs?limit=50'),
          fetch('/api/reelflow/templates'),
        ])
        const creditsPayload = await creditsRes.json().catch(() => null)
        if (alive && creditsRes.ok && creditsPayload?.account) {
          setCredits({
            balance: Number(creditsPayload.account.balance || 0),
            frozenBalance: Number(creditsPayload.account.frozenBalance || 0),
            debtBalance: Number(creditsPayload.account.debtBalance || 0),
          })
        }
        const jobsPayload = await jobsRes.json().catch(() => null)
        if (alive && jobsRes.ok && Array.isArray(jobsPayload?.jobs)) {
          setJobs(jobsPayload.jobs as ReelflowJobHomeItem[])
        } else if (alive) {
          setJobs([])
        }
        const templatesPayload = await templatesRes.json().catch(() => null)
        const list: HomeTemplateItem[] = Array.isArray(templatesPayload?.templates) ? templatesPayload.templates : []
        if (alive) setTemplates(list)
      } catch {
        if (alive) {
          setJobs((current) => current ?? [])
          setTemplates((current) => current ?? [])
        }
      }
    }
    void load()
    return () => {
      alive = false
    }
  }, [])

  const metrics = useMemo(() => {
    const list = jobs ?? []
    return {
      active: list.filter((j) => j.status === 'queued' || j.status === 'running').length,
      downloadable: list.filter((j) => j.artifactStatus === 'downloadable').length,
    }
  }, [jobs])

  const recentJobs = (jobs ?? []).slice(0, 4)
  const featuredTemplates = (templates ?? []).slice(0, 3)
  const statusText = (status: string) => (t.reelflow.status as Record<string, string>)[status] || status
  const home = t.reelflow.home

  return (
    <main className="min-h-screen" data-testid="reelflow-home-page">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="reelflow-reveal flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between" data-delay="1">
          <div className="min-w-0">
            <span className="reelflow-eyebrow">{home.eyebrow}</span>
            <h1 className="reelflow-display mt-3 text-[1.8rem] leading-[1.15] sm:text-[2.1rem]">{home.title}</h1>
          </div>
          <Button size="lg" className="shrink-0" asChild>
            <Link to="/$lang/reelflow/draft" params={{ lang: locale }}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {home.newVideo}
            </Link>
          </Button>
        </div>

        {/* Continue creating */}
        <section className="reelflow-reveal mt-9" data-delay="2">
          <div className="flex items-baseline justify-between">
            <h2 className="reelflow-display text-lg">{home.continueCreating}</h2>
            <Link
              to="/$lang/reelflow/jobs"
              params={{ lang: locale }}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.reelflow.common.viewTasks}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-3">
            {jobs === null ? (
              <SkeletonRows count={3} className="h-[68px]" />
            ) : recentJobs.length === 0 ? (
              <Link
                to="/$lang/reelflow/draft"
                params={{ lang: locale }}
                className="reelflow-soft-tile group flex items-center gap-3 p-5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{home.emptyRecentTitle}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{home.emptyRecentTasks}</span>
                </span>
                <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-[transform,opacity] group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
              </Link>
            ) : (
              <div className="reelflow-panel divide-y divide-[var(--reelflow-hairline)] overflow-hidden p-0">
                {recentJobs.map((jobItem) => (
                  <RecentTaskRow key={jobItem.id} job={jobItem} locale={locale} statusText={statusText} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Start from a template */}
        <section className="reelflow-reveal mt-10" data-delay="3">
          <div className="flex items-baseline justify-between">
            <h2 className="reelflow-display text-lg">{home.startFromTemplate}</h2>
            <Link
              to="/$lang/reelflow/templates"
              params={{ lang: locale }}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {home.viewAllTemplates}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates === null
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="reelflow-skeleton h-[200px]" />)
              : featuredTemplates.map((tpl) => (
                  <TemplateCard key={tpl.id} template={tpl} locale={locale} t={t} />
                ))}
          </div>
        </section>

        {/* Workspace overview */}
        <section className="reelflow-reveal mt-10" data-delay="4">
          <h2 className="reelflow-display text-lg">{home.overview}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={Coins}
              label={home.stats.availableCredits}
              tone="amber"
              value={credits ? formatNum(credits.balance, locale) : <SkelNum />}
            />
            <StatCard icon={Loader2} label={home.stats.activeTasks} tone="blue" value={jobs === null ? <SkelNum /> : formatNum(metrics.active, locale)} />
            <StatCard icon={Download} label={home.stats.downloadable} tone="green" value={jobs === null ? <SkelNum /> : formatNum(metrics.downloadable, locale)} />
            <StatCard icon={Snowflake} label={home.stats.frozenCredits} value={credits ? formatNum(credits.frozenBalance, locale) : <SkelNum />} />
          </div>
        </section>
      </div>
    </main>
  )
}

function RecentTaskRow({
  job,
  locale,
  statusText,
}: {
  job: ReelflowJobHomeItem
  locale: string
  statusText: (status: string) => string
}) {
  const visual = categoryVisual(job.category)
  const Icon = visual.icon
  return (
    <Link
      to="/$lang/reelflow/jobs/$id"
      params={{ lang: locale, id: job.id }}
      className="group flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-[color-mix(in_oklch,var(--reelflow-coral)_4%,transparent)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none"
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `color-mix(in oklch, ${visual.color} 12%, transparent)`, color: visual.color }}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{job.templateName}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{job.category || ''}</span>
      </span>
      <StatusPill status={job.status} label={statusText(job.status)} />
      <span className="hidden w-16 shrink-0 text-right text-xs text-muted-foreground sm:block">
        {relativeTime(job.updatedAt || job.createdAt, locale)}
      </span>
    </Link>
  )
}

function TemplateCard({
  template,
  locale,
  t,
}: {
  template: HomeTemplateItem
  locale: string
  t: ReturnType<typeof useTranslation>['t']
}) {
  const visual = categoryVisual(template.category)
  const Icon = visual.icon
  const cover = template.metadata?.coverImageUrl
  const badges = (template.metadata?.badges ?? []).slice().sort((a, b) => BADGE_ORDER.indexOf(a) - BADGE_ORDER.indexOf(b))
  const badgeLabels = t.reelflow.templates.badges as Record<TemplateBadge, string>
  const credits = typeof template.estimatedCredits === 'number'
    ? t.reelflow.home.templateCredits.replace('{n}', formatNum(template.estimatedCredits, locale))
    : null

  return (
    <Link
      to="/$lang/reelflow/templates"
      params={{ lang: locale }}
      className="reelflow-soft-tile group flex flex-col overflow-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <div
        className="relative flex aspect-[16/10] items-center justify-center overflow-hidden"
        style={cover ? undefined : { background: `color-mix(in oklch, ${visual.color} 10%, var(--background))` }}
      >
        {cover ? (
          <img src={ossThumb(cover, 480)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <Icon className="h-9 w-9 transition-transform duration-300 group-hover:scale-110" style={{ color: visual.color }} aria-hidden="true" />
        )}
        {badges.length > 0 && (
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <BadgePill key={badge} badge={badge} label={badgeLabels[badge]} />
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="text-sm font-semibold">{template.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {template.category}
          {credits ? <span className="mx-1.5 text-border">·</span> : null}
          {credits}
        </p>
      </div>
    </Link>
  )
}

function BadgePill({ badge, label }: { badge: TemplateBadge; label: string }) {
  const Icon = badge === 'hot' ? Flame : badge === 'recommended' ? Star : Sparkles
  const tone = badge === 'hot' ? 'warning' : badge === 'recommended' ? 'brand' : 'info'
  return (
    <span className="reelflow-pill backdrop-blur" data-tone={tone}>
      <Icon aria-hidden="true" />
      {label}
    </span>
  )
}

function SkelNum() {
  return <span className="reelflow-skeleton inline-block h-7 w-12 align-middle" />
}

function formatNum(value: number, locale: string) {
  return new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', { maximumFractionDigits: 0 }).format(value)
}

function relativeTime(value: string, locale: string) {
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const min = Math.round(diffMs / 60000)
  const zh = locale === 'zh-CN'
  if (min < 1) return zh ? '刚刚' : 'now'
  if (min < 60) return zh ? `${min} 分钟前` : `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return zh ? `${hr} 小时前` : `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return zh ? `${day} 天前` : `${day}d ago`
  return new Date(value).toLocaleDateString(zh ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })
}
