import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@libs/react-shared/ui/button'
import { Input } from '@libs/react-shared/ui/input'
import { Label } from '@libs/react-shared/ui/label'
import { Textarea } from '@libs/react-shared/ui/textarea'
import { Badge } from '@libs/react-shared/ui/badge'
import { Switch } from '@libs/react-shared/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@libs/react-shared/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, Coins, Film, ImageIcon, Layers3, Loader2, LockKeyhole, PackageOpen, Sparkles, Video, WandSparkles, X, Mic2, ListChecks, type LucideIcon } from 'lucide-react'

export const Route = createFileRoute('/$lang/(root)/reelflow/')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.generate),
  component: ReelflowGeneratePage,
})

type TemplateInputField = {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'switch' | 'number' | 'asset'
  required?: boolean
  placeholder?: string
  defaultValue?: unknown
  options?: Array<{ label: string; value: string }>
  assetTypes?: string[]
  min?: number
  max?: number
}

type ReelflowTemplate = {
  id: string
  code: string
  name: string
  description: string | null
  category: string | null
  visibility: string
  recommended: boolean
  inputSchema: { fields?: TemplateInputField[] } | null
  capabilityRequirements: string[] | null
  estimatedCredits: number
  estimatedCreditsWithMp4: number
}

type ReelflowPreflightIssue = {
  code: string
  message?: string
  target?: string
}

