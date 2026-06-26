import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import {
  ArrowRight,
  Coins,
  Download,
  ImageIcon,
  Layers3,
  ListChecks,
  Loader2,
  Mic2,
  Snowflake,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { StatusPill, StatCard, SkeletonRows, categoryVisual } from '@/components/reelflow-ui'

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

type EntryTo =
  | '/$lang/reelflow/templates'
  | '/$lang/reelflow/image'
  | '/$lang/reelflow/voice'
  | '/$lang/reelflow/jobs'

function ReelflowHomePage() {
  const { t, locale } = useTranslation()
  const [credits, setCredits] = useState<HomeCreditSummary | null>(null)
  const [jobs, setJobs] = useState<ReelflowJobHomeItem[] | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [creditsRes, jobsRes] = await Promise.all([
          fetch('/api/reelflow/credits'),
          fetch('/api/reelflow/jobs?limit=50'),
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
        if (alive) setJobs(jobsRes.ok && Array.isArray(jobsPayload?.jobs) ? (jobsPayload.jobs as ReelflowJobHomeItem[]) : [])
      } catch {
        if (alive) setJobs((current) => current ?? [])
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
  const statusText = (status: string) => (t.reelflow.status as Record<string, string>)[status] || status
  const home = t.reelflow.home
  const nav = t.reelflow.shell.nav

  const entries: { icon: LucideIcon; label: string; to: EntryTo; color: string }[] = [
    { icon: Layers3, label: nav.templates, to: '/$lang/reelflow/templates', color: 'var(--reelflow-coral)' },
    { icon: ImageIcon, label: nav.image, to: '/$lang/reelflow/image', color: 'var(--reelflow-blue)' },
    { icon: Mic2, label: nav.voice, to: '/$lang/reelflow/voice', color: 'var(--reelflow-violet)' },
    { icon: ListChecks, label: nav.tasks, to: '/$lang/reelflow/jobs', color: 'var(--reelflow-amber)' },
  ]

  return (
    <main className="min-h-screen" data-testid="reelflow-home-page">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="reelflow-reveal" data-delay="1">
          <span className="reelflow-eyebrow">{home.eyebrow}</span>
          <h1 className="reelflow-display mt-3 text-[1.8rem] leading-[1.15] sm:text-[2.1rem]">{home.title}</h1>
        </div>

        {/* Entry cards */}
        <div className="reelflow-reveal mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4" data-delay="2">
          {entries.map((entry) => (
            <Link
              key={entry.to}
              to={entry.to}
              params={{ lang: locale }}
              className="reelflow-soft-tile group flex items-center gap-3 p-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `color-mix(in oklch, ${entry.color} 12%, transparent)`, color: entry.color }}
              >
                <entry.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{entry.label}</span>
              <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-[transform,opacity] group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
            </Link>
          ))}
        </div>

        {/* Continue creating */}
        <section className="reelflow-reveal mt-10" data-delay="3">
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
                to="/$lang/reelflow/templates"
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

        {/* Workspace overview */}
        <section className="reelflow-reveal mt-10" data-delay="4">
          <h2 className="reelflow-display text-lg">{home.overview}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={Coins} label={home.stats.availableCredits} tone="amber" value={credits ? formatNum(credits.balance, locale) : <SkelNum />} />
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
