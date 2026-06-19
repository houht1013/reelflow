import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertCircle, Archive, AudioLines, Loader2, Mic2, PlayCircle, SlidersHorizontal } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Badge } from '@libs/react-shared/ui/badge'
import { Button } from '@libs/react-shared/ui/button'
import { Label } from '@libs/react-shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@libs/react-shared/ui/select'
import { Slider } from '@libs/react-shared/ui/slider'
import { Textarea } from '@libs/react-shared/ui/textarea'

export const Route = createFileRoute('/$lang/(root)/reelflow/voice')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.voiceTool),
  component: ReelflowVoiceToolPage,
})

type VoiceResult = {
  asset: {
    id: string
    url: string | null
    metadata: Record<string, unknown> | null
    createdAt: string
  }
  audio: {
    audioUrl: string
    provider: string
    model: string
    voice: string
    durationMs?: number
  }
  credits: {
    consumed: number
    balanceAfter: number
  }
}

const voiceOptions = ['alloy', 'verse', 'aria', 'sage', 'nova']

function ReelflowVoiceToolPage() {
  const { t, locale } = useTranslation()
  const [text, setText] = useState('')
  const [voice, setVoice] = useState('alloy')
  const [speed, setSpeed] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<VoiceResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const charCount = text.trim().length
  const estimatedCredits = useMemo(() => Math.max(1, Math.ceil(charCount * 0.002 * 100) / 100), [charCount])

  const generate = async () => {
    const currentText = text.trim() || (typeof document !== 'undefined'
      ? (document.getElementById('voice-text') as HTMLTextAreaElement | null)?.value.trim() || ''
      : '')

    if (!currentText) {
      toast.error(t.reelflow.voiceTool.errors.noText)
      return
    }
    if (currentText.length > 2000) {
      toast.error(t.reelflow.voiceTool.errors.tooLong)
      return
    }

    setGenerating(true)
    setError(null)
    try {
      const response = await fetch('/api/reelflow/tools/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentText,
          voice,
          speed,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        if (response.status === 402) {
          toast.error(t.reelflow.voiceTool.errors.insufficientCredits, {
            action: {
              label: t.reelflow.credits.buyNow,
              onClick: () => {
                window.location.href = `/${locale}/reelflow/credits`
              },
            },
          })
          return
        }
        throw new Error(payload?.message || t.reelflow.voiceTool.errors.failed)
      }

      setResult(payload.data)
      toast.success(t.reelflow.voiceTool.success)
    } catch (err) {
      const message = err instanceof Error ? err.message : t.reelflow.voiceTool.errors.failed
      setError(message)
      toast.error(t.reelflow.voiceTool.errors.failed, { description: message })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <main className="min-h-screen bg-background" data-testid="reelflow-voice-tool-page">
      <section className="border-b bg-muted/20">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Mic2 className="h-5 w-5" />
              </div>
              <Badge variant="secondary">{t.reelflow.voiceTool.badge}</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t.reelflow.voiceTool.title}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{t.reelflow.voiceTool.description}</p>
          </div>
          <Button variant="outline" asChild>
            <a href={`/${locale}/reelflow/assets?source=personal`}>
              <Archive className="mr-2 h-4 w-4" />
              {t.reelflow.voiceTool.openAssets}
            </a>
          </Button>
        </div>
      </section>

      <div className="container mx-auto grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:px-8">
        <section className="space-y-5 rounded-lg border bg-card p-5 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="voice-text">{t.reelflow.voiceTool.text}</Label>
              <span className={`text-xs ${charCount > 2000 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {charCount}/2000
              </span>
            </div>
            <Textarea
              id="voice-text"
              data-testid="reelflow-voice-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t.reelflow.voiceTool.textPlaceholder}
              className="min-h-48 resize-y"
            />
            <p className="text-xs leading-5 text-muted-foreground">{t.reelflow.voiceTool.textHint}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.reelflow.voiceTool.voice}</Label>
              <Select value={voice} onValueChange={setVoice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {voiceOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {(t.reelflow.voiceTool.voices as Record<string, string>)[item] || item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>{t.reelflow.voiceTool.speed}</Label>
                <span className="text-sm text-muted-foreground">{speed.toFixed(1)}x</span>
              </div>
              <Slider value={[speed]} min={0.75} max={1.25} step={0.05} onValueChange={([value]) => setSpeed(value)} />
            </div>
          </div>

          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-start gap-3">
              <SlidersHorizontal className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t.reelflow.voiceTool.costTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.reelflow.voiceTool.estimatedCost}: <span className="font-medium text-foreground">{estimatedCredits}</span> {t.reelflow.common.credits}
                </p>
              </div>
            </div>
          </div>

          <Button size="lg" className="w-full" onClick={generate} disabled={generating || charCount > 2000} data-testid="reelflow-voice-generate">
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AudioLines className="mr-2 h-4 w-4" />}
            {generating ? t.reelflow.voiceTool.generating : t.reelflow.voiceTool.generate}
          </Button>
        </section>

        <section className="min-h-[520px] overflow-hidden rounded-lg border bg-card shadow-sm" data-testid="reelflow-voice-result-panel">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="text-lg font-semibold">{t.reelflow.voiceTool.result}</h2>
              <p className="text-sm text-muted-foreground">{t.reelflow.voiceTool.resultHint}</p>
            </div>
            {result && <Badge variant="secondary">{t.reelflow.voiceTool.saved}</Badge>}
          </div>

          <div className="flex min-h-[360px] items-center justify-center bg-muted/30 p-6">
            {generating ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-9 w-9 animate-spin" />
                <p>{t.reelflow.voiceTool.generatingHint}</p>
              </div>
            ) : result ? (
              <div className="w-full max-w-xl rounded-lg border bg-background p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <PlayCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{t.reelflow.voiceTool.previewTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.audio.provider} · {result.audio.voice}
                    </p>
                  </div>
                </div>
                <audio controls src={result.audio.audioUrl} className="mt-5 w-full" data-testid="reelflow-voice-result" />
                <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <div>{t.reelflow.voiceTool.creditConsumed}: <span className="text-foreground">{result.credits.consumed}</span></div>
                  <div>{t.reelflow.voiceTool.balanceAfter}: <span className="text-foreground">{result.credits.balanceAfter}</span></div>
                </div>
              </div>
            ) : error ? (
              <Alert variant="destructive" className="max-w-md" data-testid="reelflow-voice-error">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t.reelflow.voiceTool.errors.failed}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <div className="max-w-sm text-center text-muted-foreground">
                <Mic2 className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-4 text-sm leading-6">{t.reelflow.voiceTool.emptyResult}</p>
              </div>
            )}
          </div>

          {result && (
            <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">{t.reelflow.voiceTool.savedHint}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <a href={`/${locale}/reelflow/assets?source=personal`} data-testid="reelflow-voice-view-assets">
                    <Archive className="mr-2 h-4 w-4" />
                    {t.reelflow.voiceTool.viewInAssets}
                  </a>
                </Button>
                <Button onClick={() => setText('')}>
                  <Mic2 className="mr-2 h-4 w-4" />
                  {t.reelflow.voiceTool.newVoice}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
