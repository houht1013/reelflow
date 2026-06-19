import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@libs/react-shared/ui/button'
import { Badge } from '@libs/react-shared/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Activity, AlertCircle, ArrowRight, CheckCircle2, Clock3, Coins, FileWarning, Film, Loader2, PauseCircle, Plus, RefreshCw } from 'lucide-react'

export const Route = createFileRoute('/$lang/(root)/reelflow/jobs/')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.jobs),
  component: ReelflowJobsPage,
})

type ReelflowJobSummary = {
  id: string
  templateCode: string
  templateName: string
  status: string
  qualityStatus: string
  estimatedCredits: string
  frozenCredits: string
  actualCredits: string
  debtCredits: string
  settlementStatus: string
  artifactStatus: string
  renderMp4Requested: boolean
  lastErrorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

function ReelflowJobsPage() {
  const { t, locale } = useTranslation()
  const [jobs, setJobs] = useState<ReelflowJobSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadJobs = useCallback(async (background = false) => {
    if (background) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/reelflow/jobs?limit=50')
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || t.reelflow.jobs.loadError)
      setJobs(data.jobs || [])
      setLastRefreshedAt(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : t.reelflow.jobs.loadError)
    } finally {
      if (background) setRefreshing(false)
      else setLoading(false)
    }
  }, [t.reelflow.jobs.loadError])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  const hasLiveJobs = jobs.some((jobItem) => jobItem.status === 'queued' || jobItem.status === 'running')

  useEffect(() => {
    if (!autoRefresh || !hasLiveJobs) return
    const timer = window.setInterval(() => {
      void loadJobs(true)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [autoRefresh, hasLiveJobs, loadJobs])

  const summary = useMemo(() => {
    return jobs.reduce(
      (acc, jobItem) => {
        if (jobItem.status === 'queued' || jobItem.status === 'running') acc.active += 1
        else if (jobItem.status === 'completed') acc.completed += 1
        if (jobItem.status === 'failed' || jobItem.qualityStatus === 'needs_fix' || Number(jobItem.debtCredits) > 0) acc.attention += 1
        return acc
      },
      { active: 0, completed: 0, attention: 0 },
    )
  }, [jobs])

  const formatDate = (value: string | null) => {
    if (!value) return t.reelflow.common.noData
    return new Date(value).toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatTime = (value: Date) => {
    return value.toLocaleTimeString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const statusText = (status: string) => (t.reelflow.status as Record<string, string>)[status] || status

  return (
    <main className="min-h-screen bg-background" data-testid="reelflow-jobs-page">
      <section>
        <div className="container mx-auto flex flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{t.reelflow.jobs.title}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{t.reelflow.jobs.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadJobs()} disabled={loading || refreshing}>
              {loading || refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {t.reelflow.common.refresh}
            </Button>
            <Button variant={autoRefresh ? 'secondary' : 'outline'} onClick={() => setAutoRefresh((current) => !current)}>
              {autoRefresh ? <Activity className="mr-2 h-4 w-4" /> : <PauseCircle className="mr-2 h-4 w-4" />}
              {autoRefresh ? t.reelflow.jobs.autoRefreshOn : t.reelflow.jobs.autoRefreshOff}
            </Button>
            <Button asChild>
              <a href={`/${locale}/reelflow`}>
                <Plus className="mr-2 h-4 w-4" />
                {t.reelflow.common.createNew}
              </a>
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {!loading && jobs.length > 0 && (
          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <div className="reelflow-muted-tile p-4">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">{t.reelflow.jobs.activeTasks}</p>
              </div>
              <p className="mt-3 text-2xl font-semibold">{summary.active}</p>
            </div>
            <div className="reelflow-muted-tile p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">{t.reelflow.jobs.completedTasks}</p>
              </div>
              <p className="mt-3 text-2xl font-semibold">{summary.completed}</p>
            </div>
            <div className="reelflow-muted-tile p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">{t.reelflow.jobs.attentionTasks}</p>
              </div>
              <p className="mt-3 text-2xl font-semibold">{summary.attention}</p>
            </div>
          </div>
        )}

        {!loading && hasLiveJobs && (
          <Alert className="mb-5">
            <Activity className="h-4 w-4" />
            <AlertTitle>{t.reelflow.jobs.liveHintTitle}</AlertTitle>
            <AlertDescription>
              {t.reelflow.jobs.liveHintBody}
              {lastRefreshedAt && (
                <span className="ml-2 text-muted-foreground">
                  {t.reelflow.jobs.lastRefreshed}: {formatTime(lastRefreshedAt)}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{t.reelflow.jobs.loadError}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading ? (
          <div className="reelflow-panel flex h-56 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="reelflow-panel p-10 text-center" data-testid="reelflow-jobs-empty">
            <h2 className="text-lg font-semibold">{t.reelflow.jobs.empty}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t.reelflow.jobs.emptyHint}</p>
            <Button className="mt-5" asChild>
              <a href={`/${locale}/reelflow`}>{t.reelflow.common.createNew}</a>
            </Button>
          </div>
        ) : (
          <div className="reelflow-panel overflow-hidden" data-testid="reelflow-jobs-table">
            <div className="bg-muted/25 px-5 py-3 ring-1 ring-inset ring-border/25">
              <div className="grid gap-4 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_160px_120px]">
                <span>{t.reelflow.jobs.template}</span>
                <span>{t.reelflow.jobs.status}</span>
                <span>{t.reelflow.jobs.artifact}</span>
                <span>{t.reelflow.jobs.createdAt}</span>
                <span className="text-right">{t.reelflow.jobs.open}</span>
              </div>
            </div>
            <div className="divide-y divide-border/35">
              {jobs.map((jobItem) => (
                <TaskRow
                  key={jobItem.id}
                  job={jobItem}
                  locale={locale}
                  t={t}
                  statusText={statusText}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function TaskRow({
  job,
  locale,
  t,
  statusText,
  formatDate,
}: {
  job: ReelflowJobSummary
  locale: string
  t: any
  statusText: (status: string) => string
  formatDate: (value: string | null) => string
}) {
  const hasIssue = job.status === 'failed' || job.qualityStatus === 'needs_fix' || Number(job.debtCredits) > 0
  const isLive = job.status === 'queued' || job.status === 'running'
  const isDone = job.status === 'completed'

  return (
    <article
      className="grid gap-4 px-5 py-4 transition-colors hover:bg-muted/20 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_160px_120px] lg:items-center"
      data-testid={`reelflow-job-row-${job.id}`}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground ring-1 ring-inset ring-border/30">
            <Film className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{job.templateName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{job.renderMp4Requested ? t.reelflow.jobs.mp4Requested : t.reelflow.jobs.draftRequested}</p>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <StatusPill status={job.status} label={statusText(job.status)} />
        {isLive && <Badge variant="outline">{t.reelflow.detail.liveTracking}</Badge>}
        {isDone && <Badge variant="outline">{t.reelflow.jobs.completedTasks}</Badge>}
      </div>

      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <StatusPill status={job.artifactStatus} label={statusText(job.artifactStatus)} compact />
          <StatusPill status={job.qualityStatus} label={statusText(job.qualityStatus)} compact />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {hasIssue ? <FileWarning className="h-4 w-4 text-destructive" /> : <Coins className="h-4 w-4" />}
          <span>{job.estimatedCredits} {t.reelflow.common.credits}</span>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">{formatDate(job.createdAt)}</div>

      <div className="flex justify-start lg:justify-end">
        <Button variant="ghost" size="sm" asChild>
          <a href={`/${locale}/reelflow/jobs/${job.id}`}>
            {t.reelflow.jobs.open}
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    </article>
  )
}

function StatusPill({ status, label, compact = false }: { status: string; label: string; compact?: boolean }) {
  const tone = statusTone(status)
  const Icon = tone.icon
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${tone.className}`}
      data-status={status}
    >
      <Icon className={compact ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0'} />
      <span className="truncate">{label}</span>
    </span>
  )
}

function statusTone(status: string) {
  if (status === 'failed' || status === 'canceled' || status === 'debt' || status === 'needs_fix') {
    return { icon: AlertCircle, className: 'bg-destructive/10 text-destructive ring-destructive/25' }
  }
  if (status === 'completed' || status === 'downloadable' || status === 'accepted' || status === 'settled' || status === 'available') {
    return { icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300' }
  }
  if (status === 'queued' || status === 'pending' || status === 'frozen') {
    return { icon: Clock3, className: 'bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300' }
  }
  if (status === 'running' || status === 'generating') {
    return { icon: Activity, className: 'bg-blue-500/10 text-blue-700 ring-blue-500/25 dark:text-blue-300' }
  }
  return { icon: Clock3, className: 'bg-muted text-muted-foreground ring-border/45' }
}
