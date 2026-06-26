import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertCircle, Archive, CheckCircle2, Loader2, Mic2, Sparkles, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Button } from '@libs/react-shared/ui/button'
import { Label } from '@libs/react-shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@libs/react-shared/ui/select'
import { Textarea } from '@libs/react-shared/ui/textarea'
import { PageHeader, TonePill } from '@/components/reelflow-ui'

export const Route = createFileRoute('/$lang/(root)/reelflow/voice')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.voiceTool),
  component: ReelflowVoiceToolPage,
})

const MAX_TEXT_LENGTH = 2000
const VOICE_OPTIONS = ['alloy', 'verse', 'aria', 'sage', 'nova'] as const
const SPEED_OPTIONS = ['0.75', '1', '1.25', '1.5'] as const
// After this many seconds, surface a "model is busy, hang tight" hint.
const SLOW_HINT_SECONDS = 20

type VoiceToolResult = {
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

function ReelflowVoiceToolPage() {
  const { t, locale } = useTranslation()
  const navigate = useNavigate()
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const [voice, setVoice] = useState<string>(VOICE_OPTIONS[0])
  const [speed, setSpeed] = useState<string>('1')
  const [generating, setGenerating] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<VoiceToolResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [textError, setTextError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const voiceLabels = t.reelflow.voiceTool.voices as Record<string, string>
  const estimatedCost = text.trim().length
    ? Math.max(1, Math.ceil(text.trim().length * 0.002 * 100) / 100)
    : 0

  const generate = async () => {
    const trimmed = text.trim()
    if (!trimmed) {
      setTextError(t.reelflow.voiceTool.errors.noText)
      textRef.current?.focus()
      return
    }
    if (trimmed.length > MAX_TEXT_LENGTH) {
      setTextError(t.reelflow.voiceTool.errors.tooLong)
      textRef.current?.focus()
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setGenerating(true)
    setError(null)
    setTextError(null)
    setElapsed(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    try {
      const response = await fetch('/api/reelflow/tools/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          voice,
          speed: Number(speed),
        }),
        signal: controller.signal,
      })
      const payload = await response.json()
      if (!response.ok) {
        if (response.status === 402) {
          toast.error(t.reelflow.voiceTool.errors.insufficientCredits, {
            action: {
              label: t.reelflow.credits.buyNow,
              onClick: () => {
                void navigate({ to: '/$lang/reelflow/credits', params: { lang: locale } })
              },
            },
          })
          return
        }
        throw new Error(payload?.message || t.reelflow.voiceTool.errors.failed)
      }

      setResult(payload.data)
      toast.success(t.reelflow.voiceTool.success)
      // A charge just settled — let the shell header refresh its balance.
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('reelflow:credits-changed'))
    } catch (err) {
      // User-initiated cancel: not an error, just stop quietly.
      if (err instanceof DOMException && err.name === 'AbortError') return
      const message = err instanceof Error ? err.message : t.reelflow.voiceTool.errors.failed
      setError(message)
      toast.error(t.reelflow.voiceTool.errors.failed, { description: message })
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

  const resetVoiceForm = () => {
    setText('')
    setResult(null)
    setError(null)
    setTextError(null)
    textRef.current?.focus()
  }

  return (
    <main className="min-h-screen" data-testid="reelflow-voice-tool-page">
      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <PageHeader
            eyebrow={t.reelflow.voiceTool.badge}
            title={t.reelflow.voiceTool.title}
            description={t.reelflow.voiceTool.description}
            actions={
              <Button variant="outline" asChild>
                <Link to="/$lang/reelflow/assets" params={{ lang: locale }} search={{ source: 'all', assetType: 'all', query: '' }}>
                  <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t.reelflow.voiceTool.openAssets}
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
              <Mic2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="reelflow-display text-lg">{t.reelflow.voiceTool.text}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.reelflow.voiceTool.textHint}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice-text" className="sr-only">{t.reelflow.voiceTool.text}</Label>
            <Textarea
              ref={textRef}
              id="voice-text"
              name="voice-text"
              autoComplete="off"
              data-testid="reelflow-voice-text"
              aria-invalid={textError ? 'true' : undefined}
              aria-describedby={textError ? 'voice-text-error' : undefined}
              value={text}
              onChange={(event) => {
                setText(event.target.value)
                if (textError) setTextError(null)
              }}
              placeholder={t.reelflow.voiceTool.textPlaceholder}
              className="min-h-44 resize-y bg-background/65 text-base leading-7 shadow-[inset_0_0_0_1px_var(--reelflow-hairline)]"
            />
            <div className="flex items-center justify-between">
              {textError ? (
                <p id="voice-text-error" className="text-sm text-destructive" role="alert">
                  {textError}
                </p>
              ) : (
                <span />
              )}
              <span className={`text-xs ${text.trim().length > MAX_TEXT_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
                {text.trim().length}/{MAX_TEXT_LENGTH}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="voice-voice">{t.reelflow.voiceTool.voice}</Label>
              <Select name="voice-voice" value={voice} onValueChange={setVoice}>
                <SelectTrigger id="voice-voice" aria-label={t.reelflow.voiceTool.voice} data-testid="reelflow-voice-voice">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {voiceLabels[item] || item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="voice-speed">{t.reelflow.voiceTool.speed}</Label>
              <Select name="voice-speed" value={speed} onValueChange={setSpeed}>
                <SelectTrigger id="voice-speed" aria-label={t.reelflow.voiceTool.speed}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPEED_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}×
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="reelflow-muted-tile flex items-center justify-between p-4">
            <div className="text-sm text-muted-foreground">{t.reelflow.voiceTool.estimatedCost}</div>
            <div className="text-sm font-medium text-foreground" data-testid="reelflow-voice-estimate">{estimatedCost}</div>
          </div>

          <Button type="button" size="lg" className="w-full" onClick={generate} disabled={generating} data-testid="reelflow-voice-generate">
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />}
            {generating ? t.reelflow.voiceTool.generating : t.reelflow.voiceTool.generate}
          </Button>
        </section>

        <section className="reelflow-panel min-h-[520px] overflow-hidden p-4" data-testid="reelflow-voice-result-panel" aria-live="polite">
          <div className="flex items-center justify-between gap-3 px-1 pb-4">
            <div>
              <h2 className="reelflow-display text-lg">{t.reelflow.voiceTool.result}</h2>
              <p className="text-sm text-muted-foreground">{t.reelflow.voiceTool.resultHint}</p>
            </div>
            {result && <TonePill tone="success" icon={CheckCircle2}>{t.reelflow.voiceTool.saved}</TonePill>}
          </div>

          <div className="flex min-h-[420px] items-center justify-center rounded-xl bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--reelflow-coral)_8%,transparent),transparent_42%),color-mix(in_oklch,var(--background)_82%,white)] p-6 shadow-[inset_0_0_0_1px_var(--reelflow-hairline)]">
            {generating ? (
              <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
                <Loader2 className="h-9 w-9 animate-spin" aria-hidden="true" />
                <p>{t.reelflow.voiceTool.generatingHint} · {elapsed}s</p>
                {elapsed >= SLOW_HINT_SECONDS && (
                  <p className="max-w-xs text-xs text-muted-foreground/80">{t.reelflow.voiceTool.generatingSlow}</p>
                )}
                <Button type="button" variant="outline" size="sm" className="mt-1 rounded-full" onClick={cancelGenerate} data-testid="reelflow-voice-cancel">
                  <X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />{t.reelflow.voiceTool.cancel}
                </Button>
              </div>
            ) : result ? (
              <div className="w-full max-w-md text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[inset_0_0_0_1px_var(--reelflow-hairline)]">
                  <Mic2 className="h-8 w-8" aria-hidden="true" />
                </span>
                <p className="mt-4 text-sm font-medium text-foreground">{t.reelflow.voiceTool.previewTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">{voiceLabels[result.audio.voice] || result.audio.voice} · {result.audio.provider}</p>
                <audio
                  controls
                  src={result.audio.audioUrl}
                  className="mt-5 w-full"
                  data-testid="reelflow-voice-result"
                >
                  <track kind="captions" />
                </audio>
              </div>
            ) : error ? (
              <Alert variant="destructive" className="max-w-md" data-testid="reelflow-voice-error">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>{t.reelflow.voiceTool.errors.failed}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <div className="max-w-sm text-center text-muted-foreground">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-background/70 shadow-[inset_0_0_0_1px_var(--reelflow-hairline)]">
                  <Mic2 className="h-8 w-8 opacity-70" aria-hidden="true" />
                </span>
                <p className="mt-4 text-sm leading-6">{t.reelflow.voiceTool.emptyResult}</p>
              </div>
            )}
          </div>

          {result && (
            <div className="reelflow-muted-tile mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {t.reelflow.voiceTool.creditConsumed}: <span className="font-medium text-foreground">{result.credits.consumed}</span> · {t.reelflow.voiceTool.balanceAfter}: <span className="font-medium text-foreground">{result.credits.balanceAfter}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <Link to="/$lang/reelflow/assets" params={{ lang: locale }} search={{ source: 'all', assetType: 'all', query: '' }} data-testid="reelflow-voice-view-assets">
                    <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t.reelflow.voiceTool.viewInAssets}
                  </Link>
                </Button>
                <Button type="button" onClick={resetVoiceForm}>
                  <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
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
