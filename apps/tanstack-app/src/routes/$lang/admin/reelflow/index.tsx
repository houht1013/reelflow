import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { useTranslation } from '@/hooks/use-translation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@libs/react-shared/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@libs/react-shared/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@libs/react-shared/ui/dialog'
import { Input } from '@libs/react-shared/ui/input'
import { Label } from '@libs/react-shared/ui/label'
import { Switch } from '@libs/react-shared/ui/switch'
import { CheckCircle2, Clock3, CreditCard, Loader2, Pencil, RefreshCw, ServerCog, Sparkles, Video } from 'lucide-react'
import { PageHeader, StatCard } from '@/components/reelflow-ui'

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
  workspaces: Array<{
    id: string
    name: string
    status: string
    ownerName: string | null
    ownerEmail: string | null
    balance: string | null
    frozen: string | null
    debt: string | null
    members: number
    createdAt: string
  }>
  invites: Array<{
    id: string
    status: string
    referrerName: string | null
    referrerEmail: string | null
    referrerBonusCredits: string | null
    referredBonusCredits: string | null
    createdAt: string
    rewardedAt: string | null
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

  const [editingPrice, setEditingPrice] = useState<AdminOverview['pricing'][number] | null>(null)
  const [priceForm, setPriceForm] = useState({ creditUnitPrice: '', minCreditCost: '', providerCostUnitPrice: '', enabled: true })
  const [savingPrice, setSavingPrice] = useState(false)

  const openPriceEditor = (item: AdminOverview['pricing'][number]) => {
    setPriceForm({
      creditUnitPrice: item.creditUnitPrice,
      minCreditCost: item.minCreditCost ?? '',
      providerCostUnitPrice: item.providerCostUnitPrice,
      enabled: item.enabled,
    })
    setEditingPrice(item)
  }

  const savePrice = async () => {
    if (!editingPrice) return
    setSavingPrice(true)
    try {
      const response = await fetch(`/api/admin/reelflow/pricing/${editingPrice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditUnitPrice: priceForm.creditUnitPrice,
          minCreditCost: priceForm.minCreditCost === '' ? null : priceForm.minCreditCost,
          providerCostUnitPrice: priceForm.providerCostUnitPrice,
          enabled: priceForm.enabled,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || t.admin.reelflow.messages.operationFailed)
      toast.success(t.admin.reelflow.messages.pricingUpdated)
      setEditingPrice(null)
      await loadOverview()
    } catch (err) {
      toast.error(t.admin.reelflow.messages.operationFailed, {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSavingPrice(false)
    }
  }

  const [grantTemplate, setGrantTemplate] = useState<AdminOverview['templates'][number] | null>(null)
  const [grants, setGrants] = useState<Array<{ id: string; workspaceId: string; workspaceName: string | null; status: string; createdAt: string }>>([])
  const [grantsLoading, setGrantsLoading] = useState(false)
  const [newGrantWsId, setNewGrantWsId] = useState('')
  const [grantBusy, setGrantBusy] = useState(false)

  const fetchGrants = async (templateId: string) => {
    setGrantsLoading(true)
    try {
      const response = await fetch(`/api/admin/reelflow/templates/${templateId}/grants`)
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || t.admin.reelflow.messages.operationFailed)
      setGrants(data.grants || [])
    } catch (err) {
      toast.error(t.admin.reelflow.messages.operationFailed, { description: err instanceof Error ? err.message : undefined })
    } finally {
      setGrantsLoading(false)
    }
  }

  const openGrants = (item: AdminOverview['templates'][number]) => {
    setNewGrantWsId('')
    setGrants([])
    setGrantTemplate(item)
    void fetchGrants(item.id)
  }

  const addGrant = async () => {
    if (!grantTemplate || !newGrantWsId.trim()) return
    setGrantBusy(true)
    try {
      const response = await fetch(`/api/admin/reelflow/templates/${grantTemplate.id}/grants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: newGrantWsId.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || t.admin.reelflow.messages.operationFailed)
      setGrants(data.grants || [])
      setNewGrantWsId('')
      toast.success(t.admin.reelflow.messages.grantUpdated)
    } catch (err) {
      toast.error(t.admin.reelflow.messages.operationFailed, { description: err instanceof Error ? err.message : undefined })
    } finally {
      setGrantBusy(false)
    }
  }

  const revokeGrant = async (workspaceId: string) => {
    if (!grantTemplate) return
    setGrantBusy(true)
    try {
      const response = await fetch(`/api/admin/reelflow/templates/${grantTemplate.id}/grants?workspaceId=${encodeURIComponent(workspaceId)}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || t.admin.reelflow.messages.operationFailed)
      setGrants(data.grants || [])
      toast.success(t.admin.reelflow.messages.grantUpdated)
    } catch (err) {
      toast.error(t.admin.reelflow.messages.operationFailed, { description: err instanceof Error ? err.message : undefined })
    } finally {
      setGrantBusy(false)
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

  // Semantic tone for status pills (green success / amber pending / red failure /
  // blue running / gray neutral) — matches the user-facing StatusPill colors.
  const statusTone = (status: string): 'neutral' | 'info' | 'success' | 'warning' | 'danger' => {
    if (['published', 'completed', 'downloadable', 'accepted', 'settled', 'public', 'available', 'ready', 'done', 'succeeded', 'enabled', 'active'].includes(status)) return 'success'
    if (['failed', 'canceled', 'cancelled', 'debt', 'archived', 'disabled', 'needs_fix', 'blocked'].includes(status)) return 'danger'
    if (['queued', 'pending', 'frozen', 'draft', 'needs_review', 'private'].includes(status)) return 'warning'
    if (['running', 'generating', 'processing', 'in_progress'].includes(status)) return 'info'
    return 'neutral'
  }

  if (loading && !overview) {
    return (
      <div className="reelflow-app flex min-h-screen items-center justify-center">
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
    <div className="reelflow-app min-h-screen p-6 lg:p-8" data-testid="reelflow-admin-page">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow={t.admin.reelflow.eyebrow}
          title={t.admin.reelflow.title}
          description={t.admin.reelflow.description}
          actions={
            <>
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
            </>
          }
        />

        <div className="reelflow-reveal grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-delay="1">
          <StatCard icon={Video} tone="coral" label={t.admin.reelflow.metrics.templates} value={overview.stats.templates.total} hint={`${t.admin.reelflow.metrics.publishedTemplates}: ${overview.stats.templates.published}`} />
          <StatCard icon={Clock3} tone="blue" label={t.admin.reelflow.metrics.totalJobs} value={overview.stats.jobs.total} hint={`${t.admin.reelflow.metrics.runningJobs}: ${overview.stats.jobs.running}`} />
          <StatCard icon={ServerCog} tone="green" label={t.admin.reelflow.metrics.workspaces} value={overview.stats.workspaces.total} hint={`${t.admin.reelflow.metrics.failedJobs}: ${overview.stats.jobs.failed}`} />
          <StatCard icon={CreditCard} tone="amber" label={t.admin.reelflow.metrics.creditBalance} value={fmtCredits(overview.stats.credits.balance)} hint={`${t.admin.reelflow.metrics.frozenCredits}: ${fmtCredits(overview.stats.credits.frozen)}`} />
        </div>

        <section className="reelflow-panel" data-testid="reelflow-admin-templates-section">
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
                      <TableCell><span className="reelflow-pill" data-tone={statusTone(item.status)}>{statusText(item.status)}</span></TableCell>
                      <TableCell><span className="reelflow-pill" data-tone={statusTone(item.visibility)}>{statusText(item.visibility)}</span></TableCell>
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
                          {item.visibility === 'private' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`reelflow-admin-template-grants-${item.code}`}
                              onClick={() => openGrants(item)}
                            >
                              {t.admin.reelflow.actions.manageGrants}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="reelflow-panel" data-testid="reelflow-admin-recent-jobs-section">
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
                      <TableCell><span className="reelflow-pill" data-tone={statusTone(item.status)}>{statusText(item.status)}</span></TableCell>
                      <TableCell><span className="reelflow-pill" data-tone={statusTone(item.qualityStatus)}>{statusText(item.qualityStatus)}</span></TableCell>
                      <TableCell><span className="reelflow-pill" data-tone={statusTone(item.artifactStatus)}>{statusText(item.artifactStatus)}</span></TableCell>
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
          <section className="reelflow-panel" data-testid="reelflow-admin-providers-section">
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
                          <span className="reelflow-pill" data-tone={item.enabled ? 'success' : 'neutral'}>
                            {item.enabled ? t.admin.reelflow.status.enabled : t.admin.reelflow.status.disabled}
                          </span>
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

          <section className="reelflow-panel" data-testid="reelflow-admin-pricing-section">
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
                    <TableHead>{t.admin.reelflow.table.status}</TableHead>
                    <TableHead className="text-right">{t.admin.reelflow.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.pricing.length === 0 ? (
                    <EmptyRow colSpan={7} text={t.admin.reelflow.empty.pricing} />
                  ) : (
                    overview.pricing.map((item) => (
                      <TableRow key={item.id} data-testid={`reelflow-admin-pricing-row-${item.resourceType}-${item.provider}`}>
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
                        <TableCell>
                          <span className="reelflow-pill" data-tone={item.enabled ? 'success' : 'neutral'}>
                            {item.enabled ? t.admin.reelflow.status.enabled : t.admin.reelflow.status.disabled}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`reelflow-admin-pricing-edit-${item.resourceType}-${item.provider}`}
                            onClick={() => openPriceEditor(item)}
                          >
                            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                            {t.admin.reelflow.actions.editPrice}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>

        <section className="reelflow-panel" data-testid="reelflow-admin-workspaces-section">
          <SectionHeader title={t.admin.reelflow.sections.workspaces} />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.reelflow.table.name}</TableHead>
                  <TableHead>{t.admin.reelflow.table.owner}</TableHead>
                  <TableHead>{t.admin.reelflow.table.members}</TableHead>
                  <TableHead>{t.admin.reelflow.table.balance}</TableHead>
                  <TableHead>{t.admin.reelflow.table.frozen}</TableHead>
                  <TableHead>{t.admin.reelflow.table.debt}</TableHead>
                  <TableHead>{t.admin.reelflow.table.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.workspaces.length === 0 ? (
                  <EmptyRow colSpan={7} text={t.admin.reelflow.empty.workspaces} />
                ) : (
                  overview.workspaces.map((item) => (
                    <TableRow key={item.id} data-testid={`reelflow-admin-workspace-row-${item.id}`}>
                      <TableCell>
                        <div className="min-w-48">
                          <p className="font-medium">{item.name}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{item.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.ownerName || item.ownerEmail || t.common.notAvailable}</TableCell>
                      <TableCell>{item.members}</TableCell>
                      <TableCell>{item.balance ?? '0'}</TableCell>
                      <TableCell>{item.frozen ?? '0'}</TableCell>
                      <TableCell>{item.debt ?? '0'}</TableCell>
                      <TableCell><span className="reelflow-pill" data-tone={statusTone(item.status)}>{statusText(item.status)}</span></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="reelflow-panel" data-testid="reelflow-admin-invites-section">
          <SectionHeader title={t.admin.reelflow.sections.invites} />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.reelflow.table.inviter}</TableHead>
                  <TableHead>{t.admin.reelflow.table.status}</TableHead>
                  <TableHead>{t.admin.reelflow.table.reward}</TableHead>
                  <TableHead>{t.admin.reelflow.table.updatedAt}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.invites.length === 0 ? (
                  <EmptyRow colSpan={4} text={t.admin.reelflow.empty.invites} />
                ) : (
                  overview.invites.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.referrerName || item.referrerEmail || t.common.notAvailable}</TableCell>
                      <TableCell><span className="reelflow-pill" data-tone={statusTone(item.status)}>{statusText(item.status)}</span></TableCell>
                      <TableCell>+{item.referrerBonusCredits ?? '0'}</TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <Dialog open={editingPrice !== null} onOpenChange={(open) => { if (!open) setEditingPrice(null) }}>
        <DialogContent data-testid="reelflow-admin-pricing-dialog">
          <DialogHeader>
            <DialogTitle>{t.admin.reelflow.pricingEdit.title}</DialogTitle>
          </DialogHeader>
          {editingPrice && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {editingPrice.resourceType} · {editingPrice.provider}{editingPrice.model ? ` · ${editingPrice.model}` : ''}
              </p>
              <div className="space-y-2">
                <Label htmlFor="price-credit">{t.admin.reelflow.pricingEdit.creditUnitPrice}</Label>
                <Input
                  id="price-credit"
                  inputMode="decimal"
                  data-testid="reelflow-admin-pricing-credit"
                  value={priceForm.creditUnitPrice}
                  onChange={(event) => setPriceForm((form) => ({ ...form, creditUnitPrice: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price-min">{t.admin.reelflow.pricingEdit.minCreditCost}</Label>
                <Input
                  id="price-min"
                  inputMode="decimal"
                  data-testid="reelflow-admin-pricing-min"
                  value={priceForm.minCreditCost}
                  onChange={(event) => setPriceForm((form) => ({ ...form, minCreditCost: event.target.value }))}
                />
                <p className="text-xs text-muted-foreground">{t.admin.reelflow.pricingEdit.minCreditCostHint}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price-cost">{t.admin.reelflow.pricingEdit.providerCost}</Label>
                <Input
                  id="price-cost"
                  inputMode="decimal"
                  value={priceForm.providerCostUnitPrice}
                  onChange={(event) => setPriceForm((form) => ({ ...form, providerCostUnitPrice: event.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="price-enabled">{t.admin.reelflow.pricingEdit.enabled}</Label>
                <Switch
                  id="price-enabled"
                  data-testid="reelflow-admin-pricing-enabled"
                  checked={priceForm.enabled}
                  onCheckedChange={(checked) => setPriceForm((form) => ({ ...form, enabled: checked }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPrice(null)} disabled={savingPrice}>
              {t.admin.reelflow.pricingEdit.cancel}
            </Button>
            <Button onClick={savePrice} disabled={savingPrice} data-testid="reelflow-admin-pricing-save">
              {savingPrice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {t.admin.reelflow.pricingEdit.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={grantTemplate !== null} onOpenChange={(open) => { if (!open) setGrantTemplate(null) }}>
        <DialogContent data-testid="reelflow-admin-grants-dialog">
          <DialogHeader>
            <DialogTitle>{t.admin.reelflow.grants.title}</DialogTitle>
          </DialogHeader>
          {grantTemplate && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{grantTemplate.name} · {grantTemplate.code}</p>
              <p className="text-xs text-muted-foreground">{t.admin.reelflow.grants.description}</p>

              <div className="space-y-2">
                <Label htmlFor="grant-ws">{t.admin.reelflow.grants.workspaceId}</Label>
                <div className="flex gap-2">
                  <Input
                    id="grant-ws"
                    data-testid="reelflow-admin-grant-workspace-id"
                    placeholder={t.admin.reelflow.grants.workspaceIdPlaceholder}
                    value={newGrantWsId}
                    onChange={(event) => setNewGrantWsId(event.target.value)}
                  />
                  <Button onClick={addGrant} disabled={grantBusy || !newGrantWsId.trim()} data-testid="reelflow-admin-grant-add">
                    {grantBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    {t.admin.reelflow.grants.grant}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{t.admin.reelflow.grants.granted}</p>
                {grantsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  </div>
                ) : grants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.admin.reelflow.grants.empty}</p>
                ) : (
                  <ul className="divide-y rounded-lg border" data-testid="reelflow-admin-grants-list">
                    {grants.map((grant) => (
                      <li key={grant.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{grant.workspaceName || grant.workspaceId}</p>
                          <p className="truncate text-xs text-muted-foreground">{grant.workspaceId}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={grantBusy}
                          data-testid={`reelflow-admin-grant-revoke-${grant.workspaceId}`}
                          onClick={() => revokeGrant(grant.workspaceId)}
                        >
                          {t.admin.reelflow.grants.revoke}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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

  const tone: 'success' | 'warning' | 'danger' = health.status === 'unavailable'
    ? 'danger'
    : health.status === 'degraded'
      ? 'warning'
      : 'success'

  const label = (t.admin.reelflow.healthStatus as Record<string, string>)[health.status] || health.status

  return (
    <div className="min-w-44">
      <span className="reelflow-pill" data-tone={tone}>{label}</span>
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

function fmtCredits(value: string | number): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)
  return (Math.round(n * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-border/45 px-5 py-4">
      <h2 className="reelflow-display text-lg">{title}</h2>
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
