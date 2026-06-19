import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { useTranslation } from '@/hooks/use-translation'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@libs/react-shared/ui/badge'
import { Button } from '@libs/react-shared/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@libs/react-shared/ui/table'
import { CheckCircle2, Clock3, CreditCard, Loader2, RefreshCw, ServerCog, Sparkles, Video } from 'lucide-react'

export const Route = createFileRoute('/$lang/admin/reelflow/')({
  head: ({ params }) => seoHead(params.lang, (t) => t.admin.metadata),
  component: ReelflowAdminPage,
})

type AdminOverview = {
  stats: {
    templates: { total: number; published: number }
    jobs: { total: number; running: number; failed: number; byStatus: Record<string, number> }
    workspaces: { total: number }
    credits: { balance: string; frozen: string; debt: string }
  }
  templates: Array<{
    id: string
    code: string
    name: string
    category: string | null
    visibility: string
    status: string
    recommended: boolean
    featuredOrder: number | null
    builderVersion: string | null
    updatedAt: string
  }>
  recentJobs: Array<{
    id: string
    templateName: string
    workspaceName: string
    status: string
    qualityStatus: string
    artifactStatus: string
    priority: number
    estimatedCredits: string
    actualCredits: string
    lastErrorMessage: string | null
    createdAt: string
    updatedAt: string
  }>
  providers: Array<{
    id: string
    providerType: string
    provider: string
    displayName: string
    enabled: boolean
    priority: number
    updatedAt: string
    latestHealth: {
      status: string
      latencyMs: number | null
      errorCode: string | null
      errorMessage: string | null
      checkedBy: string
      createdAt: string
    } | null
  }>
  pricing: Array<{
    id: string
    resourceType: string
    provider: string
    model: string | null
    usageUnit: string
    providerCostUnitPrice: string
    providerCostCurrency: string
    creditUnitPrice: string
    minCreditCost: string | null
    enabled: boolean
    updatedAt: string
  }>
}

