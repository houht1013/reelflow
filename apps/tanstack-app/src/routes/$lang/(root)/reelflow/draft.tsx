import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@libs/react-shared/ui/button'
import { Input } from '@libs/react-shared/ui/input'
import { Label } from '@libs/react-shared/ui/label'
import { Textarea } from '@libs/react-shared/ui/textarea'
import { Switch } from '@libs/react-shared/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@libs/react-shared/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, Coins, Film, ImageIcon, Loader2, LockKeyhole, PackageOpen, Sparkles, X } from 'lucide-react'
import { PageHeader } from '@/components/reelflow-ui'

export const Route = createFileRoute('/$lang/(root)/reelflow/draft')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  validateSearch: (search: Record<string, unknown>) => {
    const template = typeof search.template === 'string' ? search.template.trim() : ''
    return template ? { template } : {}
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.generate),
  component: ReelflowDraftPage,
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

function ReelflowDraftPage() {
  const navigate = useNavigate()
  const { t, locale } = useTranslation()
  const { template: requestedTemplate = '' } = Route.useSearch()
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
  const [fieldErrorKey, setFieldErrorKey] = useState<string | null>(null)

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
          const matchedTemplate = requestedTemplate ? loadedTemplates.find((template) => template.code === requestedTemplate) : null
          setSelectedCode((current) => current || matchedTemplate?.code || loadedTemplates[0].code)
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
  }, [requestedTemplate, t.reelflow.generate.loadError])

  useEffect(() => {
    if (!requestedTemplate || templates.length === 0) return
    const matchedTemplate = templates.find((template) => template.code === requestedTemplate)
    if (matchedTemplate && matchedTemplate.code !== selectedCode) setSelectedCode(matchedTemplate.code)
  }, [requestedTemplate, selectedCode, templates])

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
    if (fieldErrorKey === key) setFieldErrorKey(null)
    setInputParams((current) => ({ ...current, [key]: value }))
  }

  const selectTemplate = (templateCode: string) => {
    setRunError(null)
    setPreflightIssues([])
    setSelectedCode(templateCode)
    void navigate({
      to: '/$lang/reelflow/draft',
      params: { lang: locale },
      search: { template: templateCode },
      replace: true,
    })
  }

  const fieldLabel = (field: TemplateInputField) => {
    return (t.reelflow.generate.fields as Record<string, string>)[field.key] || field.label
  }

  const fieldRequiredMessage = (field: TemplateInputField) => {
    return t.reelflow.generate.requiredField.replace('{field}', fieldLabel(field))
  }

  const validate = () => {
    for (const field of fields) {
      if (!field.required) continue
      const value = inputParams[field.key]
      if (value === undefined || value === null || value === '') {
        const message = fieldRequiredMessage(field)
        setFieldErrorKey(field.key)
        window.setTimeout(() => {
          const fieldNode = document.getElementById(`reelflow-${field.key}`)
          const fallbackNode = document.querySelector<HTMLElement>(`[data-field-key="${field.key}"] button`)
          ;(fieldNode || fallbackNode)?.focus()
        }, 0)
        toast.error(message)
        return false
      }
    }
    setFieldErrorKey(null)
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
      await navigate({
        to: '/$lang/reelflow/jobs/$id',
        params: { lang: locale, id: data.jobId },
      })
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
    <main className="min-h-screen" data-testid="reelflow-draft-page">
      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <PageHeader
            eyebrow={t.reelflow.home.draftAnchorEyebrow}
            title={t.reelflow.home.draftAnchorTitle}
            actions={
              <Button variant="outline" asChild>
                <Link to="/$lang/reelflow/jobs" params={{ lang: locale }}>
                  <Clock3 className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t.reelflow.common.viewTasks}
                </Link>
              </Button>
            }
          />

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="reelflow-panel reelflow-reveal p-5" data-delay="1">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 className="reelflow-display text-lg">{t.reelflow.generate.templateSection}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.reelflow.generate.chooseTemplate}</p>
              </div>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
              ) : templates.length > 0 ? (
                <span className="reelflow-pill w-fit" data-tone="neutral">
                  <Film aria-hidden="true" />
                  {templates.length} {t.reelflow.generate.availableTemplates}
                </span>
              ) : null}
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>{t.reelflow.generate.loadError}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : loading ? (
              <div className="grid gap-3 md:grid-cols-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="reelflow-skeleton h-36" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="reelflow-muted-tile p-8 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">{t.reelflow.generate.emptyTemplates}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.reelflow.generate.emptyTemplatesHint}</p>
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {templates.map((template, index) => {
                  const selected = template.code === selectedTemplate?.code
                  return (
                    <button
                      key={template.code}
                      type="button"
                      data-testid={`reelflow-template-${template.code}`}
                      aria-pressed={selected}
                      aria-label={`${t.reelflow.generate.createFromTemplate}: ${template.name}`}
                      className={`reelflow-soft-tile group relative grid min-h-44 grid-cols-[92px_minmax(0,1fr)] gap-4 p-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:grid-cols-[112px_minmax(0,1fr)] ${
                        selected
                          ? 'bg-primary/[0.06] shadow-[var(--reelflow-tile-shadow)] ring-1 ring-primary/25'
                          : 'hover:bg-background/85'
                      }`}
                      onClick={() => {
                        selectTemplate(template.code)
                      }}
                    >
                      <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${templatePreviewGradient(index)}`}>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(1_0_0_/_34%),transparent_32%),linear-gradient(180deg,transparent,oklch(0_0_0_/_20%))]" aria-hidden="true" />
                        <div className="relative flex h-full min-h-36 flex-col justify-between p-3 text-white">
                          <span className="w-fit rounded-full bg-white/18 px-2 py-1 text-[11px] font-medium backdrop-blur">
                            {template.category || t.reelflow.generate.templateCategory}
                          </span>
                          <Film className="h-6 w-6 opacity-85" aria-hidden="true" />
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-col py-1">
                        <div className="flex items-start justify-between gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-[inset_0_0_0_1px_var(--reelflow-hairline)] ${selected ? 'bg-primary/15 text-primary' : 'bg-background/70 text-muted-foreground'}`}>
                            {selected ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <Film className="h-5 w-5" aria-hidden="true" />}
                          </span>
                          <div className="flex min-w-0 flex-wrap justify-end gap-1">
                          {template.recommended && (
                            <span className="reelflow-pill" data-tone="brand">
                              <Sparkles aria-hidden="true" />
                              {t.reelflow.generate.recommended}
                            </span>
                          )}
                          {template.visibility !== 'public' && (
                            <span className="reelflow-pill" data-tone="neutral">
                              <LockKeyhole aria-hidden="true" />
                              {t.reelflow.generate.privateTemplate}
                            </span>
                          )}
                          </div>
                        </div>
                        <h3 className="mt-4 line-clamp-2 text-base font-semibold">{template.name}</h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{template.description}</p>
                        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Coins className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatDraftNumber(template.estimatedCredits, locale)} {t.reelflow.common.credits}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{t.reelflow.jobs.draftRequested}</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {selectedTemplate && (
            <section className="reelflow-panel reelflow-reveal p-5" data-delay="2">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="reelflow-display text-lg">{t.reelflow.generate.inputSection}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t.reelflow.generate.fieldsHint}</p>
                </div>
                <span className="reelflow-pill w-fit" data-tone="neutral">
                  <Film aria-hidden="true" />
                  {selectedTemplate.name}
                </span>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {fields.map((field) => {
                  const hasFieldError = fieldErrorKey === field.key
                  const errorId = `reelflow-${field.key}-error`
                  const helpId = `reelflow-${field.key}-help`
                  const describedBy = [
                    hasFieldError ? errorId : null,
                    field.type === 'number' && field.min !== undefined && field.max !== undefined ? helpId : null,
                  ].filter(Boolean).join(' ') || undefined

                  return (
                  <div key={field.key} data-field-key={field.key} className={field.type === 'textarea' ? 'space-y-2 md:col-span-2' : 'space-y-2'}>
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
                        invalid={hasFieldError}
                        describedBy={describedBy}
                        onValueChange={(value) => setFieldValue(field.key, value)}
                      />
                    ) : field.type === 'textarea' ? (
                      <Textarea
                        id={`reelflow-${field.key}`}
                        name={field.key}
                        autoComplete="off"
                        value={String(inputParams[field.key] || '')}
                        onChange={(event) => setFieldValue(field.key, event.target.value)}
                        placeholder={field.placeholder || t.reelflow.generate.textPlaceholder}
                        aria-invalid={hasFieldError}
                        aria-describedby={describedBy}
                        className="min-h-28 resize-y"
                      />
                    ) : field.type === 'select' ? (
                      <Select name={field.key} value={String(inputParams[field.key] || '')} onValueChange={(value) => setFieldValue(field.key, value)}>
                        <SelectTrigger id={`reelflow-${field.key}`} aria-label={fieldLabel(field)} aria-invalid={hasFieldError} aria-describedby={describedBy} className="w-full">
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
                    <div className="reelflow-muted-tile flex h-10 items-center justify-between px-3">
                        <span className="text-sm text-muted-foreground">
                          {inputParams[field.key] ? t.reelflow.generate.booleanOn : t.reelflow.generate.booleanOff}
                        </span>
                        <Switch
                          id={`reelflow-${field.key}`}
                          name={field.key}
                          aria-label={fieldLabel(field)}
                          aria-invalid={hasFieldError}
                          aria-describedby={describedBy}
                          checked={Boolean(inputParams[field.key])}
                          onCheckedChange={(value) => setFieldValue(field.key, value)}
                        />
                      </div>
                    ) : (
                      <Input
                        id={`reelflow-${field.key}`}
                        name={field.key}
                        autoComplete="off"
                        inputMode={field.type === 'number' ? 'numeric' : undefined}
                        type={field.type === 'number' ? 'number' : 'text'}
                        min={field.min}
                        max={field.max}
                        value={String(inputParams[field.key] ?? '')}
                        onChange={(event) => setFieldValue(field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)}
                        placeholder={field.placeholder || t.reelflow.generate.textPlaceholder}
                        aria-invalid={hasFieldError}
                        aria-describedby={describedBy}
                      />
                    )}
                    {hasFieldError && (
                      <p id={errorId} className="text-xs font-medium text-destructive" aria-live="polite">
                        {fieldRequiredMessage(field)}
                      </p>
                    )}
                    {field.type === 'number' && field.min !== undefined && field.max !== undefined && (
                      <p id={helpId} className="text-xs text-muted-foreground">
                        {t.reelflow.generate.numberRange.replace('{min}', String(field.min)).replace('{max}', String(field.max))}
                      </p>
                    )}
                  </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <section className="reelflow-panel reelflow-reveal p-5" data-delay="2">
            <h2 className="reelflow-display text-lg">{t.reelflow.generate.settingsSection}</h2>
            <div className="mt-4 space-y-3">
              {selectedTemplate && (
                <div className="reelflow-hero-panel p-4">
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                    {t.reelflow.generate.currentTemplate}
                  </p>
                  <h3 className="mt-2 line-clamp-2 text-base font-semibold">{selectedTemplate.name}</h3>
                  {selectedTemplate.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{selectedTemplate.description}</p>
                  )}
                </div>
              )}
              <div className="reelflow-muted-tile flex items-center gap-3 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/70 text-primary shadow-[inset_0_0_0_1px_var(--reelflow-hairline)]">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{t.reelflow.jobs.draftRequested}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t.reelflow.generate.draftOnlyHint}</p>
                </div>
              </div>
              <div className="reelflow-muted-tile flex items-center justify-between gap-4 p-3">
                <div className="min-w-0">
                  <Label htmlFor="render-mp4">{t.reelflow.generate.renderMp4}</Label>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t.reelflow.generate.renderMp4Hint}</p>
                </div>
                <Switch
                  id="render-mp4"
                  name="renderMp4Requested"
                  aria-label={t.reelflow.generate.renderMp4}
                  data-testid="reelflow-render-mp4"
                  checked={renderMp4Requested}
                  onCheckedChange={setRenderMp4Requested}
                />
              </div>
              <div className="reelflow-muted-tile p-4">
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Coins className="h-4 w-4" style={{ color: 'var(--reelflow-amber)' }} aria-hidden="true" />
                  {t.reelflow.generate.estimate}
                </p>
                <p className="reelflow-display reelflow-num mt-1.5 text-4xl">
                  {estimatedCredits}
                  <span className="ml-2 font-sans text-base font-normal text-muted-foreground">{t.reelflow.common.credits}</span>
                </p>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{t.reelflow.generate.estimateHint}</p>
              </div>
            </div>
            {runError && (
              <Alert variant="destructive" className="mt-4" data-testid="reelflow-preflight-alert" aria-live="polite">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
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
                        <Link to="/$lang/reelflow/credits" params={{ lang: locale }}>{t.reelflow.generate.checkCredits}</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/$lang/reelflow/jobs" params={{ lang: locale }}>{t.reelflow.generate.checkTasks}</Link>
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            <Button type="button" data-testid="reelflow-submit-job" className="mt-5 w-full disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none" size="lg" disabled={!selectedTemplate || submitting || loading} onClick={handleSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {t.reelflow.generate.submitting}
                </>
              ) : (
                <>
                  {t.reelflow.generate.submit}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
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


function AssetPicker({
  field,
  assets,
  loading,
  error,
  value,
  locale,
  t,
  invalid,
  describedBy,
  onValueChange,
}: {
  field: TemplateInputField
  assets: ReelflowAsset[]
  loading: boolean
  error: string | null
  value: string
  locale: string
  t: any
  invalid?: boolean
  describedBy?: string
  onValueChange: (value: string) => void
}) {
  const acceptedTypes = field.assetTypes?.length ? field.assetTypes : ['reference_image', 'image', 'logo', 'avatar']
  const compatibleAssets = assets.filter((assetItem) => {
    if (acceptedTypes.includes(assetItem.assetType)) return true
    return acceptedTypes.includes('image') && Boolean(assetItem.mimeType?.startsWith('image/'))
  })
  const selectedAsset = compatibleAssets.find((assetItem) => assetItem.id === value)

  return (
    <div
      id={`reelflow-${field.key}`}
      className={`reelflow-muted-tile p-3 ${invalid ? 'ring-1 ring-destructive/55' : ''}`}
      data-testid={`reelflow-asset-picker-${field.key}`}
      aria-invalid={invalid}
      aria-describedby={describedBy}
    >
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
              <X className="mr-1 h-4 w-4" aria-hidden="true" />
              {t.reelflow.generate.clearAsset}
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/$lang/reelflow/assets" params={{ lang: locale }} search={{ source: 'all', assetType: 'all', query: '' }}>
              <PackageOpen className="mr-1 h-4 w-4" aria-hidden="true" />
              {t.reelflow.generate.openAssets}
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="mt-3">
          <AlertTitle>{t.reelflow.generate.assetLoadError}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : loading ? (
        <div className="mt-3 grid gap-2">
          {[0, 1].map((index) => (
            <div key={index} className="reelflow-skeleton h-24" />
          ))}
        </div>
      ) : compatibleAssets.length === 0 ? (
        <div className="mt-3 rounded-xl bg-background/45 p-4 shadow-[inset_0_0_0_1px_var(--reelflow-hairline)]">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
              <ImageIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{t.reelflow.generate.noAssets}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{t.reelflow.generate.noAssetsHint}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link to="/$lang/reelflow/assets" params={{ lang: locale }} search={{ source: 'personal', assetType: 'all', query: '' }}>
                    <PackageOpen className="mr-1 h-4 w-4" aria-hidden="true" />
                    {t.reelflow.generate.openAssets}
                  </Link>
                </Button>
                <Button type="button" variant="ghost" size="sm" asChild>
                  <Link to="/$lang/reelflow/image" params={{ lang: locale }}>
                    <ImageIcon className="mr-1 h-4 w-4" aria-hidden="true" />
                    {t.reelflow.home.secondaryCta}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {compatibleAssets.slice(0, 6).map((assetItem) => {
            const selected = assetItem.id === value
            return (
              <button
                key={assetItem.id}
                type="button"
                data-testid={`reelflow-asset-picker-option-${assetItem.id}`}
                aria-pressed={selected}
                className={`grid min-h-24 grid-cols-[80px_minmax(0,1fr)] gap-3 rounded-xl p-2 text-left shadow-[inset_0_0_0_1px_var(--reelflow-hairline)] transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-background/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                  selected ? 'bg-primary/[0.07] shadow-[var(--reelflow-tile-shadow)] ring-1 ring-primary/25' : 'bg-background/45'
                }`}
                onClick={() => onValueChange(assetItem.id)}
              >
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {assetItem.url && assetItem.mimeType?.startsWith('image/') ? (
                    <img src={assetItem.url} alt={assetDisplayName(assetItem)} width={80} height={80} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
                <div className="flex min-w-0 flex-col justify-center">
                  <div className="line-clamp-1 text-sm font-medium">{assetDisplayName(assetItem)}</div>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="truncate">{assetTypeText(assetItem.assetType, t)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="shrink-0">{formatAssetDate(assetItem.createdAt, locale)}</span>
                  </div>
                  {selected && (
                    <span className="mt-2 w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {t.reelflow.generate.selectedAsset}
                    </span>
                  )}
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
  return new Intl.DateTimeFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function formatDraftNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(value)
}

function templatePreviewGradient(index: number) {
  const palettes = [
    'from-[#30151a] via-[#d94d3f] to-[#f6b65d]',
    'from-[#111827] via-[#506a85] to-[#97c3ed]',
    'from-[#171717] via-[#5b4bb7] to-[#f08aa6]',
    'from-[#1e1a12] via-[#bd7b20] to-[#f5d48a]',
  ]
  return palettes[index % palettes.length]
}
