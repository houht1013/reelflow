import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { config } from '@config'
import { getImageSizesForProvider } from '@libs/ai'
import { AlertCircle, Archive, ChevronDown, ChevronUp, ImageIcon, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Badge } from '@libs/react-shared/ui/badge'
import { Button } from '@libs/react-shared/ui/button'
import { Input } from '@libs/react-shared/ui/input'
import { Label } from '@libs/react-shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@libs/react-shared/ui/select'
import { Textarea } from '@libs/react-shared/ui/textarea'

export const Route = createFileRoute('/$lang/(root)/reelflow/image')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.imageTool),
  component: ReelflowImageToolPage,
})

type ImageProviderName = 'qwen' | 'fal' | 'openai' | 'gemini'

type ImageToolResult = {
  asset: {
    id: string
    url: string | null
    metadata: Record<string, unknown> | null
    createdAt: string
  }
  image: {
    imageUrl: string
    width?: number
    height?: number
    provider: ImageProviderName
    model: string
    seed?: number
  }
  credits: {
    consumed: number
    balanceAfter: number
  }
}

function ReelflowImageToolPage() {
  const { t, locale } = useTranslation()
  const imageConfig = config.aiImage
  const [provider] = useState<ImageProviderName>(imageConfig.defaultProvider as ImageProviderName)
  const [model] = useState<string>(imageConfig.defaultModels[imageConfig.defaultProvider as keyof typeof imageConfig.defaultModels])
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [size, setSize] = useState('')
  const [seed, setSeed] = useState('random')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<ImageToolResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const availableSizes = getImageSizesForProvider(provider)

  useEffect(() => {
    if (availableSizes.length > 0) {
      const defaultSize = availableSizes.find((item: { value: string }) => item.value.includes('1:1') || item.value.includes('1328'))
      setSize(defaultSize?.value || availableSizes[0].value)
    }
  }, [provider])

  const generate = async () => {
    if (!prompt.trim()) {
      toast.error(t.reelflow.imageTool.errors.noPrompt)
      return
    }

    setGenerating(true)
    setError(null)
    try {
      const response = await fetch('/api/reelflow/tools/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          provider,
          model,
          negativePrompt: negativePrompt.trim() || undefined,
          size,
          aspectRatio: provider === 'fal' || provider === 'gemini' ? (size || '1:1') : undefined,
          seed: seed === 'random' ? undefined : Number(seed),
          promptExtend: provider === 'qwen' ? true : undefined,
          watermark: provider === 'qwen' ? false : undefined,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        if (response.status === 402) {
          toast.error(t.reelflow.imageTool.errors.insufficientCredits, {
            action: {
              label: t.reelflow.credits.buyNow,
              onClick: () => {
                window.location.href = `/${locale}/reelflow/credits`
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

  const randomizeSeed = () => setSeed(Math.floor(Math.random() * 2147483647).toString())

  return (
    <main className="min-h-screen bg-background" data-testid="reelflow-image-tool-page">
      <section className="border-b bg-muted/20">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ImageIcon className="h-5 w-5" />
              </div>
              <Badge variant="secondary">{t.reelflow.imageTool.badge}</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t.reelflow.imageTool.title}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{t.reelflow.imageTool.description}</p>
          </div>
          <Button variant="outline" asChild>
            <a href={`/${locale}/reelflow/assets`}>
              <Archive className="mr-2 h-4 w-4" />
              {t.reelflow.imageTool.openAssets}
            </a>
          </Button>
        </div>
      </section>

      <div className="container mx-auto grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:px-8">
        <section className="space-y-5 rounded-lg border bg-card p-5 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="image-prompt">{t.reelflow.imageTool.prompt}</Label>
            <Textarea
              id="image-prompt"
              data-testid="reelflow-image-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={t.reelflow.imageTool.promptPlaceholder}
              className="min-h-36 resize-y"
            />
            <p className="text-xs leading-5 text-muted-foreground">{t.reelflow.imageTool.promptHint}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.reelflow.imageTool.size}</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableSizes.map((item: { value: string; label: string }) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button variant="ghost" className="w-full justify-between" onClick={() => setShowAdvanced(!showAdvanced)}>
            <span>{t.reelflow.imageTool.advanced}</span>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showAdvanced && (
            <div className="space-y-4 rounded-lg border bg-background p-4">
              <div className="space-y-2">
                <Label>{t.reelflow.imageTool.negativePrompt}</Label>
                <Textarea
                  value={negativePrompt}
                  onChange={(event) => setNegativePrompt(event.target.value)}
                  placeholder={t.reelflow.imageTool.negativePromptPlaceholder}
                  className="min-h-20 resize-y"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.reelflow.imageTool.seed}</Label>
                <div className="flex gap-2">
                  <Input value={seed} onChange={(event) => setSeed(event.target.value)} />
                  <Button variant="outline" size="icon" aria-label={t.reelflow.imageTool.randomSeed} onClick={randomizeSeed}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Button size="lg" className="w-full" onClick={generate} disabled={generating || !prompt.trim()} data-testid="reelflow-image-generate">
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {generating ? t.reelflow.imageTool.generating : t.reelflow.imageTool.generate}
          </Button>
        </section>

        <section className="min-h-[520px] overflow-hidden rounded-lg border bg-card shadow-sm" data-testid="reelflow-image-result-panel">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="text-lg font-semibold">{t.reelflow.imageTool.result}</h2>
              <p className="text-sm text-muted-foreground">{t.reelflow.imageTool.resultHint}</p>
            </div>
            {result && <Badge variant="secondary">{t.reelflow.imageTool.saved}</Badge>}
          </div>

          <div className="flex min-h-[420px] items-center justify-center bg-muted/30 p-4">
            {generating ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-9 w-9 animate-spin" />
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
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t.reelflow.imageTool.errors.failed}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <div className="max-w-sm text-center text-muted-foreground">
                <ImageIcon className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-4 text-sm leading-6">{t.reelflow.imageTool.emptyResult}</p>
              </div>
            )}
          </div>

          {result && (
            <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {t.reelflow.imageTool.creditConsumed}: <span className="font-medium text-foreground">{result.credits.consumed}</span> · {t.reelflow.imageTool.balanceAfter}: <span className="font-medium text-foreground">{result.credits.balanceAfter}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <a href={`/${locale}/reelflow/assets?source=personal`} data-testid="reelflow-image-view-assets">
                    <Archive className="mr-2 h-4 w-4" />
                    {t.reelflow.imageTool.viewInAssets}
                  </a>
                </Button>
                <Button onClick={() => setPrompt('')}>
                  <Sparkles className="mr-2 h-4 w-4" />
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