type ReelflowAsset = {
  id: string
  assetType: string
  sourceType: string
  storageKey: string | null
  url: string | null
  mimeType: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

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
  status: string
  qualityStatus: string
  debtCredits?: string | number
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

function ReelflowGeneratePage() {
  const { t, locale } = useTranslation()
  const [templates, setTemplates] = useState<ReelflowTemplate[]>([])
  const [selectedCode, setSelectedCode] = useState('')
  const [inputParams, setInputParams] = useState<Record<string, unknown>>({})
  const [assets, setAssets] = useState<ReelflowAsset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [assetError, setAssetError] = useState<string | null>(null)
  const [renderMp4Requested, setRenderMp4Requested] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [preflightIssues, setPreflightIssues] = useState<ReelflowPreflightIssue[]>([])
  const [homeCredits, setHomeCredits] = useState<HomeCreditSummary | null>(null)
  const [homeJobs, setHomeJobs] = useState<HomeJobSummary>({ active: 0, issues: 0 })

  useEffect(() => {
    let alive = true
    async function loadTemplates() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/reelflow/templates')
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || t.reelflow.generate.loadError)
        if (!alive) return
        const loadedTemplates = (data.templates || []) as ReelflowTemplate[]
        setTemplates(loadedTemplates)
        if (loadedTemplates.length > 0) {
          setSelectedCode((current) => current || loadedTemplates[0].code)
        }
      } catch (err) {
        if (!alive) return
        const message = err instanceof Error ? err.message : t.reelflow.generate.loadError
        setError(message)
      } finally {
        if (alive) setLoading(false)
      }
    }

    void loadTemplates()
    return () => {
      alive = false
    }
  }, [t.reelflow.generate.loadError])

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
          const summary = jobsPayload.jobs.reduce(
            (acc: HomeJobSummary, jobItem: ReelflowJobHomeItem) => {
              if (jobItem.status === 'queued' || jobItem.status === 'running') acc.active += 1
              if (jobItem.status === 'failed' || jobItem.qualityStatus === 'needs_fix' || Number(jobItem.debtCredits || 0) > 0) acc.issues += 1
              return acc
            },
            { active: 0, issues: 0 },
          )
          setHomeJobs(summary)
        }
      } catch {
        // Home status is informational; feature pages expose detailed errors.
      }
    }

    void loadHomeStatus()
    return () => {
      alive = false
    }
  }, [])

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.code === selectedCode) || templates[0],
    [selectedCode, templates],
  )

  const fields = selectedTemplate?.inputSchema?.fields || []
  const hasAssetFields = fields.some((field) => field.type === 'asset')
  const estimatedCredits = selectedTemplate
    ? renderMp4Requested
      ? selectedTemplate.estimatedCreditsWithMp4
      : selectedTemplate.estimatedCredits
    : 0

  useEffect(() => {
    if (!selectedTemplate) return
    const defaults: Record<string, unknown> = {}
    for (const field of selectedTemplate.inputSchema?.fields || []) {
      if (field.defaultValue !== undefined) defaults[field.key] = field.defaultValue
      else if (field.type === 'switch') defaults[field.key] = false
      else if (field.type === 'number' && field.min !== undefined) defaults[field.key] = field.min
      else defaults[field.key] = ''
    }
    setInputParams(defaults)
  }, [selectedTemplate?.code])

  useEffect(() => {
    if (!hasAssetFields) {
      setAssets([])
      setAssetError(null)
      return
    }

    let alive = true
    async function loadAssets() {
      setAssetsLoading(true)
      setAssetError(null)
      try {
        const response = await fetch('/api/reelflow/assets?source=personal&limit=48')
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || t.reelflow.generate.assetLoadError)
        if (!alive) return
        setAssets((data.assets || []) as ReelflowAsset[])
      } catch (err) {
        if (!alive) return
        setAssetError(err instanceof Error ? err.message : t.reelflow.generate.assetLoadError)
      } finally {
        if (alive) setAssetsLoading(false)
      }
    }

    void loadAssets()
    return () => {
      alive = false
    }
  }, [hasAssetFields, selectedTemplate?.code, t.reelflow.generate.assetLoadError])

  const setFieldValue = (key: string, value: unknown) => {
    setRunError(null)
    setPreflightIssues([])
    setInputParams((current) => ({ ...current, [key]: value }))
  }

  const fieldLabel = (field: TemplateInputField) => {
    return (t.reelflow.generate.fields as Record<string, string>)[field.key] || field.label
  }

  const validate = () => {
    for (const field of fields) {
      if (!field.required) continue
      const value = inputParams[field.key]
      if (value === undefined || value === null || value === '') {
        toast.error(`${fieldLabel(field)} ${t.reelflow.generate.requiredMark}`)
        return false
      }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!selectedTemplate || !validate()) return
    setSubmitting(true)
    setRunError(null)
    setPreflightIssues([])
    try {
      const response = await fetch('/api/reelflow/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: selectedTemplate.code,
          inputParams,
          renderMp4Requested,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        const preflightErrors = Array.isArray(data?.preflight?.errors)
          ? (data.preflight.errors as ReelflowPreflightIssue[])
          : []
        const description = preflightErrors.length > 0
          ? preflightErrors.map((item) => preflightErrorText(item)).join('\n')
          : data?.error || t.reelflow.generate.submitError
        setPreflightIssues(preflightErrors)
        setRunError(description)
        toast.error(t.reelflow.generate.submitError, { description })
        return
      }
      toast.success(t.reelflow.generate.submitSuccess)
      window.location.href = `/${locale}/reelflow/jobs/${data.jobId}`
    } catch (err) {
      const message = err instanceof Error ? err.message : t.reelflow.generate.submitError
      setRunError(message)
      toast.error(t.reelflow.generate.submitError, { description: message })
    } finally {
      setSubmitting(false)
    }
  }

  const preflightErrorText = (issue: ReelflowPreflightIssue) => {
    const messages = t.reelflow.generate.preflightErrors as Record<string, string>
    return messages[issue.code] || issue.message || t.reelflow.generate.submitError
  }

  return (
    <main className="min-h-screen bg-background" data-testid="reelflow-generate-page">
      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="reelflow-hero-panel p-5 sm:p-7">
              <div className="flex flex-col gap-6 2xl:flex-row 2xl:items-end 2xl:justify-between">
                <div className="max-w-3xl">
                  <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{t.reelflow.home.title}</h1>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{t.reelflow.home.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <a href="#draft">
                      <WandSparkles className="mr-2 h-4 w-4" />
                      {t.reelflow.home.primaryCta}
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={`/${locale}/reelflow/image`}>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      {t.reelflow.home.secondaryCta}
                    </a>
                  </Button>
                </div>
              </div>

              <div className="mt-8 grid gap-3 md:grid-cols-4">
                <QuickAction icon={Film} label={t.reelflow.home.actions.draft} href="#draft" />
                <QuickAction icon={ImageIcon} label={t.reelflow.home.actions.image} href={`/${locale}/reelflow/image`} />
                <QuickAction icon={ListChecks} label={t.reelflow.home.actions.tasks} href={`/${locale}/reelflow/jobs`} />
                <QuickAction icon={Coins} label={t.reelflow.home.actions.credits} href={`/${locale}/reelflow/credits`} />
              </div>
            </div>

            <div className="reelflow-panel p-5">
              <h2 className="text-sm font-semibold">{t.reelflow.home.statusTitle}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <StatusMetric label={t.reelflow.home.stats.availableCredits} value={homeCredits ? formatHomeNumber(homeCredits.balance, locale) : '--'} />
                <StatusMetric label={t.reelflow.home.stats.frozenCredits} value={homeCredits ? formatHomeNumber(homeCredits.frozenBalance, locale) : '--'} tone="amber" />
                <StatusMetric label={t.reelflow.home.stats.activeTasks} value={formatHomeNumber(homeJobs.active, locale)} tone="blue" />
                <StatusMetric label={t.reelflow.home.stats.issues} value={formatHomeNumber(homeCredits ? homeJobs.issues + (homeCredits.debtBalance > 0 ? 1 : 0) : homeJobs.issues, locale)} tone="green" />
              </div>
            </div>
          </div>

          <section id="creation" className="reelflow-panel mt-5 p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{t.reelflow.home.createCenterTitle}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{t.reelflow.home.createCenterDescription}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <AbilityCard icon={Film} title={t.reelflow.home.abilities.draft.title} description={t.reelflow.home.abilities.draft.description} href="#draft" />
              <AbilityCard icon={ImageIcon} title={t.reelflow.home.abilities.image.title} description={t.reelflow.home.abilities.image.description} href={`/${locale}/reelflow/image`} />
              <AbilityCard icon={Video} title={t.reelflow.home.abilities.video.title} description={t.reelflow.home.abilities.video.description} disabled badge={t.reelflow.shell.comingSoon} />
              <AbilityCard icon={Mic2} title={t.reelflow.home.abilities.voice.title} description={t.reelflow.home.abilities.voice.description} disabled badge={t.reelflow.shell.comingSoon} />
            </div>
          </section>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section id="templates" className="reelflow-panel p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{t.reelflow.home.galleryTitle}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{t.reelflow.home.galleryDescription}</p>
                </div>
                <Layers3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {(t.reelflow.home.gallery as HomeGalleryItem[]).map((item, index) => (
                  <OfficialWorkCard key={item.title} item={item} index={index} />
                ))}
              </div>
            </section>

            <section className="reelflow-panel p-5 sm:p-6">
              <h2 className="text-xl font-semibold">{t.reelflow.home.recommendationTitle}</h2>
              <div className="mt-5 space-y-3">
                {(t.reelflow.home.recommendations as HomeRecommendationItem[]).map((item) => (
                  <div key={item.title} className="reelflow-muted-tile p-4">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section id="draft" className="bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{t.reelflow.home.draftAnchorTitle}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t.reelflow.home.draftAnchorDescription}</p>
            </div>
            <Button variant="outline" asChild>
              <a href={`/${locale}/reelflow/jobs`}>
                <Clock3 className="mr-2 h-4 w-4" />
                {t.reelflow.common.viewTasks}
              </a>
            </Button>
          </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="reelflow-panel p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{t.reelflow.generate.templateSection}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.reelflow.generate.chooseTemplate}</p>
              </div>
              {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>{t.reelflow.generate.loadError}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : loading ? (
              <div className="grid gap-3 md:grid-cols-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="h-36 animate-pulse rounded-lg bg-muted/40 ring-1 ring-border/40" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-8 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
                <h3 className="mt-3 font-semibold">{t.reelflow.generate.emptyTemplates}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.reelflow.generate.emptyTemplatesHint}</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {templates.map((template) => {
                  const selected = template.code === selectedTemplate?.code
                  return (
                    <button
                      key={template.code}
                      type="button"
                      data-testid={`reelflow-template-${template.code}`}
                      className={`min-h-40 rounded-lg p-4 text-left shadow-xs ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                        selected ? 'bg-primary/5 ring-primary/35' : 'bg-background/70 ring-border/45 hover:bg-background'
                      }`}
                      onClick={() => {
                        setRunError(null)
                        setPreflightIssues([])
                        setSelectedCode(template.code)
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Film className={selected ? 'h-5 w-5 text-primary' : 'h-5 w-5 text-muted-foreground'} />
                        <div className="flex flex-wrap justify-end gap-1">
                          {template.recommended && <Badge variant="secondary">{t.reelflow.generate.recommended}</Badge>}
                          {template.visibility !== 'public' && (
                            <Badge variant="outline">
                              <LockKeyhole className="h-3 w-3" />
                              {t.reelflow.generate.privateTemplate}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <h3 className="mt-4 text-base font-semibold">{template.name}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{template.description}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {selectedTemplate && (
            <section className="reelflow-panel p-5">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">{t.reelflow.generate.inputSection}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.reelflow.generate.fieldsHint}</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {fields.map((field) => (
                  <div key={field.key} className={field.type === 'textarea' ? 'space-y-2 md:col-span-2' : 'space-y-2'}>
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor={`reelflow-${field.key}`}>{fieldLabel(field)}</Label>
                      {field.required && <span className="text-xs text-muted-foreground">{t.reelflow.generate.requiredMark}</span>}
                    </div>
                    {field.type === 'asset' ? (
                      <AssetPicker
                        field={field}
                        assets={assets}
                        loading={assetsLoading}
                        error={assetError}
                        value={String(inputParams[field.key] || '')}
                        locale={locale}
                        t={t}
                        onValueChange={(value) => setFieldValue(field.key, value)}
                      />
                    ) : field.type === 'textarea' ? (
                      <Textarea
                        id={`reelflow-${field.key}`}
                        value={String(inputParams[field.key] || '')}
                        onChange={(event) => setFieldValue(field.key, event.target.value)}
                        placeholder={field.placeholder || t.reelflow.generate.textPlaceholder}
                        className="min-h-28 resize-y"
                      />
                    ) : field.type === 'select' ? (
                      <Select value={String(inputParams[field.key] || '')} onValueChange={(value) => setFieldValue(field.key, value)}>
                        <SelectTrigger id={`reelflow-${field.key}`} className="w-full">
                          <SelectValue placeholder={t.reelflow.generate.selectPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {(field.options || []).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'switch' ? (
                      <div className="flex h-10 items-center justify-between rounded-md border px-3">
                        <span className="text-sm text-muted-foreground">
                          {inputParams[field.key] ? t.reelflow.generate.booleanOn : t.reelflow.generate.booleanOff}
                        </span>
                        <Switch checked={Boolean(inputParams[field.key])} onCheckedChange={(value) => setFieldValue(field.key, value)} />
                      </div>
                    ) : (
                      <Input
                        id={`reelflow-${field.key}`}
                        type={field.type === 'number' ? 'number' : 'text'}
                        min={field.min}
                        max={field.max}
                        value={String(inputParams[field.key] ?? '')}
                        onChange={(event) => setFieldValue(field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)}
                        placeholder={field.placeholder || t.reelflow.generate.textPlaceholder}
                      />
                    )}
                    {field.type === 'number' && field.min !== undefined && field.max !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {t.reelflow.generate.numberRange.replace('{min}', String(field.min)).replace('{max}', String(field.max))}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="reelflow-panel p-5">
            <h2 className="text-lg font-semibold">{t.reelflow.generate.outputSection}</h2>
            <div className="mt-4 space-y-4">
              <div className="reelflow-muted-tile p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{t.reelflow.jobs.draftRequested}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{t.reelflow.generate.draftOnlyHint}</p>
                  </div>
                </div>
              </div>
              <div className="reelflow-muted-tile p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label htmlFor="render-mp4">{t.reelflow.generate.renderMp4}</Label>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{t.reelflow.generate.renderMp4Hint}</p>
                  </div>
                  <Switch id="render-mp4" data-testid="reelflow-render-mp4" checked={renderMp4Requested} onCheckedChange={setRenderMp4Requested} />
                </div>
              </div>
            </div>
          </section>

          <section className="reelflow-panel p-5">
            <h2 className="text-lg font-semibold">{t.reelflow.generate.runSection}</h2>
            <div className="mt-4 rounded-lg bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">{t.reelflow.generate.estimate}</p>
              <p className="mt-1 text-3xl font-semibold">
                {estimatedCredits}
                <span className="ml-2 text-base font-normal text-muted-foreground">{t.reelflow.common.credits}</span>
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.reelflow.generate.estimateHint}</p>
            </div>
            {runError && (
              <Alert variant="destructive" className="mt-4" data-testid="reelflow-preflight-alert">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{preflightIssues.length > 0 ? t.reelflow.generate.preflightTitle : t.reelflow.generate.runBlockedTitle}</AlertTitle>
                <AlertDescription>
                  <div className="space-y-3">
                    <p>{preflightIssues.length > 0 ? t.reelflow.generate.preflightBody : runError}</p>
                    {preflightIssues.length > 0 && (
                      <ul className="list-disc space-y-1 pl-5">
                        {preflightIssues.map((issue, index) => (
                          <li key={`${issue.code}-${issue.target || index}`}>{preflightErrorText(issue)}</li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/${locale}/reelflow/credits`}>{t.reelflow.generate.checkCredits}</a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/${locale}/reelflow/jobs`}>{t.reelflow.generate.checkTasks}</a>
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            <Button data-testid="reelflow-submit-job" className="mt-5 w-full" size="lg" disabled={!selectedTemplate || submitting || loading} onClick={handleSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.reelflow.generate.submitting}
                </>
              ) : (
                <>
                  {t.reelflow.generate.submit}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </section>
        </aside>
      </div>
        </div>
      </section>
    </main>
  )
}

function QuickAction({ icon: Icon, label, href }: { icon: LucideIcon; label: string; href: string }) {
  return (
    <a href={href} className="reelflow-soft-tile flex min-h-16 items-center gap-3 p-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted/70 text-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span>{label}</span>
    </a>
  )
}

function StatusMetric({ label, value, tone }: { label: string; value: string; tone?: 'amber' | 'blue' | 'green' }) {
  const color = tone === 'amber' ? 'var(--reelflow-amber)' : tone === 'blue' ? 'var(--reelflow-blue)' : tone === 'green' ? 'var(--reelflow-green)' : 'currentColor'
  return (
    <div className="reelflow-muted-tile p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums" style={{ color }}>{value}</p>
    </div>
  )
}

function AbilityCard({
  icon: Icon,
  title,
  description,
  href,
  disabled,
  badge,
}: {
  icon: LucideIcon
  title: string
  description: string
  href?: string
  disabled?: boolean
  badge?: string
}) {
  const content = (
    <>
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-5">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {disabled && badge && <Badge variant="secondary" className="mt-4">{badge}</Badge>}
    </>
  )

  if (disabled || !href) {
    return <div className="reelflow-muted-tile p-4 text-muted-foreground opacity-80">{content}</div>
  }

  return (
    <a href={href} className="reelflow-soft-tile block p-4 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
      {content}
    </a>
  )
}

function OfficialWorkCard({ item, index }: { item: { title: string; category: string; description: string }; index: number }) {
  const palettes = [
    'from-[#1f2937] via-[#f9735b] to-[#f7c66f]',
    'from-[#202124] via-[#64748b] to-[#93c5fd]',
    'from-[#251f1f] via-[#f59e0b] to-[#f8fafc]',
  ]
  return (
    <article className="overflow-hidden rounded-xl bg-background shadow-sm ring-1 ring-black/5">
      <div className={`aspect-[4/3] bg-gradient-to-br ${palettes[index % palettes.length]} p-4 text-white`}>
        <div className="flex h-full flex-col justify-between">
          <span className="w-fit rounded bg-white/18 px-2 py-1 text-xs font-medium backdrop-blur">{item.category}</span>
          <div>
            <p className="text-lg font-semibold leading-tight">{item.title}</p>
            <div className="mt-3 h-1.5 w-24 rounded-full bg-white/70" />
          </div>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
      </div>
    </article>
  )
}


function AssetPicker({
  field,
  assets,
  loading,
  error,
  value,
  locale,
  t,
  onValueChange,
}: {
  field: TemplateInputField
  assets: ReelflowAsset[]
  loading: boolean
  error: string | null
  value: string
  locale: string
  t: any
  onValueChange: (value: string) => void
}) {
  const acceptedTypes = field.assetTypes?.length ? field.assetTypes : ['reference_image', 'image', 'logo', 'avatar']
  const compatibleAssets = assets.filter((assetItem) => {
    if (acceptedTypes.includes(assetItem.assetType)) return true
    return acceptedTypes.includes('image') && Boolean(assetItem.mimeType?.startsWith('image/'))
  })
  const selectedAsset = compatibleAssets.find((assetItem) => assetItem.id === value)

  return (
    <div className="rounded-lg border bg-background p-3" data-testid={`reelflow-asset-picker-${field.key}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm leading-6 text-muted-foreground">
            {field.placeholder || t.reelflow.generate.assetHint}
          </p>
          {selectedAsset && (
            <p className="mt-1 truncate text-sm font-medium">
              {t.reelflow.generate.selectedAsset}: {assetDisplayName(selectedAsset)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onValueChange('')}>
              <X className="mr-1 h-4 w-4" />
              {t.reelflow.generate.clearAsset}
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={`/${locale}/reelflow/assets`}>
              <PackageOpen className="mr-1 h-4 w-4" />
              {t.reelflow.generate.openAssets}
            </a>
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="mt-3">
          <AlertTitle>{t.reelflow.generate.assetLoadError}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : loading ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[0, 1].map((index) => (
            <div key={index} className="h-28 animate-pulse rounded-md bg-muted/50" />
          ))}
        </div>
      ) : compatibleAssets.length === 0 ? (
        <div className="mt-3 rounded-md border border-dashed p-5 text-center">
          <ImageIcon className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">{t.reelflow.generate.noAssets}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{t.reelflow.generate.noAssetsHint}</p>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {compatibleAssets.slice(0, 6).map((assetItem) => {
            const selected = assetItem.id === value
            return (
              <button
                key={assetItem.id}
                type="button"
                data-testid={`reelflow-asset-picker-option-${assetItem.id}`}
                className={`grid min-h-28 grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-md border p-2 text-left transition hover:border-primary/60 ${
                  selected ? 'border-primary bg-primary/5' : 'bg-card'
                }`}
                onClick={() => onValueChange(assetItem.id)}
              >
                <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-md bg-muted">
                  {assetItem.url && assetItem.mimeType?.startsWith('image/') ? (
                    <img src={assetItem.url} alt={assetDisplayName(assetItem)} width={72} height={72} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 py-1">
                  <div className="truncate text-sm font-medium">{assetDisplayName(assetItem)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{assetTypeText(assetItem.assetType, t)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{formatAssetDate(assetItem.createdAt, locale)}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function assetDisplayName(assetItem: ReelflowAsset) {
  const metadata = assetItem.metadata && typeof assetItem.metadata === 'object' ? assetItem.metadata : {}
  const displayName = metadata.displayName
  const originalName = metadata.originalName
  if (typeof displayName === 'string' && displayName.trim()) return displayName
  if (typeof originalName === 'string' && originalName.trim()) return originalName
  return assetItem.storageKey || assetItem.url || assetItem.id.slice(0, 8)
}

function assetTypeText(assetType: string, t: any) {
  return (t.reelflow.assets as Record<string, string>)[assetType] || assetType
}

function formatAssetDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatHomeNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(value)
}
