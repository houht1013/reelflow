import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { useTranslation } from '@/hooks/use-translation'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Badge } from '@libs/react-shared/ui/badge'
import { Button } from '@libs/react-shared/ui/button'
import { Input } from '@libs/react-shared/ui/input'
import { Progress } from '@libs/react-shared/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@libs/react-shared/ui/table'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Archive,
  CheckCircle2,
  Circle,
  Coins,
  Loader2,
  RefreshCw,
  Save,
  TerminalSquare,
  XCircle,
} from 'lucide-react'

export const Route = createFileRoute('/$lang/admin/reelflow/jobs/$id')({
  head: ({ params }) => seoHead(params.lang, (t) => t.admin.metadata),
  component: ReelflowAdminJobPage,
})

type AdminJobDetail = {
  job: {
    id: string
    workspaceName: string
    createdByUserId: string
    templateCode: string
    templateName: string
    status: string
    qualityStatus: string
    priority: number
    inputParams: unknown
    normalizedParams: unknown
    estimatedCredits: string
    frozenCredits: string
    actualCredits: string
    debtCredits: string
    settlementStatus: string
    artifactStatus: string
    renderMp4Requested: boolean
    lockedBy: string | null
    lockedAt: string | null
    attemptCount: number
    lastErrorCode: string | null
    lastErrorMessage: string | null
    startedAt: string | null
    completedAt: string | null
    createdAt: string
    updatedAt: string
  }
  stages: Array<{
    id: string
    stageCode: string
    status: string
    attemptCount: number
    inputSnapshot: unknown
    outputSnapshot: unknown
    startedAt: string | null
    completedAt: string | null
    errorCode: string | null
    errorMessage: string | null
    updatedAt: string
  }>
  events: Array<{
    id: string
    stageId: string | null
    level: string
    eventType: string
    message: string
    data: unknown
    createdAt: string
  }>
  qualityIssues: Array<{
    id: string
    issueType: string
    severity: string
    status: string
    message: string | null
    createdAt: string
  }>
  assets: Array<{
    id: string
    stageId: string | null
    assetType: string
    sourceType: string
    storageProvider: string | null
    storageKey: string | null
    url: string | null
    mimeType: string | null
    fileSize: string | null
    status: string
    createdAt: string
  }>
  usageRecords: Array<{
    id: string
    resourceType: string
    provider: string
    model: string | null
    usageAmount: string
    usageUnit: string
    providerCostAmount: string
    providerCostCurrency: string
    creditCost: string
    pricingSnapshot: unknown
    rawUsage: unknown
    createdAt: string
  }>
  progress: number
}

