import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertCircle, ArrowRight, Archive, ImageIcon, ImageUp, Loader2, Ratio, Sparkles, Wand2, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Button } from '@libs/react-shared/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@libs/react-shared/ui/select'
import { Textarea } from '@libs/react-shared/ui/textarea'
import { cn } from '@libs/ui/utils/cn'
import { PageHeader } from '@/components/reelflow-ui'

export const Route = createFileRoute('/$lang/(root)/reelflow/image')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.imageTool),
  component: ReelflowImageToolPage,
})

const MODEL_NAME = 'GPT-Image-2'
const MAX_REFERENCE_BYTES = 8 * 1024 * 1024

// Aspect ratios offered in the UI. gpt-image-2 only supports 3 native sizes, so each
// ratio maps to the nearest native size (no cropping, per product decision).
const RATIOS: { id: string; size: string; w: number; h: number }[] = [
  { id: '1:1', size: '1024x1024', w: 1, h: 1 },
  { id: '3:4', size: '1024x1536', w: 3, h: 4 },
  { id: '2:3', size: '1024x1536', w: 2, h: 3 },
  { id: '9:16', size: '1024x1536', w: 9, h: 16 },
  { id: '4:3', size: '1536x1024', w: 4, h: 3 },
  { id: '3:2', size: '1536x1024', w: 3, h: 2 },
  { id: '16:9', size: '1536x1024', w: 16, h: 9 },
]
const QUALITY_OPTIONS = ['high', 'medium', 'low'] as const
// After this many seconds, surface a "model is busy, hang tight" hint so a slow
// provider call doesn't look frozen.
const SLOW_HINT_SECONDS = 20

type ImageToolResult = {
  asset: { id: string }
  image: { imageUrl: string }
  credits: { consumed: number; balanceAfter: number }
}

type WorkAsset = { id: string; url: string | null; metadata: { prompt?: string } | null }
type PromptTemplate = { title: string; prompt: string; ratio: string }

