import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@libs/react-shared/ui/button'
import { Badge } from '@libs/react-shared/ui/badge'
import { Progress } from '@libs/react-shared/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@libs/react-shared/ui/dialog'
import { Separator } from '@libs/react-shared/ui/separator'
import { Archive, ArrowLeft, CheckCircle2, Circle, Clock3, Coins, Download, Eye, FileText, ImageIcon, Loader2, RefreshCw, Repeat2, RotateCcw, Video, XCircle } from 'lucide-react'

export const Route = createFileRoute('/$lang/(root)/reelflow/jobs/$id')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.jobDetail),
  component: ReelflowJobDetailPage,
})

type JobDetail = {
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
  attemptCount: number
  lastErrorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

type JobStage = {
  id: string
  stageCode: string
  status: string
  sortOrder: number
  attemptCount: number
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  updatedAt: string
}

type JobEvent = {
  id: string
  stageId: string | null
  level: string
  eventType: string
  message: string
  createdAt: string
}

type QualityIssue = {
  id: string
  issueType: string
  severity: string
  status: string
  message: string
  createdAt: string
}

type JobAsset = {
  id: string
  stageId: string | null
  assetType: string
  sourceType: string
  storageProvider: string | null
  storageKey: string | null
  url: string | null
  mimeType: string | null
  fileSize: string | number | null
  durationMs: number | null
  width: number | null
  height: number | null
  status: string
  visibility: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

type UsageRecord = {
  id: string
  stageId: string | null
  assetId: string | null
  resourceType: string
  provider: string
  model: string | null
  usageAmount: string
  usageUnit: string
  providerCostAmount: string
  providerCostCurrency: string
  creditCost: string
  createdAt: string
}

type DetailResponse = {
  job: JobDetail
  stages: JobStage[]
  events: JobEvent[]
  qualityIssues: QualityIssue[]
  assets: JobAsset[]
  usageRecords: UsageRecord[]
  progress: number
}

type PreflightIssue = {
  code: string
  message?: string
}

function ReelflowJobDetailPage() {
  const { id } = Route.useParams()
  const { t, locale } = useTranslation()
  const [detail, setDetail] = useState<DetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<'retry' | 'rerun' | null>(null)
  const [previewAsset, setPreviewAsset] = useState<JobAsset | null>(null)

  const loadDetail = useCallback(async (background = false) => {
    if (background) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/reelflow/jobs/${id}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || t.reelflow.detail.loadError)
      setDetail(data)
      setLastRefreshedAt(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : t.reelflow.detail.loadError)
    } finally {
      if (background) setRefreshing(false)
      else setLoading(false)
    }
  }, [id, t.reelflow.detail.loadError])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  const isLiveJob = detail ? detail.job.status === 'queued' || detail.job.status === 'running' : false

  useEffect(() => {
    if (!autoRefresh || !isLiveJob) return

    const interval = window.setInterval(() => {
      void loadDetail(true)
    }, 5000)

    return () => window.clearInterval(interval)
  }, [autoRefresh, isLiveJob, loadDetail])

  const formatDate = (value: string | Date | null) => {
    if (!value) return t.reelflow.common.noData
    return new Date(value).toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statusText = (status: string) => (t.reelflow.status as Record<string, string>)[status] || status
  const stageText = (stage: string) => (t.reelflow.stages as Record<string, string>)[stage] || stage
  const assetText = (type: string) => (t.reelflow.assets as Record<string, string>)[type] || type
  const resourceText = (type: string) => (t.reelflow.resources as Record<string, string>)[type] || type

  const formatFileSize = (value: string | number | null) => {
    const numeric = Number(value || 0)
    if (!numeric) return t.reelflow.common.unknown
    if (numeric < 1024 * 1024) return `${Math.max(1, Math.round(numeric / 1024))} KB`
    return `${(numeric / 1024 / 1024).toFixed(1)} MB`
  }

  const formatDuration = (value: number | null) => {
    if (!value) return t.reelflow.common.unknown
    const seconds = Math.max(1, Math.round(value / 1000))
    if (seconds < 60) return `${seconds}s`
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }

  const preflightErrorText = (issue: PreflightIssue) => {
    const messages = t.reelflow.generate.preflightErrors as Record<string, string>
    return messages[issue.code] || issue.message || t.reelflow.detail.actionFailed
  }

  const runJobAction = async (action: 'retry' | 'rerun') => {
    if (!detail) return
    setActionLoading(action)
    setActionError(null)
    try {
      const response = await fetch(`/api/reelflow/jobs/${detail.job.id}/${action}`, { method: 'POST' })
      const payload = await response.json()
      if (!response.ok) {
        const preflightErrors = Array.isArray(payload?.preflight?.errors)
          ? (payload.preflight.errors as PreflightIssue[])
          : []
        const description = preflightErrors.length > 0
          ? preflightErrors.map((item) => preflightErrorText(item)).join('\n')
          : payload?.error || t.reelflow.detail.actionFailed
        throw new Error(description)
      }

      if (action === 'rerun') {
        toast.success(t.reelflow.detail.rerunCreated)
        window.location.href = `/${locale}/reelflow/jobs/${payload.jobId}`
      } else {
        toast.success(t.reelflow.detail.retryQueued)
        await loadDetail()
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.reelflow.detail.actionFailed)
      toast.error(t.reelflow.detail.actionFailed, {
        description: err instanceof Error ? err.message : t.reelflow.detail.actionFailed,
      })
    } finally {
      setActionLoading(null)
    }
  }

  const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (status === 'completed' || status === 'downloadable' || status === 'accepted' || status === 'settled') return 'default'
    if (status === 'failed' || status === 'canceled' || status === 'debt') return 'destructive'
    if (status === 'queued' || status === 'pending' || status === 'frozen') return 'secondary'
    return 'outline'
  }

  const stageIcon = (status: string) => {
    if (status === 'completed' || status === 'skipped') return <CheckCircle2 className="h-5 w-5 text-primary" />
    if (status === 'failed') return <XCircle className="h-5 w-5 text-destructive" />
    if (status === 'running') return <Loader2 className="h-5 w-5 animate-spin text-primary" />
    return <Circle className="h-5 w-5 text-muted-foreground" />
  }

  return (
    <main className="min-h-screen bg-background" data-testid="reelflow-job-detail-page">
      <section>
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href={`/${locale}/reelflow/jobs`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.reelflow.detail.backToTasks}
              </a>
            </Button>
            <Button variant="ghost" onClick={() => loadDetail()} disabled={loading || refreshing}>
              {loading || refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {t.reelflow.common.refresh}
            </Button>
            <Button variant={autoRefresh ? 'secondary' : 'outline'} onClick={() => setAutoRefresh((current) => !current)}>
              <Clock3 className="mr-2 h-4 w-4" />
              {autoRefresh ? t.reelflow.detail.autoRefreshOn : t.reelflow.detail.autoRefreshOff}
            </Button>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">{t.reelflow.detail.title}</h1>
              {isLiveJob && <Badge variant="secondary">{t.reelflow.detail.liveTracking}</Badge>}
            </div>
            <p className="mt-2 break-all text-sm text-muted-foreground">
              {t.reelflow.detail.taskId}: {id}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.reelflow.detail.lastRefreshed}: {formatDate(lastRefreshedAt)}
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{t.reelflow.detail.loadError}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading && !detail ? (
          <div className="reelflow-panel flex h-56 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : detail ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <section className="reelflow-panel p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.reelflow.jobs.template}</p>
                    <h2 className="mt-1 text-2xl font-semibold">{detail.job.templateName}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={statusVariant(detail.job.status)}>{statusText(detail.job.status)}</Badge>
                    <Badge variant={statusVariant(detail.job.qualityStatus)}>{statusText(detail.job.qualityStatus)}</Badge>
                    <Badge variant={statusVariant(detail.job.artifactStatus)}>{statusText(detail.job.artifactStatus)}</Badge>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{t.reelflow.detail.progress}</span>
                    <span className="text-muted-foreground">{detail.progress}%</span>
                  </div>
                  <Progress value={detail.progress} data-testid="reelflow-job-progress" />
                </div>
                {isLiveJob && (
                  <Alert className="mt-5">
                    <Clock3 className="h-4 w-4" />
                    <AlertTitle>{t.reelflow.detail.liveHintTitle}</AlertTitle>
                    <AlertDescription>{t.reelflow.detail.liveHintBody}</AlertDescription>
                  </Alert>
                )}
                {detail.job.lastErrorMessage && (
                  <Alert variant="destructive" className="mt-5">
                    <AlertTitle>{t.reelflow.detail.error}</AlertTitle>
                    <AlertDescription>{detail.job.lastErrorMessage}</AlertDescription>
                  </Alert>
                )}
              </section>

              <section className="reelflow-panel p-5">
                <h2 className="text-lg font-semibold">{t.reelflow.detail.stages}</h2>
                <div className="mt-5 space-y-0">
                  {detail.stages.map((stage, index) => (
                    <div key={stage.id} className="relative flex gap-4 pb-5 last:pb-0">
                      {index < detail.stages.length - 1 && <div className="absolute left-2.5 top-7 h-[calc(100%-1.75rem)] w-px bg-border/55" />}
                      <div className="relative z-10 bg-card pt-0.5">{stageIcon(stage.status)}</div>
                      <div className="reelflow-muted-tile min-w-0 flex-1 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="font-medium">{stageText(stage.stageCode)}</h3>
                          <Badge variant={statusVariant(stage.status)}>{statusText(stage.status)}</Badge>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                          <div>{t.reelflow.detail.startedAt}: {formatDate(stage.startedAt)}</div>
                          <div>{t.reelflow.detail.updatedAt}: {formatDate(stage.updatedAt)}</div>
                        </div>
                        {stage.errorMessage && <p className="mt-3 text-sm text-destructive">{stage.errorMessage}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="reelflow-panel p-5">
                <div className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">{t.reelflow.detail.assets}</h2>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {detail.assets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.reelflow.detail.noAssets}</p>
                  ) : (
                    detail.assets.map((asset) => (
                      <JobAssetCard
                        key={asset.id}
                        asset={asset}
                        job={detail.job}
                        locale={locale}
                        t={t}
                        assetText={assetText}
                        statusText={statusText}
                        statusVariant={statusVariant}
                        formatFileSize={formatFileSize}
                        formatDuration={formatDuration}
                        onPreview={() => setPreviewAsset(asset)}
                      />
                    ))
                  )}
                </div>
              </section>

              <section className="reelflow-panel p-5">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">{t.reelflow.detail.usage}</h2>
                </div>
                <div className="mt-4 overflow-hidden rounded-lg bg-background/65 ring-1 ring-border/35">
                  {detail.usageRecords.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">{t.reelflow.detail.noUsage}</p>
                  ) : (
                    <div className="divide-y divide-border/35">
                      {detail.usageRecords.map((record) => (
                        <div key={record.id} className="grid gap-3 p-4 text-sm md:grid-cols-[1fr_1fr_auto] md:items-center">
                          <div>
                            <div className="font-medium">{resourceText(record.resourceType)}</div>
                            <div className="text-muted-foreground">{t.reelflow.detail.usageItem}</div>
                          </div>
                          <div className="text-muted-foreground">
                            {record.usageAmount} {record.usageUnit}
                          </div>
                          <div className="font-medium">
                            {record.creditCost} {t.reelflow.common.credits}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <section className="reelflow-panel p-5">
                <h2 className="text-lg font-semibold">{t.reelflow.jobs.settlement}</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <InfoRow label={t.reelflow.jobs.estimatedCredits} value={`${detail.job.estimatedCredits} ${t.reelflow.common.credits}`} />
                  <InfoRow label={t.reelflow.jobs.actualCredits} value={`${detail.job.actualCredits} ${t.reelflow.common.credits}`} />
                  <InfoRow label={t.reelflow.jobs.quality} value={statusText(detail.job.qualityStatus)} />
                  <InfoRow label={t.reelflow.jobs.settlement} value={statusText(detail.job.settlementStatus)} />
                  <InfoRow label={t.reelflow.jobs.artifact} value={statusText(detail.job.artifactStatus)} />
                  <InfoRow label={t.reelflow.detail.startedAt} value={formatDate(detail.job.startedAt)} />
                  <InfoRow label={t.reelflow.detail.updatedAt} value={formatDate(detail.job.updatedAt)} />
                </div>
                {detail.job.artifactStatus === 'downloadable' ? (
                  <>
                    <Button asChild className="mt-5 w-full" data-testid="reelflow-download-draft">
                      <a href={`/api/reelflow/jobs/${detail.job.id}/download-draft`}>
                        <Download className="mr-2 h-4 w-4" />
                        {t.reelflow.detail.downloadDraft}
                      </a>
                    </Button>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">{t.reelflow.detail.downloadHint}</p>
                  </>
                ) : (
                  <p className="mt-5 rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground ring-1 ring-border/25">
                    {t.reelflow.detail.downloadUnavailable}
                  </p>
                )}
              </section>

              <section className="reelflow-panel p-5">
                <h2 className="text-lg font-semibold">{t.reelflow.detail.actionsTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t.reelflow.detail.actionsDescription}</p>
                {actionError && (
                  <Alert variant="destructive" className="mt-4" data-testid="reelflow-job-action-error">
                    <AlertTitle>{t.reelflow.detail.actionFailed}</AlertTitle>
                    <AlertDescription>{actionError}</AlertDescription>
                  </Alert>
                )}
                <div className="mt-4 space-y-2">
                  {detail.job.status === 'failed' && (
                    <Button
                      className="w-full"
                      variant="default"
                      onClick={() => runJobAction('retry')}
                      disabled={actionLoading !== null}
                      data-testid="reelflow-job-retry"
                    >
                      {actionLoading === 'retry' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-2 h-4 w-4" />
                      )}
                      {t.reelflow.detail.retryFailed}
                    </Button>
                  )}
                  {(detail.job.status === 'completed' || detail.job.status === 'failed') && (
                    <Button
                      className="w-full"
                      variant={detail.job.status === 'failed' ? 'outline' : 'default'}
                      onClick={() => runJobAction('rerun')}
                      disabled={actionLoading !== null}
                      data-testid="reelflow-job-rerun"
                    >
                      {actionLoading === 'rerun' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Repeat2 className="mr-2 h-4 w-4" />
                      )}
                      {t.reelflow.detail.rerun}
                    </Button>
                  )}
                  {detail.job.status !== 'completed' && detail.job.status !== 'failed' && (
                    <p className="rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground ring-1 ring-border/25">
                      {t.reelflow.detail.actionsUnavailable}
                    </p>
                  )}
                </div>
              </section>

              <Alert>
                <Clock3 className="h-4 w-4" />
                <AlertTitle>{t.reelflow.detail.outputNoticeTitle}</AlertTitle>
                <AlertDescription>{t.reelflow.detail.outputNoticeBody}</AlertDescription>
              </Alert>

              <section className="reelflow-panel p-5">
                <h2 className="text-lg font-semibold">{t.reelflow.detail.qualityIssues}</h2>
                <div className="mt-4 space-y-3">
                  {detail.qualityIssues.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.reelflow.detail.noIssues}</p>
                  ) : (
                    detail.qualityIssues.map((issue) => (
                      <div key={issue.id} className="reelflow-muted-tile p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={issue.severity === 'high' ? 'destructive' : 'secondary'}>{t.reelflow.detail.issue}</Badge>
                          <span className="text-xs text-muted-foreground">{statusText(issue.status)}</span>
                        </div>
                        <Separator className="my-3" />
                        <p className="text-sm leading-6">{issue.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </div>
      <JobAssetPreviewDialog
        asset={previewAsset}
        job={detail?.job ?? null}
        t={t}
        assetText={assetText}
        statusText={statusText}
        formatFileSize={formatFileSize}
        formatDuration={formatDuration}
        onOpenChange={(open) => {
          if (!open) setPreviewAsset(null)
        }}
      />
    </main>
  )
}

function JobAssetCard({
  asset,
  job,
  locale,
  t,
  assetText,
  statusText,
  statusVariant,
  formatFileSize,
  formatDuration,
  onPreview,
}: {
  asset: JobAsset
  job: JobDetail
  locale: string
  t: any
  assetText: (type: string) => string
  statusText: (status: string) => string
  statusVariant: (status: string) => 'default' | 'secondary' | 'destructive' | 'outline'
  formatFileSize: (value: string | number | null) => string
  formatDuration: (value: number | null) => string
  onPreview: () => void
}) {
  const displayName = getAssetDisplayName(asset, assetText)
  const note = getAssetNote(asset)
  const isDraftPackage = asset.assetType === 'draft_package'
  const canDownloadDraft = isDraftPackage && job.artifactStatus === 'downloadable'
  const isImage = Boolean(asset.url && asset.mimeType?.startsWith('image/'))
  const isAudio = Boolean(asset.url && asset.mimeType?.startsWith('audio/'))
  const isVideo = Boolean(asset.url && asset.mimeType?.startsWith('video/'))

  return (
    <article className="reelflow-muted-tile overflow-hidden" data-testid={`reelflow-job-asset-${asset.assetType}`}>
      <button
        type="button"
        className="flex aspect-video w-full items-center justify-center bg-muted/35 text-muted-foreground transition-colors hover:bg-muted/55 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        onClick={onPreview}
        data-testid={`reelflow-job-asset-preview-surface-${asset.assetType}`}
      >
        {isImage ? (
          <img
            src={asset.url!}
            alt={displayName}
            width={asset.width || 1024}
            height={asset.height || 576}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : isAudio ? (
          <div className="flex flex-col items-center gap-2 px-4">
            <FileText className="h-8 w-8" />
            <span className="text-sm">{t.reelflow.detail.audioPreview}</span>
          </div>
        ) : isVideo ? (
          <div className="flex flex-col items-center gap-2 px-4">
            <Video className="h-8 w-8" />
            <span className="text-sm">{t.reelflow.detail.videoPreview}</span>
          </div>
        ) : isDraftPackage ? (
          <div className="flex flex-col items-center gap-2 px-4">
            <Archive className="h-8 w-8" />
            <span className="text-sm">{assetText(asset.assetType)}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4">
            {asset.assetType === 'image' ? <ImageIcon className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
            <span className="text-sm">{assetText(asset.assetType)}</span>
          </div>
        )}
      </button>
      <div className="space-y-4 p-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariant(asset.status)}>{statusText(asset.status)}</Badge>
            <Badge variant="outline">{assetText(asset.assetType)}</Badge>
          </div>
          <h3 className="mt-3 line-clamp-2 font-medium">{displayName}</h3>
          {note && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{note}</p>}
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground">
          <InfoRow label={t.reelflow.detail.fileSize} value={formatFileSize(asset.fileSize)} />
          {asset.durationMs ? <InfoRow label={t.reelflow.detail.duration} value={formatDuration(asset.durationMs)} /> : null}
          {asset.width && asset.height ? <InfoRow label={t.reelflow.detail.dimensions} value={`${asset.width} x ${asset.height}`} /> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onPreview} data-testid={`reelflow-preview-asset-${asset.assetType}`}>
            <Eye className="mr-2 h-4 w-4" />
            {t.reelflow.detail.previewAsset}
          </Button>
          {asset.url && (
            <Button variant="outline" size="sm" asChild>
              <a href={asset.url} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                {t.reelflow.detail.openAsset}
              </a>
            </Button>
          )}
          {canDownloadDraft && (
            <Button size="sm" asChild data-testid="reelflow-download-draft-asset">
              <a href={`/api/reelflow/jobs/${job.id}/download-draft`}>
                <Download className="mr-2 h-4 w-4" />
                {t.reelflow.detail.downloadDraft}
              </a>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <a href={`/${locale}/reelflow/assets?query=${encodeURIComponent(asset.id)}`}>
              {t.reelflow.detail.openInAssets}
            </a>
          </Button>
        </div>
      </div>
    </article>
  )
}

function JobAssetPreviewDialog({
  asset,
  job,
  t,
  assetText,
  statusText,
  formatFileSize,
  formatDuration,
  onOpenChange,
}: {
  asset: JobAsset | null
  job: JobDetail | null
  t: any
  assetText: (type: string) => string
  statusText: (status: string) => string
  formatFileSize: (value: string | number | null) => string
  formatDuration: (value: number | null) => string
  onOpenChange: (open: boolean) => void
}) {
  if (!asset) return null

  const displayName = getAssetDisplayName(asset, assetText)
  const note = getAssetNote(asset)
  const isImage = Boolean(asset.url && asset.mimeType?.startsWith('image/'))
  const isAudio = Boolean(asset.url && asset.mimeType?.startsWith('audio/'))
  const isVideo = Boolean(asset.url && asset.mimeType?.startsWith('video/'))
  const canDownloadDraft = asset.assetType === 'draft_package' && job?.artifactStatus === 'downloadable'

  return (
    <Dialog open={!!asset} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl" data-testid="reelflow-asset-preview-dialog">
        <DialogHeader>
          <DialogTitle>{displayName}</DialogTitle>
          <DialogDescription>{t.reelflow.detail.assetPreviewDescription}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="overflow-hidden rounded-lg bg-muted/30 ring-1 ring-border/35">
            {isImage ? (
              <img
                src={asset.url!}
                alt={displayName}
                width={asset.width || 1024}
                height={asset.height || 576}
                className="max-h-[60vh] w-full object-contain"
              />
            ) : isAudio ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-4 p-6">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <audio controls src={asset.url!} className="w-full max-w-lg" />
              </div>
            ) : isVideo ? (
              <video controls src={asset.url!} className="max-h-[60vh] w-full bg-black" />
            ) : (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
                {asset.assetType === 'draft_package' ? <Archive className="h-12 w-12" /> : <FileText className="h-12 w-12" />}
                <p className="text-sm font-medium text-foreground">{assetText(asset.assetType)}</p>
                <p className="max-w-md text-sm leading-6">{note || t.reelflow.detail.assetUnavailable}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{assetText(asset.assetType)}</Badge>
              <Badge variant="outline">{statusText(asset.status)}</Badge>
            </div>

            <div className="grid gap-2 text-sm">
              <InfoRow label={t.reelflow.detail.fileSize} value={formatFileSize(asset.fileSize)} />
              {asset.durationMs ? <InfoRow label={t.reelflow.detail.duration} value={formatDuration(asset.durationMs)} /> : null}
              {asset.width && asset.height ? <InfoRow label={t.reelflow.detail.dimensions} value={`${asset.width} x ${asset.height}`} /> : null}
            </div>

            {note && (
              <div className="reelflow-muted-tile p-3">
                <p className="text-xs font-medium text-muted-foreground">{t.reelflow.detail.assetNote}</p>
                <p className="mt-1 text-sm leading-6">{note}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {asset.url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={asset.url} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    {t.reelflow.detail.openAsset}
                  </a>
                </Button>
              )}
              {canDownloadDraft && job && (
                <Button size="sm" asChild>
                  <a href={`/api/reelflow/jobs/${job.id}/download-draft`}>
                    <Download className="mr-2 h-4 w-4" />
                    {t.reelflow.detail.downloadDraft}
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getAssetDisplayName(asset: JobAsset, assetText: (type: string) => string) {
  const metadata = asset.metadata && typeof asset.metadata === 'object' ? asset.metadata : {}
  const displayName = metadata.displayName
  const originalName = metadata.originalName
  if (typeof displayName === 'string' && displayName.trim()) return displayName
  if (typeof originalName === 'string' && originalName.trim()) return originalName
  return `${assetText(asset.assetType)} ${asset.id.slice(0, 8)}`
}

function getAssetNote(asset: JobAsset) {
  const metadata = asset.metadata && typeof asset.metadata === 'object' ? asset.metadata : {}
  const note = metadata.note
  return typeof note === 'string' && note.trim() ? note : ''
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
