import { createFileRoute, Link } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Button } from '@libs/react-shared/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Activity, AlertCircle, ArrowRight, Ban, Check, CheckCircle2, Clock3, Coins, Copy, FileWarning, ListChecks, Loader2, PauseCircle, Plus, RefreshCw } from 'lucide-react'
import { PageHeader, StatCard, StatusPill, EmptyState, SkeletonRows, categoryVisual } from '@/components/reelflow-ui'

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
  category?: string | null
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

  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const cancelJob = useCallback(
    async (id: string) => {
      setCancelingId(id)
      setError(null)
      try {
        const res = await fetch(`/api/reelflow/jobs/${id}/cancel`, { method: 'POST' })
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(payload?.error || t.reelflow.jobs.actionFailed)
        }
        await loadJobs(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : t.reelflow.jobs.actionFailed)
      } finally {
        setCancelingId(null)
      }
    },
    [loadJobs, t.reelflow.jobs.actionFailed],
  )

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
    return new Intl.DateTimeFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  }

  const formatTime = (value: Date) => {
    return new Intl.DateTimeFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(value)
  }

  const statusText = (status: string) => (t.reelflow.status as Record<string, string>)[status] || status

  return (
    <main className="min-h-screen" data-testid="reelflow-jobs-page">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow={t.reelflow.jobs.eyebrow}
          title={t.reelflow.jobs.title}
          actions={
            <>
              <Button type="button" variant="outline" onClick={() => void loadJobs()} disabled={loading || refreshing}>
                {loading || refreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {t.reelflow.common.refresh}
              </Button>
              <Button
                type="button"
                variant={autoRefresh ? 'secondary' : 'outline'}
                onClick={() => setAutoRefresh((current) => !current)}
                aria-pressed={autoRefresh}
              >
                {autoRefresh ? (
                  <Activity className="mr-2 h-4 w-4" aria-hidden="true" />
                ) : (
                  <PauseCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {autoRefresh ? t.reelflow.jobs.autoRefreshOn : t.reelflow.jobs.autoRefreshOff}
              </Button>
              <Button asChild>
                <Link to="/$lang/reelflow/draft" params={{ lang: locale }}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t.reelflow.common.createNew}
                </Link>
              </Button>
            </>
          }
        />

        <div className="mt-7">
          {!loading && jobs.length > 0 && (
            <div className="reelflow-reveal mb-5 grid gap-3 md:grid-cols-3" data-delay="1">
              <StatCard icon={Clock3} label={t.reelflow.jobs.activeTasks} value={summary.active} tone="blue" />
              <StatCard icon={CheckCircle2} label={t.reelflow.jobs.completedTasks} value={summary.completed} tone="green" />
              <StatCard icon={AlertCircle} label={t.reelflow.jobs.attentionTasks} value={summary.attention} tone="amber" />
            </div>
          )}

          {!loading && hasLiveJobs && (
            <Alert className="mb-5">
              <Activity className="h-4 w-4" aria-hidden="true" />
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
            <SkeletonRows count={4} className="h-[5.5rem]" />
          ) : jobs.length === 0 ? (
            <div data-testid="reelflow-jobs-empty">
              <EmptyState
                icon={ListChecks}
                title={t.reelflow.jobs.empty}
                description={t.reelflow.jobs.emptyHint}
                action={
                  <Button asChild>
                    <Link to="/$lang/reelflow/draft" params={{ lang: locale }}>
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                      {t.reelflow.common.createNew}
                    </Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="reelflow-reveal space-y-3" data-delay="2" data-testid="reelflow-jobs-table">
              {jobs.map((jobItem) => (
                <TaskRow
                  key={jobItem.id}
                  job={jobItem}
                  locale={locale}
                  t={t}
                  statusText={statusText}
                  formatDate={formatDate}
                  onCancel={cancelJob}
                  canceling={cancelingId === jobItem.id}
                />
              ))}
            </div>
          )}
        </div>
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
  onCancel,
  canceling,
}: {
  job: ReelflowJobSummary
  locale: string
  t: any
  statusText: (status: string) => string
  formatDate: (value: string | null) => string
  onCancel: (id: string) => void
  canceling: boolean
}) {
  const hasIssue = job.status === 'failed' || job.qualityStatus === 'needs_fix' || Number(job.debtCredits) > 0
  const progress = taskProgress(job.status)
  const bar = taskProgressBar(job.status)
  const visual = categoryVisual(job.category)
  const CategoryIcon = visual.icon
  const cancelable = job.status === 'queued' || job.status === 'running' || job.status === 'pending'

  return (
    <article
      className="reelflow-soft-tile overflow-hidden"
      data-testid={`reelflow-job-row-${job.id}`}
    >
      <div className="h-1 bg-muted">
        <div
          className="h-full rounded-r-full transition-[width] duration-500"
          style={{ width: `${progress}%`, background: bar }}
          role="progressbar"
          aria-label={t.reelflow.jobs.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        />
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.4fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-[inset_0_0_0_1px_var(--reelflow-hairline)]"
              style={{ background: `color-mix(in oklch, ${visual.color} 12%, transparent)`, color: visual.color }}
            >
              <CategoryIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">{job.templateName}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="reelflow-num">{formatDate(job.createdAt)}</span>
                </span>
                <IdCopy id={job.id} t={t} />
                <span className="truncate">{job.category ? `${job.category} · ` : ''}{job.renderMp4Requested ? t.reelflow.jobs.mp4Requested : t.reelflow.jobs.draftRequested}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <TaskInfo label={t.reelflow.jobs.status} value={<StatusPill status={job.status} label={statusText(job.status)} />} />
          <TaskInfo label={t.reelflow.jobs.artifact} value={<StatusPill status={job.artifactStatus} label={statusText(job.artifactStatus)} />} />
          <TaskInfo label={t.reelflow.jobs.quality} value={<StatusPill status={job.qualityStatus} label={statusText(job.qualityStatus)} />} />
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {hasIssue ? <FileWarning className="h-4 w-4 text-destructive" aria-hidden="true" /> : <Coins className="h-4 w-4" aria-hidden="true" />}
            <span className="reelflow-num whitespace-nowrap">{job.estimatedCredits} {t.reelflow.common.credits}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {cancelable && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={canceling}
                onClick={() => {
                  if (window.confirm(`${t.reelflow.jobs.endConfirmTitle}\n\n${t.reelflow.jobs.endConfirmBody}`)) onCancel(job.id)
                }}
                data-testid={`reelflow-job-cancel-${job.id}`}
              >
                {canceling ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Ban className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                {canceling ? t.reelflow.jobs.ending : t.reelflow.jobs.endTask}
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link to="/$lang/reelflow/jobs/$id" params={{ lang: locale, id: job.id }}>
                {t.reelflow.jobs.open}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

function IdCopy({ id, t }: { id: string; t: any }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(id).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        })
      }}
      title={`${t.reelflow.jobs.taskId}: ${id}`}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] leading-none text-muted-foreground transition-colors hover:text-foreground"
      data-testid={`reelflow-job-id-${id}`}
    >
      <span>{id.slice(0, 8)}</span>
      {copied ? <Check className="h-3 w-3 text-[var(--reelflow-green)]" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
      <span className="sr-only">{copied ? t.reelflow.jobs.copied : t.reelflow.jobs.copyId}</span>
    </button>
  )
}

function TaskInfo({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="reelflow-muted-tile min-w-0 px-3 py-2.5">
      <p className="mb-1.5 truncate text-xs text-muted-foreground">{label}</p>
      <div className="min-w-0">{value}</div>
    </div>
  )
}

function taskProgress(status: string) {
  if (status === 'completed') return 100
  if (status === 'failed' || status === 'canceled') return 100
  if (status === 'running') return 62
  if (status === 'queued') return 18
  return 8
}

// Status-aware progress-bar fill so the colour reads the same as the status pill
// (green done, red failed, brand gradient while running, muted while queued).
function taskProgressBar(status: string) {
  if (status === 'completed') return 'var(--reelflow-green)'
  if (status === 'failed' || status === 'canceled') return 'var(--destructive)'
  if (status === 'running') return 'linear-gradient(90deg, var(--foreground), color-mix(in oklch, var(--foreground) 45%, transparent))'
  if (status === 'queued') return 'var(--reelflow-amber)'
  return 'color-mix(in oklch, var(--foreground) 20%, transparent)'
}
