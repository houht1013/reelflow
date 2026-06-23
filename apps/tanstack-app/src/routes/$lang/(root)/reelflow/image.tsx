import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertCircle, Archive, CheckCircle2, ImageIcon, Loader2, Sparkles } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Button } from '@libs/react-shared/ui/button'
import { Label } from '@libs/react-shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@libs/react-shared/ui/select'
import { Textarea } from '@libs/react-shared/ui/textarea'
import { PageHeader, TonePill } from '@/components/reelflow-ui'

export const Route = createFileRoute('/$lang/(root)/reelflow/image')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.imageTool),
  component: ReelflowImageToolPage,
})

const SIZE_OPTIONS = [
  { value: '1024x1024', labelKey: 'square' as const },
  { value: '1024x1536', labelKey: 'portrait' as const },
  { value: '1536x1024', labelKey: 'landscape' as const },
]
const QUALITY_OPTIONS = ['low', 'medium', 'high'] as const

type ImageToolResult = {
  asset: { id: string; url: string | null; metadata: Record<string, unknown> | null; createdAt: string }
  image: { imageUrl: string; width?: number; height?: number; provider: string; model: string }
  credits: { consumed: number; balanceAfter: number }
}

function ReelflowImageToolPage() {
  const { t, locale } = useTranslation()
  const navigate = useNavigate()
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('1024x1024')
  const [quality, setQuality] = useState<(typeof QUALITY_OPTIONS)[number]>('high')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<ImageToolResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [promptError, setPromptError] = useState<string | null>(null)

  const sizeLabels = t.reelflow.imageTool.sizes as Record<string, string>
  const qualityLabels = t.reelflow.imageTool.qualities as Record<string, string>

  const generate = async () => {
    if (!prompt.trim()) {
      setPromptError(t.reelflow.imageTool.errors.noPrompt)
      promptRef.current?.focus()
      return
    }

    setGenerating(true)
    setError(null)
    setPromptError(null)
    try {
      const response = await fetch('/api/reelflow/tools/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), size, quality }),
      })
      const payload = await response.json()
      if (!response.ok) {
        if (response.status === 402) {
          toast.error(t.reelflow.imageTool.errors.insufficientCredits, {
            action: {
              label: t.reelflow.credits.buyNow,
              onClick: () => {
                void navigate({ to: '/$lang/reelflow/credits', params: { lang: locale } })
              },
            },
          })
          return
        }
        throw new Error(payload?.message || t.reelflow.imageTool.errors.failed)
      }

      setResult(payload.data)
      toast.success(t.reelflow.imageTool.success)
    } catch (err) {
      const message = err instanceof Error ? err.message : t.reelflow.imageTool.errors.failed
      setError(message)
      toast.error(t.reelflow.imageTool.errors.failed, { description: message })
    } finally {
      setGenerating(false)
    }
  }

  const resetImageForm = () => {
    setPrompt('')
    setResult(null)
    setError(null)
    setPromptError(null)
    promptRef.current?.focus()
  }

  return (
    <main className="min-h-screen" data-testid="reelflow-image-tool-page">
      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <PageHeader
            eyebrow={t.reelflow.imageTool.badge}
            title={t.reelflow.imageTool.title}
            description={t.reelflow.imageTool.description}
            actions={
              <Button variant="outline" asChild>
                <Link to="/$lang/reelflow/assets" params={{ lang: locale }} search={{ source: 'all', assetType: 'all', query: '' }}>
                  <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t.reelflow.imageTool.openAssets}
                </Link>
              </Button>
            }
          />
        </div>
      </section>

      <div className="container mx-auto grid gap-6 px-4 pb-8 sm:px-6 lg:grid-cols-[minmax(0,500px)_minmax(0,1fr)] lg:px-8">
        <section className="reelflow-panel space-y-5 p-5">
          <div className="flex items-center gap-3 border-b border-border/45 pb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_0_0_0_1px_var(--reelflow-hairline)]">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="reelflow-display text-lg">{t.reelflow.imageTool.prompt}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.reelflow.imageTool.promptHint}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="image-prompt" className="sr-only">{t.reelflow.imageTool.prompt}</Label>
            <Textarea
              ref={promptRef}
              id="image-prompt"
              name="image-prompt"
              autoComplete="off"
              data-testid="reelflow-image-prompt"
              aria-invalid={promptError ? 'true' : undefined}
              aria-describedby={promptError ? 'image-prompt-error' : undefined}
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value)
                if (promptError) setPromptError(null)
              }}
              placeholder={t.reelflow.imageTool.promptPlaceholder}
              className="min-h-40 resize-y bg-background/65 text-base leading-7 shadow-[inset_0_0_0_1px_var(--reelflow-hairline)]"
            />
            {promptError && (
              <p id="image-prompt-error" className="text-sm text-destructive" role="alert">
                {promptError}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="image-size">{t.reelflow.imageTool.size}</Label>
              <Select name="image-size" value={size} onValueChange={setSize}>
                <SelectTrigger id="image-size" aria-label={t.reelflow.imageTool.size}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {sizeLabels[item.labelKey]} · {item.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-quality">{t.reelflow.imageTool.quality}</Label>
              <Select name="image-quality" value={quality} onValueChange={(value) => setQuality(value as (typeof QUALITY_OPTIONS)[number])}>
                <SelectTrigger id="image-quality" aria-label={t.reelflow.imageTool.quality}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUALITY_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {qualityLabels[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="button" size="lg" className="w-full" onClick={generate} disabled={generating} data-testid="reelflow-image-generate">
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />}
            {generating ? t.reelflow.imageTool.generating : t.reelflow.imageTool.generate}
          </Button>
        </section>

        <section className="reelflow-panel min-h-[520px] overflow-hidden p-4" data-testid="reelflow-image-result-panel" aria-live="polite">
          <div className="flex items-center justify-between gap-3 px-1 pb-4">
            <div>
              <h2 className="reelflow-display text-lg">{t.reelflow.imageTool.result}</h2>
              <p className="text-sm text-muted-foreground">{t.reelflow.imageTool.resultHint}</p>
            </div>
            {result && <TonePill tone="success" icon={CheckCircle2}>{t.reelflow.imageTool.saved}</TonePill>}
          </div>

          <div className="flex min-h-[420px] items-center justify-center rounded-xl bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--reelflow-coral)_8%,transparent),transparent_42%),color-mix(in_oklch,var(--background)_82%,white)] p-4 shadow-[inset_0_0_0_1px_var(--reelflow-hairline)]">
            {generating ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-9 w-9 animate-spin" aria-hidden="true" />
                <p>{t.reelflow.imageTool.generatingHint}</p>
              </div>
            ) : result ? (
              <img
                src={result.image.imageUrl}
                alt={prompt || t.reelflow.imageTool.result}
                width={result.image.width || 1024}
                height={result.image.height || 1024}
                className="max-h-[64vh] max-w-full rounded-md object-contain"
                data-testid="reelflow-image-result"
              />
            ) : error ? (
              <Alert variant="destructive" className="max-w-md" data-testid="reelflow-image-error">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>{t.reelflow.imageTool.errors.failed}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <div className="max-w-sm text-center text-muted-foreground">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-background/70 shadow-[inset_0_0_0_1px_var(--reelflow-hairline)]">
                  <ImageIcon className="h-8 w-8 opacity-70" aria-hidden="true" />
                </span>
                <p className="mt-4 text-sm leading-6">{t.reelflow.imageTool.emptyResult}</p>
              </div>
            )}
          </div>

          {result && (
            <div className="reelflow-muted-tile mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {t.reelflow.imageTool.creditConsumed}: <span className="font-medium text-foreground">{result.credits.consumed}</span> · {t.reelflow.imageTool.balanceAfter}: <span className="font-medium text-foreground">{result.credits.balanceAfter}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <Link to="/$lang/reelflow/assets" params={{ lang: locale }} search={{ source: 'personal', assetType: 'all', query: '' }} data-testid="reelflow-image-view-assets">
                    <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t.reelflow.imageTool.viewInAssets}
                  </Link>
                </Button>
                <Button type="button" onClick={resetImageForm}>
                  <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t.reelflow.imageTool.newImage}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