function ReelflowImageToolPage() {
  const { t, locale } = useTranslation()
  const navigate = useNavigate()
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)
  const [prompt, setPrompt] = useState('')
  const [ratioId, setRatioId] = useState('3:4')
  const [quality, setQuality] = useState<(typeof QUALITY_OPTIONS)[number]>('high')
  const [reference, setReference] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<ImageToolResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'works' | 'templates'>('templates')
  const [works, setWorks] = useState<WorkAsset[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const qualityLabels = t.reelflow.imageTool.qualities as Record<string, string>
  const templates = t.reelflow.imageTool.promptTemplates as PromptTemplate[]
  const activeRatio = RATIOS.find((r) => r.id === ratioId) ?? RATIOS[0]

  const loadWorks = async () => {
    try {
      const response = await fetch('/api/reelflow/assets?source=personal&assetType=image&limit=24')
      const data = await response.json()
      if (response.ok) setWorks(((data.assets || []) as WorkAsset[]).filter((a) => a.url))
    } catch {
      // best-effort
    }
  }

  useEffect(() => {
    void loadWorks()
  }, [])

  const pickReference = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > MAX_REFERENCE_BYTES) {
      toast.error(t.reelflow.imageTool.errors.failed, { description: 'Max 8MB' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => setReference(typeof reader.result === 'string' ? reader.result : null)
    reader.readAsDataURL(file)
  }

  const applyTemplate = (tpl: { prompt: string; ratio?: string }) => {
    setPrompt(tpl.prompt)
    if (tpl.ratio && RATIOS.some((r) => r.id === tpl.ratio)) setRatioId(tpl.ratio)
    composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    promptRef.current?.focus()
  }

  const generate = async () => {
    if (!prompt.trim()) {
      promptRef.current?.focus()
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    setGenerating(true)
    setError(null)
    setElapsed(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    try {
      const response = await fetch('/api/reelflow/tools/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), size: activeRatio.size, quality, referenceImage: reference || undefined }),
        signal: controller.signal,
      })
      const payload = await response.json()
      if (!response.ok) {
        if (response.status === 402) {
          toast.error(t.reelflow.imageTool.errors.insufficientCredits, {
            action: { label: t.reelflow.credits.buyNow, onClick: () => void navigate({ to: '/$lang/reelflow/credits', params: { lang: locale } }) },
          })
          return
        }
        throw new Error(payload?.message || t.reelflow.imageTool.errors.failed)
      }
      setResult(payload.data)
      toast.success(t.reelflow.imageTool.success)
      void loadWorks()
      // A charge just settled — let the shell header refresh its balance.
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('reelflow:credits-changed'))
    } catch (err) {
      // User-initiated cancel: not an error, just stop quietly.
      if (err instanceof DOMException && err.name === 'AbortError') return
      const message = err instanceof Error ? err.message : t.reelflow.imageTool.errors.failed
      setError(message)
      toast.error(t.reelflow.imageTool.errors.failed, { description: message })
    } finally {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      abortRef.current = null
      setGenerating(false)
    }
  }

  const cancelGenerate = () => abortRef.current?.abort()

  // Stop the timer / in-flight request if the user leaves the page.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      abortRef.current?.abort()
    }
  }, [])

  return (
    <main className="min-h-screen" data-testid="reelflow-image-tool-page">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title={t.reelflow.imageTool.title}
          actions={
            <Button variant="outline" asChild>
              <Link to="/$lang/reelflow/assets" params={{ lang: locale }} search={{ source: 'personal', assetType: 'image', query: '' }}>
                <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
                {t.reelflow.imageTool.openAssets}
              </Link>
            </Button>
          }
        />

        {/* Composer */}
        <div ref={composerRef} className="reelflow-panel mt-6 rounded-2xl p-4">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickReference(e.target.files?.[0])} data-testid="reelflow-image-reference-input" />
          {reference ? (
            <div className="relative inline-block">
              <img src={reference} alt={t.reelflow.imageTool.referenceImage} className="h-20 w-20 rounded-xl object-cover shadow-[inset_0_0_0_1px_var(--reelflow-hairline)]" />
              <button type="button" onClick={() => setReference(null)} aria-label={t.reelflow.imageTool.removeReference} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background shadow">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/70 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground" title={t.reelflow.imageTool.referenceImageHint} data-testid="reelflow-image-reference-btn">
              <ImageUp className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs">{t.reelflow.imageTool.referenceImage}</span>
            </button>
          )}

          <Textarea
            ref={promptRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t.reelflow.imageTool.promptPlaceholder}
            data-testid="reelflow-image-prompt"
            className="mt-3 min-h-24 resize-none border-0 bg-transparent px-1 text-base leading-7 shadow-none focus-visible:ring-0"
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void generate() }}
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={ratioId} onValueChange={setRatioId}>
                <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full px-3 text-xs" aria-label={t.reelflow.imageTool.size}>
                  <RatioIcon w={activeRatio.w} h={activeRatio.h} />
                  <span>{activeRatio.id}</span>
                </SelectTrigger>
                <SelectContent>
                  {RATIOS.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <span className="flex items-center gap-2"><RatioIcon w={r.w} h={r.h} />{r.id}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={quality} onValueChange={(v) => setQuality(v as (typeof QUALITY_OPTIONS)[number])}>
                <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full px-3 text-xs" aria-label={t.reelflow.imageTool.quality}>
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUALITY_OPTIONS.map((item) => <SelectItem key={item} value={item}>{qualityLabels[item]}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="hidden h-8 items-center gap-1.5 rounded-full border border-border/60 px-3 text-xs text-muted-foreground sm:inline-flex">
                <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />{MODEL_NAME}
              </span>
            </div>
            <Button type="button" size="icon" className="h-10 w-10 shrink-0 rounded-xl" onClick={generate} disabled={generating || !prompt.trim()} aria-label={t.reelflow.imageTool.generate} data-testid="reelflow-image-generate">
              {generating ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-5 w-5" aria-hidden="true" />}
            </Button>
          </div>
        </div>

        {/* Result */}
        {(generating || result || error) && (
          <div className="reelflow-panel mt-5 overflow-hidden p-4" aria-live="polite">
            <div className="flex min-h-[360px] items-center justify-center rounded-xl bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--reelflow-coral)_8%,transparent),transparent_42%),color-mix(in_oklch,var(--background)_82%,white)] p-4 shadow-[inset_0_0_0_1px_var(--reelflow-hairline)]">
              {generating ? (
                <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
                  <Loader2 className="h-9 w-9 animate-spin" aria-hidden="true" />
                  <p>{t.reelflow.imageTool.generating} · {elapsed}s</p>
                  {elapsed >= SLOW_HINT_SECONDS && (
                    <p className="max-w-xs text-xs text-muted-foreground/80">{t.reelflow.imageTool.generatingSlow}</p>
                  )}
                  <Button type="button" variant="outline" size="sm" className="mt-1 rounded-full" onClick={cancelGenerate} data-testid="reelflow-image-cancel">
                    <X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />{t.reelflow.imageTool.cancel}
                  </Button>
                </div>
              ) : result ? (
                <img src={result.image.imageUrl} alt={prompt} className="max-h-[64vh] max-w-full rounded-md object-contain" data-testid="reelflow-image-result" />
              ) : (
                <Alert variant="destructive" className="max-w-md" data-testid="reelflow-image-error"><AlertCircle className="h-4 w-4" aria-hidden="true" /><AlertTitle>{t.reelflow.imageTool.errors.failed}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
              )}
            </div>
            {result && (
              <div className="reelflow-muted-tile mt-4 flex items-center justify-between gap-3 p-4">
                <div className="text-sm text-muted-foreground">{t.reelflow.imageTool.creditConsumed}: <span className="font-medium text-foreground">{result.credits.consumed}</span> · {t.reelflow.imageTool.balanceAfter}: <span className="font-medium text-foreground">{result.credits.balanceAfter}</span></div>
              </div>
            )}
          </div>
        )}

        {/* Tabs: my works / prompt templates */}
        <div className="mt-8">
          <div className="flex items-center gap-5 border-b border-border/45">
            <TabButton active={tab === 'works'} onClick={() => setTab('works')}>{t.reelflow.imageTool.tabs.myWorks}</TabButton>
            <TabButton active={tab === 'templates'} onClick={() => setTab('templates')}>{t.reelflow.imageTool.tabs.promptTemplates}</TabButton>
          </div>

          {tab === 'works' ? (
            works.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t.reelflow.imageTool.myWorksEmpty}</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {works.map((work) => (
                  <div key={work.id} className="group relative overflow-hidden rounded-xl shadow-[inset_0_0_0_1px_var(--reelflow-hairline)]">
                    <img src={work.url ?? ''} alt="" className="aspect-square w-full object-cover" />
                    {work.metadata?.prompt && (
                      <button type="button" onClick={() => applyTemplate({ prompt: work.metadata!.prompt! })} className="absolute inset-0 flex items-center justify-center bg-foreground/55 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground"><Wand2 className="h-3.5 w-3.5" aria-hidden="true" />{t.reelflow.imageTool.makeSame}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <>
              <p className="mt-3 text-xs text-muted-foreground">{t.reelflow.imageTool.promptTemplatesHint}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {templates.map((tpl) => (
                  <div key={tpl.title} className="reelflow-soft-tile flex flex-col p-4" data-testid={`reelflow-prompt-template-${tpl.ratio}`}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium">{tpl.title}</h3>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                        <Ratio className="h-3 w-3" aria-hidden="true" />{tpl.ratio}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-muted-foreground">{tpl.prompt}</p>
                    <Button variant="outline" size="sm" className="mt-3 w-fit" onClick={() => applyTemplate(tpl)}>
                      <Wand2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />{t.reelflow.imageTool.makeSame}
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

function RatioIcon({ w, h }: { w: number; h: number }) {
  const max = 13
  const scale = max / Math.max(w, h)
  return (
    <span className="inline-flex h-3.5 w-3.5 items-center justify-center" aria-hidden="true">
      <span className="rounded-[2px] border border-current" style={{ width: Math.max(4, w * scale), height: Math.max(4, h * scale) }} />
    </span>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn('relative -mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors', active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
      {children}
    </button>
  )
}
