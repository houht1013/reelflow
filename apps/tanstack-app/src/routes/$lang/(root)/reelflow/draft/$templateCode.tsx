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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@libs/react-shared/ui/dialog'
import { AlertCircle, ArrowRight, Check, Coins, ImageIcon, Loader2, PackageOpen, Package, Repeat, Search, Wand2, X } from 'lucide-react'
import { categoryVisual } from '@/components/reelflow-ui'
import { ossThumb } from '@/lib/image-url'

export const Route = createFileRoute('/$lang/(root)/reelflow/draft/$templateCode')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.generate),
  component: ReelflowComposerPage,
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

type TemplateBadge = 'new' | 'recommended' | 'hot'

type ReelflowTemplate = {
  id: string
  code: string
  name: string
  description: string | null
  category: string | null
  inputSchema: { fields?: TemplateInputField[] } | null
  metadata?: { badges?: TemplateBadge[]; coverImageUrl?: string | null } | null
  estimatedCredits: number
  estimatedCreditsWithMp4: number
}

type ReelflowPreflightIssue = { code: string; message?: string; target?: string }

type ReelflowAsset = {
  id: string
  assetType: string
  url: string | null
  mimeType: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

function ReelflowComposerPage() {
  const navigate = useNavigate()
  const { t, locale } = useTranslation()
  const { templateCode } = Route.useParams()
  const [template, setTemplate] = useState<ReelflowTemplate | null>(null)
  const [allTemplates, setAllTemplates] = useState<ReelflowTemplate[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [inputParams, setInputParams] = useState<Record<string, unknown>>({})
  const [assets, setAssets] = useState<ReelflowAsset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [assetError, setAssetError] = useState<string | null>(null)
  const [renderMp4Requested, setRenderMp4Requested] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [preflightIssues, setPreflightIssues] = useState<ReelflowPreflightIssue[]>([])
  const [fieldErrorKey, setFieldErrorKey] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function loadTemplate() {
      setLoading(true)
      setNotFound(false)
      try {
        const response = await fetch('/api/reelflow/templates')
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || t.reelflow.generate.loadError)
        if (!alive) return
        const list = (data.templates || []) as ReelflowTemplate[]
        setAllTemplates(list)
        const found = list.find((item) => item.code === templateCode)
        if (!found) {
          setNotFound(true)
          return
        }
        setTemplate(found)
      } catch {
        if (alive) setNotFound(true)
      } finally {
        if (alive) setLoading(false)
      }
    }
    void loadTemplate()
    return () => {
      alive = false
    }
  }, [templateCode, t.reelflow.generate.loadError])

  const fields = template?.inputSchema?.fields || []
  const hasAssetFields = fields.some((field) => field.type === 'asset')
  const estimatedCredits = template ? (renderMp4Requested ? template.estimatedCreditsWithMp4 : template.estimatedCredits) : 0

  useEffect(() => {
    if (!template) return
    const defaults: Record<string, unknown> = {}
    for (const field of template.inputSchema?.fields || []) {
      if (field.defaultValue !== undefined) defaults[field.key] = field.defaultValue
      else if (field.type === 'switch') defaults[field.key] = false
      else if (field.type === 'number' && field.min !== undefined) defaults[field.key] = field.min
      else defaults[field.key] = ''
    }
    setInputParams(defaults)
  }, [template?.code])

  useEffect(() => {
    if (!hasAssetFields) {
      setAssets([])
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
        if (alive) setAssets((data.assets || []) as ReelflowAsset[])
      } catch (err) {
        if (alive) setAssetError(err instanceof Error ? err.message : t.reelflow.generate.assetLoadError)
      } finally {
        if (alive) setAssetsLoading(false)
      }
    }
    void loadAssets()
    return () => {
      alive = false
    }
  }, [hasAssetFields, template?.code, t.reelflow.generate.assetLoadError])

  const setFieldValue = (key: string, value: unknown) => {
    setRunError(null)
    setPreflightIssues([])
    if (fieldErrorKey === key) setFieldErrorKey(null)
    setInputParams((current) => ({ ...current, [key]: value }))
  }

  const fieldLabel = (field: TemplateInputField) => (t.reelflow.generate.fields as Record<string, string>)[field.key] || field.label
  const fieldRequiredMessage = (field: TemplateInputField) => t.reelflow.generate.requiredField.replace('{field}', fieldLabel(field))

  const fillExample = () => {
    const next: Record<string, unknown> = { ...inputParams }
    for (const field of fields) {
      if (field.type === 'asset' || field.type === 'switch') continue
      if (next[field.key]) continue
      if (field.placeholder) next[field.key] = field.placeholder
      else if (field.type === 'select' && field.options?.length) next[field.key] = field.options[0].value
    }
    setRunError(null)
    setFieldErrorKey(null)
    setInputParams(next)
  }

  const validate = () => {
    for (const field of fields) {
      if (!field.required) continue
      const value = inputParams[field.key]
      if (value === undefined || value === null || value === '') {
        setFieldErrorKey(field.key)
        window.setTimeout(() => {
          const fieldNode = document.getElementById(`reelflow-${field.key}`)
          const fallbackNode = document.querySelector<HTMLElement>(`[data-field-key="${field.key}"] button`)
          ;(fieldNode || fallbackNode)?.focus()
        }, 0)
        toast.error(fieldRequiredMessage(field))
        return false
      }
    }
    setFieldErrorKey(null)
    return true
  }

  const preflightErrorText = (issue: ReelflowPreflightIssue) => {
    const messages = t.reelflow.generate.preflightErrors as Record<string, string>
    return messages[issue.code] || issue.message || t.reelflow.generate.submitError
  }

  const handleSubmit = async () => {
    if (!template || !validate()) return
    setSubmitting(true)
    setRunError(null)
    setPreflightIssues([])
    try {
      const response = await fetch('/api/reelflow/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateCode: template.code, inputParams, renderMp4Requested }),
      })
      const data = await response.json()
      if (!response.ok) {
        const preflightErrors = Array.isArray(data?.preflight?.errors) ? (data.preflight.errors as ReelflowPreflightIssue[]) : []
        const description = preflightErrors.length > 0
          ? preflightErrors.map((item) => preflightErrorText(item)).join('\n')
          : data?.error || t.reelflow.generate.submitError
        setPreflightIssues(preflightErrors)
        setRunError(description)
        toast.error(t.reelflow.generate.submitError, { description })
        return
      }
      toast.success(t.reelflow.generate.submitSuccess)
      await navigate({ to: '/$lang/reelflow/jobs/$id', params: { lang: locale, id: data.jobId } })
    } catch (err) {
      const message = err instanceof Error ? err.message : t.reelflow.generate.submitError
      setRunError(message)
      toast.error(t.reelflow.generate.submitError, { description: message })
    } finally {
      setSubmitting(false)
    }
  }

  const visual = categoryVisual(template?.category)
  const CtxIcon = visual.icon

  const pickerTemplates = allTemplates.filter((tpl) => {
    const q = pickerQuery.trim().toLowerCase()
    if (!q) return true
    return [tpl.name, tpl.category ?? ''].join(' ').toLowerCase().includes(q)
  })

  const chooseTemplate = (code: string) => {
    setPickerOpen(false)
    setPickerQuery('')
    if (code === templateCode) return
    void navigate({ to: '/$lang/reelflow/draft/$templateCode', params: { lang: locale, templateCode: code } })
  }

  return (
    <main className="min-h-screen" data-testid="reelflow-composer-page">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="reelflow-reveal" data-delay="1">
          <p className="reelflow-eyebrow">{t.reelflow.home.draftAnchorEyebrow}</p>
          <h1 className="reelflow-display mt-3 text-[1.8rem] leading-tight">{t.reelflow.home.draftAnchorTitle}</h1>
        </div>

        {loading ? (
          <div className="mt-6 space-y-4">
            <div className="reelflow-skeleton h-20" />
            <div className="reelflow-skeleton h-40" />
          </div>
        ) : notFound || !template ? (
          <div className="reelflow-panel mt-6 flex flex-col items-center px-6 py-14 text-center">
            <AlertCircle className="h-9 w-9 text-muted-foreground" aria-hidden="true" />
            <h2 className="reelflow-display mt-4 text-lg">{t.reelflow.generate.templateNotFound}</h2>
            <Button className="mt-5" asChild>
              <Link to="/$lang/reelflow/templates" params={{ lang: locale }}>{t.reelflow.generate.backToTemplates}</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Template context bar */}
            <div className="reelflow-reveal mt-6 flex items-center gap-3 rounded-2xl p-3 shadow-[inset_0_0_0_1px_var(--reelflow-hairline)]" data-delay="2">
              <span
                className="flex shrink-0 items-center justify-center rounded-xl"
                style={{ height: '3.25rem', width: '3.25rem', background: `color-mix(in oklch, ${visual.color} 12%, transparent)`, color: visual.color }}
              >
                <CtxIcon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{template.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{template.category}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)} data-testid="reelflow-switch-template">
                <Repeat className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {t.reelflow.generate.switchTemplate}
              </Button>
            </div>

            {/* Form */}
            <div className="reelflow-reveal mt-8" data-delay="3">
              <div className="flex items-center justify-between">
                <h2 className="reelflow-display text-lg">{t.reelflow.generate.inputSection}</h2>
                {fields.some((f) => f.type !== 'asset' && f.type !== 'switch') && (
                  <button type="button" onClick={fillExample} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-80">
                    <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t.reelflow.generate.fillExample}
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                {fields.map((field) => {
                  const hasFieldError = fieldErrorKey === field.key
                  const errorId = `reelflow-${field.key}-error`
                  return (
                    <div key={field.key} data-field-key={field.key} className={field.type === 'textarea' || field.type === 'asset' ? 'space-y-2 sm:col-span-2' : 'space-y-2'}>
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor={`reelflow-${field.key}`}>{fieldLabel(field)}</Label>
                        {field.required && <span className="text-destructive" aria-hidden="true">*</span>}
                      </div>
                      {field.type === 'asset' ? (
                        <AssetPicker field={field} assets={assets} loading={assetsLoading} error={assetError} value={String(inputParams[field.key] || '')} locale={locale} t={t} invalid={hasFieldError} onValueChange={(value) => setFieldValue(field.key, value)} />
                      ) : field.type === 'textarea' ? (
                        <Textarea id={`reelflow-${field.key}`} name={field.key} autoComplete="off" value={String(inputParams[field.key] || '')} onChange={(event) => setFieldValue(field.key, event.target.value)} placeholder={field.placeholder || t.reelflow.generate.textPlaceholder} aria-invalid={hasFieldError} className="min-h-24 resize-y" />
                      ) : field.type === 'select' ? (
                        <Select name={field.key} value={String(inputParams[field.key] || '')} onValueChange={(value) => setFieldValue(field.key, value)}>
                          <SelectTrigger id={`reelflow-${field.key}`} aria-label={fieldLabel(field)} aria-invalid={hasFieldError} className="w-full">
                            <SelectValue placeholder={t.reelflow.generate.selectPlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {(field.options || []).map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : field.type === 'switch' ? (
                        <div className="reelflow-muted-tile flex h-10 items-center justify-between px-3">
                          <span className="text-sm text-muted-foreground">{inputParams[field.key] ? t.reelflow.generate.booleanOn : t.reelflow.generate.booleanOff}</span>
                          <Switch id={`reelflow-${field.key}`} name={field.key} aria-label={fieldLabel(field)} checked={Boolean(inputParams[field.key])} onCheckedChange={(value) => setFieldValue(field.key, value)} />
                        </div>
                      ) : (
                        <Input id={`reelflow-${field.key}`} name={field.key} autoComplete="off" inputMode={field.type === 'number' ? 'numeric' : undefined} type={field.type === 'number' ? 'number' : 'text'} min={field.min} max={field.max} value={String(inputParams[field.key] ?? '')} onChange={(event) => setFieldValue(field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)} placeholder={field.placeholder || t.reelflow.generate.textPlaceholder} aria-invalid={hasFieldError} />
                      )}
                      {hasFieldError && <p id={errorId} className="text-xs font-medium text-destructive" aria-live="polite">{fieldRequiredMessage(field)}</p>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Delivery */}
            <div className="reelflow-reveal mt-6 reelflow-muted-tile flex items-center gap-3 p-4" data-delay="4">
              <Package className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.reelflow.jobs.draftRequested}</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t.reelflow.generate.renderMp4Hint}</p>
              </div>
              <Switch id="render-mp4" name="renderMp4Requested" aria-label={t.reelflow.generate.renderMp4} data-testid="reelflow-render-mp4" checked={renderMp4Requested} onCheckedChange={setRenderMp4Requested} />
            </div>

            {runError && (
              <Alert variant="destructive" className="mt-5" data-testid="reelflow-preflight-alert" aria-live="polite">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>{preflightIssues.length > 0 ? t.reelflow.generate.preflightTitle : t.reelflow.generate.runBlockedTitle}</AlertTitle>
                <AlertDescription>
                  <div className="space-y-3">
                    <p>{preflightIssues.length > 0 ? t.reelflow.generate.preflightBody : runError}</p>
                    {preflightIssues.length > 0 && (
                      <ul className="list-disc space-y-1 pl-5">
                        {preflightIssues.map((issue, index) => <li key={`${issue.code}-${issue.target || index}`}>{preflightErrorText(issue)}</li>)}
                      </ul>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild><Link to="/$lang/reelflow/credits" params={{ lang: locale }}>{t.reelflow.generate.checkCredits}</Link></Button>
                      <Button variant="outline" size="sm" asChild><Link to="/$lang/reelflow/jobs" params={{ lang: locale }}>{t.reelflow.generate.checkTasks}</Link></Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Estimate + generate */}
            <div className="reelflow-reveal mt-6 flex items-center justify-between gap-4 border-t border-[var(--reelflow-hairline)] pt-6" data-delay="4">
              <div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Coins className="h-3.5 w-3.5" style={{ color: 'var(--reelflow-amber)' }} aria-hidden="true" />
                  {t.reelflow.generate.estimate}
                </p>
                <p className="reelflow-display reelflow-num mt-1 text-2xl">
                  {estimatedCredits}
                  <span className="ml-1.5 font-sans text-sm font-normal text-muted-foreground">{t.reelflow.common.credits}</span>
                </p>
              </div>
              <Button type="button" data-testid="reelflow-submit-job" size="lg" disabled={submitting} onClick={handleSubmit}>
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />{t.reelflow.generate.submitting}</>
                ) : (
                  <>{t.reelflow.generate.submit}<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl" data-testid="reelflow-template-picker">
          <DialogHeader>
            <DialogTitle>{t.reelflow.generate.switchTemplate}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={pickerQuery} onChange={(event) => setPickerQuery(event.target.value)} placeholder={t.reelflow.templates.searchPlaceholder} className="pl-9" />
          </div>
          <div className="mt-1 grid max-h-[60vh] gap-2.5 overflow-auto py-1 sm:grid-cols-2">
            {pickerTemplates.map((tpl) => {
              const tplVisual = categoryVisual(tpl.category)
              const TplIcon = tplVisual.icon
              const cover = tpl.metadata?.coverImageUrl
              const current = tpl.code === templateCode
              return (
                <button
                  key={tpl.code}
                  type="button"
                  data-testid={`reelflow-picker-option-${tpl.code}`}
                  onClick={() => chooseTemplate(tpl.code)}
                  className={`reelflow-soft-tile group flex items-center gap-3 p-2.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${current ? 'ring-1 ring-primary/40' : ''}`}
                >
                  <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg" style={cover ? undefined : { background: `color-mix(in oklch, ${tplVisual.color} 12%, transparent)`, color: tplVisual.color }}>
                    {cover ? <img src={ossThumb(cover, 120)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <TplIcon className="h-6 w-6" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{tpl.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{tpl.category}</span>
                  </span>
                  {current && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
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
  onValueChange,
}: {
  field: TemplateInputField
  assets: ReelflowAsset[]
  loading: boolean
  error: string | null
  value: string
  locale: string
  t: ReturnType<typeof useTranslation>['t']
  invalid?: boolean
  onValueChange: (value: string) => void
}) {
  const acceptedTypes = field.assetTypes?.length ? field.assetTypes : ['reference_image', 'image', 'logo', 'avatar']
  const compatibleAssets = assets.filter((assetItem) => {
    if (acceptedTypes.includes(assetItem.assetType)) return true
    return acceptedTypes.includes('image') && Boolean(assetItem.mimeType?.startsWith('image/'))
  })

  return (
    <div className={`reelflow-muted-tile p-3 ${invalid ? 'ring-1 ring-destructive/55' : ''}`} data-testid={`reelflow-asset-picker-${field.key}`} aria-invalid={invalid}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{field.placeholder || t.reelflow.generate.assetHint}</p>
        <div className="flex shrink-0 gap-2">
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onValueChange('')}>
              <X className="mr-1 h-4 w-4" aria-hidden="true" />{t.reelflow.generate.clearAsset}
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/$lang/reelflow/assets" params={{ lang: locale }} search={{ source: 'all', assetType: 'all', query: '' }}>
              <PackageOpen className="mr-1 h-4 w-4" aria-hidden="true" />{t.reelflow.generate.openAssets}
            </Link>
          </Button>
        </div>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      ) : loading ? (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">{[0, 1, 2].map((i) => <div key={i} className="reelflow-skeleton aspect-square" />)}</div>
      ) : compatibleAssets.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t.reelflow.generate.noAssetsHint}</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {compatibleAssets.slice(0, 6).map((assetItem) => {
            const selected = assetItem.id === value
            return (
              <button
                key={assetItem.id}
                type="button"
                data-testid={`reelflow-asset-picker-option-${assetItem.id}`}
                aria-pressed={selected}
                title={assetDisplayName(assetItem)}
                className={`relative aspect-square overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_var(--reelflow-hairline)] transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${selected ? 'ring-2 ring-primary' : ''}`}
                onClick={() => onValueChange(assetItem.id)}
              >
                {assetItem.url && assetItem.mimeType?.startsWith('image/') ? (
                  <img src={ossThumb(assetItem.url, 160)} alt={assetDisplayName(assetItem)} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground"><ImageIcon className="h-5 w-5" aria-hidden="true" /></span>
                )}
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
  const displayName = (metadata as { displayName?: unknown }).displayName
  const originalName = (metadata as { originalName?: unknown }).originalName
  if (typeof displayName === 'string' && displayName.trim()) return displayName
  if (typeof originalName === 'string' && originalName.trim()) return originalName
  return assetItem.url || assetItem.id.slice(0, 8)
}