function ReelflowAdminPage() {
  const { t, locale } = useTranslation()
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadOverview = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/reelflow/overview')
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || t.admin.reelflow.loadError)
      setOverview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.admin.reelflow.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOverview()
  }, [])

  const patchTemplate = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id)
    try {
      const response = await fetch(`/api/admin/reelflow/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || t.admin.reelflow.messages.operationFailed)
      toast.success(t.admin.reelflow.messages.templateUpdated)
      await loadOverview()
    } catch (err) {
      toast.error(t.admin.reelflow.messages.operationFailed, {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setBusyId(null)
    }
  }

  const patchProvider = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id)
    try {
      const response = await fetch(`/api/admin/reelflow/providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || t.admin.reelflow.messages.operationFailed)
      toast.success(t.admin.reelflow.messages.providerUpdated)
      await loadOverview()
    } catch (err) {
      toast.error(t.admin.reelflow.messages.operationFailed, {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setBusyId(null)
    }
  }

  const checkProviderHealth = async (id: string) => {
    setBusyId(`health:${id}`)
    try {
      const response = await fetch(`/api/admin/reelflow/providers/${id}/health`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || t.admin.reelflow.messages.operationFailed)
      toast.success(t.admin.reelflow.messages.providerHealthChecked)
      await loadOverview()
    } catch (err) {
      toast.error(t.admin.reelflow.messages.operationFailed, {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setBusyId(null)
    }
  }

  const formatDate = (value: string) => {
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
    if (adminStatus) return adminStatus
    return status
  }

  const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (['published', 'completed', 'downloadable', 'accepted', 'settled', 'public'].includes(status)) return 'default'
    if (['failed', 'canceled', 'debt', 'archived'].includes(status)) return 'destructive'
    if (['queued', 'pending', 'frozen', 'draft'].includes(status)) return 'secondary'
    return 'outline'
  }

  if (loading && !overview) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t.admin.reelflow.loading}</p>
        </div>
      </div>
    )
  }

  if (error || !overview) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>{t.admin.reelflow.loadError}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8" data-testid="reelflow-admin-page">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{t.admin.reelflow.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t.admin.reelflow.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={`/${locale}/reelflow`}>
                <Sparkles className="mr-2 h-4 w-4" />
                {t.admin.reelflow.actions.viewUserPage}
              </a>
            </Button>
            <Button variant="outline" onClick={loadOverview} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {t.admin.reelflow.refresh}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<Video className="h-5 w-5" />} label={t.admin.reelflow.metrics.templates} value={overview.stats.templates.total} detail={`${t.admin.reelflow.metrics.publishedTemplates}: ${overview.stats.templates.published}`} />
          <MetricCard icon={<Clock3 className="h-5 w-5" />} label={t.admin.reelflow.metrics.totalJobs} value={overview.stats.jobs.total} detail={`${t.admin.reelflow.metrics.runningJobs}: ${overview.stats.jobs.running}`} />
          <MetricCard icon={<ServerCog className="h-5 w-5" />} label={t.admin.reelflow.metrics.workspaces} value={overview.stats.workspaces.total} detail={`${t.admin.reelflow.metrics.failedJobs}: ${overview.stats.jobs.failed}`} />
          <MetricCard icon={<CreditCard className="h-5 w-5" />} label={t.admin.reelflow.metrics.creditBalance} value={overview.stats.credits.balance} detail={`${t.admin.reelflow.metrics.frozenCredits}: ${overview.stats.credits.frozen}`} />
        </div>

        <section className="rounded-lg border bg-card shadow-sm" data-testid="reelflow-admin-templates-section">
          <SectionHeader title={t.admin.reelflow.sections.templates} />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.reelflow.table.name}</TableHead>
                  <TableHead>{t.admin.reelflow.table.category}</TableHead>
                  <TableHead>{t.admin.reelflow.table.status}</TableHead>
                  <TableHead>{t.admin.reelflow.table.visibility}</TableHead>
                  <TableHead>{t.admin.reelflow.table.recommended}</TableHead>
                  <TableHead>{t.admin.reelflow.table.updatedAt}</TableHead>
                  <TableHead className="text-right">{t.admin.reelflow.table.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.templates.length === 0 ? (
                  <EmptyRow colSpan={7} text={t.admin.reelflow.empty.templates} />
                ) : (
                  overview.templates.map((item) => (
                    <TableRow key={item.id} data-testid={`reelflow-admin-template-row-${item.code}`}>
                      <TableCell>
                        <div className="min-w-56">
                          <p className="font-medium">{item.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.code}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.category || t.common.notAvailable}</TableCell>
                      <TableCell><Badge variant={statusVariant(item.status)}>{statusText(item.status)}</Badge></TableCell>
                      <TableCell><Badge variant={statusVariant(item.visibility)}>{statusText(item.visibility)}</Badge></TableCell>
                      <TableCell>{item.recommended ? <CheckCircle2 className="h-5 w-5 text-primary" /> : t.common.no}</TableCell>
                      <TableCell>{formatDate(item.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`reelflow-admin-template-publish-${item.code}`}
                            disabled={busyId === item.id}
                            onClick={() => patchTemplate(item.id, { status: item.status === 'published' ? 'draft' : 'published' })}
                          >
                            {item.status === 'published' ? t.admin.reelflow.actions.unpublish : t.admin.reelflow.actions.publish}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`reelflow-admin-template-recommend-${item.code}`}
                            disabled={busyId === item.id}
                            onClick={() => patchTemplate(item.id, { recommended: !item.recommended })}
                          >
                            {item.recommended ? t.admin.reelflow.actions.unrecommend : t.admin.reelflow.actions.recommend}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="rounded-lg border bg-card shadow-sm" data-testid="reelflow-admin-recent-jobs-section">
          <SectionHeader title={t.admin.reelflow.sections.recentJobs} />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.reelflow.table.name}</TableHead>
                  <TableHead>{t.admin.reelflow.table.workspace}</TableHead>
                  <TableHead>{t.admin.reelflow.table.status}</TableHead>
                  <TableHead>{t.admin.reelflow.table.quality}</TableHead>
                  <TableHead>{t.admin.reelflow.table.artifact}</TableHead>
                  <TableHead>{t.admin.reelflow.table.priority}</TableHead>
                  <TableHead>{t.admin.reelflow.table.estimated}</TableHead>
                  <TableHead>{t.admin.reelflow.table.updatedAt}</TableHead>
                  <TableHead className="text-right">{t.admin.reelflow.table.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.recentJobs.length === 0 ? (
                  <EmptyRow colSpan={9} text={t.admin.reelflow.empty.jobs} />
                ) : (
                  overview.recentJobs.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="min-w-52">
                          <p className="font-medium">{item.templateName}</p>
                          <p className="mt-1 max-w-72 truncate text-xs text-muted-foreground">{item.lastErrorMessage || item.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.workspaceName}</TableCell>
                      <TableCell><Badge variant={statusVariant(item.status)}>{statusText(item.status)}</Badge></TableCell>
                      <TableCell><Badge variant={statusVariant(item.qualityStatus)}>{statusText(item.qualityStatus)}</Badge></TableCell>
                      <TableCell><Badge variant={statusVariant(item.artifactStatus)}>{statusText(item.artifactStatus)}</Badge></TableCell>
                      <TableCell>{item.priority}</TableCell>
                      <TableCell>{item.estimatedCredits}</TableCell>
                      <TableCell>{formatDate(item.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/${locale}/admin/reelflow/jobs/${item.id}`} data-testid={`reelflow-admin-open-job-${item.id}`}>
                            {t.admin.reelflow.actions.openTask}
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-lg border bg-card shadow-sm" data-testid="reelflow-admin-providers-section">
            <SectionHeader title={t.admin.reelflow.sections.providers} />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.admin.reelflow.table.name}</TableHead>
                    <TableHead>{t.admin.reelflow.table.type}</TableHead>
                    <TableHead>{t.admin.reelflow.table.priority}</TableHead>
                    <TableHead>{t.admin.reelflow.table.status}</TableHead>
                    <TableHead>{t.admin.reelflow.table.health}</TableHead>
                    <TableHead className="text-right">{t.admin.reelflow.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.providers.length === 0 ? (
                    <EmptyRow colSpan={6} text={t.admin.reelflow.empty.providers} />
                  ) : (
                    overview.providers.map((item) => (
                      <TableRow key={item.id} data-testid={`reelflow-admin-provider-row-${item.providerType}-${item.provider}`}>
                        <TableCell>
                          <div className="min-w-52">
                            <p className="font-medium">{item.displayName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.provider}</p>
                          </div>
                        </TableCell>
                        <TableCell>{item.providerType}</TableCell>
                        <TableCell>{item.priority}</TableCell>
                        <TableCell>
                          <Badge variant={item.enabled ? 'default' : 'secondary'}>
                            {item.enabled ? t.admin.reelflow.status.enabled : t.admin.reelflow.status.disabled}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ProviderHealthCell health={item.latestHealth} formatDate={formatDate} t={t} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`reelflow-admin-provider-health-${item.providerType}-${item.provider}`}
                              disabled={busyId === `health:${item.id}`}
                              onClick={() => checkProviderHealth(item.id)}
                            >
                              {busyId === `health:${item.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                              {t.admin.reelflow.actions.checkHealth}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`reelflow-admin-provider-toggle-${item.providerType}-${item.provider}`}
                              disabled={busyId === item.id}
                              onClick={() => patchProvider(item.id, { enabled: !item.enabled })}
                            >
                              {item.enabled ? t.admin.reelflow.actions.disable : t.admin.reelflow.actions.enable}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="rounded-lg border bg-card shadow-sm" data-testid="reelflow-admin-pricing-section">
            <SectionHeader title={t.admin.reelflow.sections.pricing} />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.admin.reelflow.table.resource}</TableHead>
                    <TableHead>{t.admin.reelflow.table.provider}</TableHead>
                    <TableHead>{t.admin.reelflow.table.unit}</TableHead>
                    <TableHead>{t.admin.reelflow.table.providerCost}</TableHead>
                    <TableHead>{t.admin.reelflow.table.creditPrice}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.pricing.length === 0 ? (
                    <EmptyRow colSpan={5} text={t.admin.reelflow.empty.pricing} />
                  ) : (
                    overview.pricing.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.resourceType}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.model || t.common.notAvailable}</p>
                          </div>
                        </TableCell>
                        <TableCell>{item.provider}</TableCell>
                        <TableCell>{item.usageUnit}</TableCell>
                        <TableCell>{item.providerCostUnitPrice} {item.providerCostCurrency}</TableCell>
                        <TableCell>{item.creditUnitPrice}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function ProviderHealthCell({
  health,
  formatDate,
  t,
}: {
  health: AdminOverview['providers'][number]['latestHealth']
  formatDate: (value: string) => string
  t: any
}) {
  if (!health) {
    return <span className="text-sm text-muted-foreground">{t.admin.reelflow.status.notChecked}</span>
  }

  const variant = health.status === 'unavailable'
    ? 'destructive'
    : health.status === 'degraded'
      ? 'secondary'
      : 'default'

  const label = (t.admin.reelflow.healthStatus as Record<string, string>)[health.status] || health.status

  return (
    <div className="min-w-44">
      <Badge variant={variant}>{label}</Badge>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatDate(health.createdAt)}
        {typeof health.latencyMs === 'number' ? ` · ${health.latencyMs}ms` : ''}
      </p>
      {health.errorMessage && (
        <p className="mt-1 max-w-56 truncate text-xs text-destructive" title={health.errorMessage}>
          {health.errorMessage}
        </p>
      )}
    </div>
  )
}

function MetricCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-foreground">{icon}</div>
      </div>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b px-5 py-4">
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  )
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  )
}