function ReelflowAdminJobPage() {
  const { id } = Route.useParams()
  const { t, locale } = useTranslation()
  const [detail, setDetail] = useState<AdminJobDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [priority, setPriority] = useState('0')
  const [savingPriority, setSavingPriority] = useState(false)

  const loadDetail = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/reelflow/jobs/${id}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || t.admin.reelflow.jobs.loadError)
      setDetail(data)
      setPriority(String(data.job.priority ?? 0))
    } catch (err) {
      setError(err instanceof Error ? err.message : t.admin.reelflow.jobs.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDetail()
  }, [id])

  const totals = useMemo(() => {
    const providerCost = detail?.usageRecords.reduce((sum, item) => sum + Number(item.providerCostAmount || 0), 0) ?? 0
    const creditCost = detail?.usageRecords.reduce((sum, item) => sum + Number(item.creditCost || 0), 0) ?? 0
    return { providerCost, creditCost }
  }, [detail])

  const formatDate = (value: string | null) => {
    if (!value) return t.common.notAvailable
    return new Date(value).toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statusText = (status: string) => {
    const reelflowStatus = (t.reelflow.status as Record<string, string>)[status]
    if (reelflowStatus) return reelflowStatus
    const adminStatus = (t.admin.reelflow.status as Record<string, string>)[status]
    return adminStatus || status
  }

  const stageText = (stage: string) => (t.reelflow.stages as Record<string, string>)[stage] || stage

  const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (['published', 'completed', 'downloadable', 'accepted', 'settled', 'public', 'available'].includes(status)) return 'default'
    if (['failed', 'canceled', 'debt', 'archived', 'error', 'high'].includes(status)) return 'destructive'
    if (['queued', 'pending', 'frozen', 'draft', 'running', 'medium'].includes(status)) return 'secondary'
    return 'outline'
  }

  const stageIcon = (status: string) => {
    if (status === 'completed' || status === 'skipped') return <CheckCircle2 className="h-4 w-4 text-primary" />
    if (status === 'failed') return <XCircle className="h-4 w-4 text-destructive" />
    if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-primary" />
    return <Circle className="h-4 w-4 text-muted-foreground" />
  }

  const savePriority = async () => {
    const nextPriority = Number(priority)
    if (!Number.isInteger(nextPriority) || nextPriority < 0 || nextPriority > 1000) {
      toast.error(t.admin.reelflow.jobs.priorityInvalid)
      return
    }

    setSavingPriority(true)
    try {
      const response = await fetch(`/api/admin/reelflow/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: nextPriority }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || t.admin.reelflow.jobs.prioritySaveFailed)
      toast.success(t.admin.reelflow.jobs.prioritySaved)
      await loadDetail()
    } catch (err) {
      toast.error(t.admin.reelflow.jobs.prioritySaveFailed, {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSavingPriority(false)
    }
  }

  if (loading && !detail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>{t.admin.reelflow.jobs.loadError}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background p-6 lg:p-8" data-testid="reelflow-admin-job-page">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Button variant="outline" asChild className="mb-4">
              <a href={`/${locale}/admin/reelflow`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.admin.reelflow.jobs.back}
              </a>
            </Button>
            <h1 className="text-3xl font-semibold tracking-tight">{detail.job.templateName}</h1>
            <p className="mt-2 break-all text-sm text-muted-foreground">
              {t.admin.reelflow.jobs.jobId}: {detail.job.id}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadDetail} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {t.admin.reelflow.refresh}
            </Button>
            <Button variant="outline" asChild>
              <a href={`/${locale}/reelflow/jobs/${detail.job.id}`}>
                {t.admin.reelflow.jobs.userView}
              </a>
            </Button>
          </div>
        </div>

        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={statusVariant(detail.job.status)}>{statusText(detail.job.status)}</Badge>
                <Badge variant={statusVariant(detail.job.qualityStatus)}>{statusText(detail.job.qualityStatus)}</Badge>
                <Badge variant={statusVariant(detail.job.artifactStatus)}>{statusText(detail.job.artifactStatus)}</Badge>
                <Badge variant="outline">{detail.job.workspaceName}</Badge>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{t.admin.reelflow.jobs.progress}</span>
                  <span className="text-muted-foreground">{detail.progress}%</span>
                </div>
                <Progress value={detail.progress} />
              </div>
              {detail.job.lastErrorMessage && (
                <Alert variant="destructive" className="mt-5">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{detail.job.lastErrorCode || t.admin.reelflow.jobs.error}</AlertTitle>
                  <AlertDescription>{detail.job.lastErrorMessage}</AlertDescription>
                </Alert>
              )}
            </div>
            <div className="rounded-lg border bg-background p-4">
              <label className="text-sm font-medium">{t.admin.reelflow.jobs.priority}</label>
              <div className="mt-2 flex gap-2">
                <Input
                  type="number"
                  min={0}
                  max={1000}
                  data-testid="reelflow-admin-job-priority-input"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                />
                <Button data-testid="reelflow-admin-job-priority-save" onClick={savePriority} disabled={savingPriority}>
                  {savingPriority ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{t.admin.reelflow.jobs.priorityHint}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<Activity />} label={t.admin.reelflow.jobs.attempts} value={detail.job.attemptCount} />
          <MetricCard icon={<Coins />} label={t.admin.reelflow.jobs.credits} value={totals.creditCost.toFixed(2)} />
          <MetricCard icon={<Coins />} label={t.admin.reelflow.jobs.cost} value={`${totals.providerCost.toFixed(4)} USD`} />
          <MetricCard icon={<TerminalSquare />} label={t.admin.reelflow.jobs.worker} value={detail.job.lockedBy || t.common.notAvailable} />
        </div>

        <section className="rounded-lg border bg-card shadow-sm" data-testid="reelflow-admin-job-stages-section">
          <SectionTitle icon={<Activity />} title={t.admin.reelflow.jobs.sections.stages} />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.reelflow.jobs.table.stage}</TableHead>
                  <TableHead>{t.admin.reelflow.table.status}</TableHead>
                  <TableHead>{t.admin.reelflow.jobs.table.attempts}</TableHead>
                  <TableHead>{t.admin.reelflow.jobs.table.started}</TableHead>
                  <TableHead>{t.admin.reelflow.jobs.table.completed}</TableHead>
                  <TableHead>{t.admin.reelflow.jobs.table.error}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.stages.map((stage) => (
                  <TableRow key={stage.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        {stageIcon(stage.status)}
                        {stageText(stage.stageCode)}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={statusVariant(stage.status)}>{statusText(stage.status)}</Badge></TableCell>
                    <TableCell>{stage.attemptCount}</TableCell>
                    <TableCell>{formatDate(stage.startedAt)}</TableCell>
                    <TableCell>{formatDate(stage.completedAt)}</TableCell>
                    <TableCell>
                      <span className="line-clamp-2 max-w-80 text-sm text-destructive">
                        {stage.errorMessage || stage.errorCode || t.common.notAvailable}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-lg border bg-card shadow-sm" data-testid="reelflow-admin-job-events-section">
            <SectionTitle icon={<TerminalSquare />} title={t.admin.reelflow.jobs.sections.events} />
            <div className="divide-y">
              {detail.events.length === 0 ? (
                <EmptyText text={t.admin.reelflow.jobs.empty.events} />
              ) : (
                detail.events.map((event) => (
                  <div key={event.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={event.level === 'error' ? 'destructive' : 'outline'}>{event.level}</Badge>
                        <span className="font-medium">{event.eventType}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6">{event.message}</p>
                    {event.data ? <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-muted p-3 text-xs">{formatJson(event.data)}</pre> : null}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-lg border bg-card shadow-sm" data-testid="reelflow-admin-job-quality-section">
            <SectionTitle icon={<AlertTriangle />} title={t.admin.reelflow.jobs.sections.quality} />
            <div className="divide-y">
              {detail.qualityIssues.length === 0 ? (
                <EmptyText text={t.admin.reelflow.jobs.empty.quality} />
              ) : (
                detail.qualityIssues.map((issue) => (
                  <div key={issue.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant={statusVariant(issue.severity)}>{issue.severity}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(issue.createdAt)}</span>
                    </div>
                    <div className="mt-2 font-medium">{issue.issueType}</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{issue.message || t.common.notAvailable}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-lg border bg-card shadow-sm" data-testid="reelflow-admin-job-assets-section">
            <SectionTitle icon={<Archive />} title={t.admin.reelflow.jobs.sections.assets} />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.admin.reelflow.jobs.table.asset}</TableHead>
                    <TableHead>{t.admin.reelflow.table.status}</TableHead>
                    <TableHead>{t.admin.reelflow.jobs.table.storage}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.assets.length === 0 ? (
                    <TableRow><TableCell colSpan={3}><EmptyText text={t.admin.reelflow.jobs.empty.assets} /></TableCell></TableRow>
                  ) : (
                    detail.assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <div className="font-medium">{asset.assetType}</div>
                          <div className="text-xs text-muted-foreground">{asset.mimeType || asset.sourceType}</div>
                        </TableCell>
                        <TableCell><Badge variant={statusVariant(asset.status)}>{statusText(asset.status)}</Badge></TableCell>
                        <TableCell>
                          <div className="max-w-72 truncate text-sm">{asset.storageProvider || t.common.notAvailable}</div>
                          <div className="max-w-72 truncate text-xs text-muted-foreground">{asset.storageKey || asset.url || t.common.notAvailable}</div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="rounded-lg border bg-card shadow-sm" data-testid="reelflow-admin-job-usage-section">
            <SectionTitle icon={<Coins />} title={t.admin.reelflow.jobs.sections.usage} />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.admin.reelflow.table.resource}</TableHead>
                    <TableHead>{t.admin.reelflow.table.provider}</TableHead>
                    <TableHead>{t.admin.reelflow.jobs.table.usage}</TableHead>
                    <TableHead>{t.admin.reelflow.table.creditPrice}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.usageRecords.length === 0 ? (
                    <TableRow><TableCell colSpan={4}><EmptyText text={t.admin.reelflow.jobs.empty.usage} /></TableCell></TableRow>
                  ) : (
                    detail.usageRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.resourceType}</TableCell>
                        <TableCell>
                          <div>{record.provider}</div>
                          <div className="text-xs text-muted-foreground">{record.model || t.common.notAvailable}</div>
                        </TableCell>
                        <TableCell>{record.usageAmount} {record.usageUnit}</TableCell>
                        <TableCell>{record.creditCost}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b px-5 py-4">
      <span className="text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  )
}

function EmptyText({ text }: { text: string }) {
  return <p className="p-4 text-sm text-muted-foreground">{text}</p>
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
