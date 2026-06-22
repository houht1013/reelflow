import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Button } from '@libs/react-shared/ui/button'
import { AlertCircle, ArrowRight, Coins, Film, Layers3, Loader2, LockKeyhole, RefreshCw, Sparkles } from 'lucide-react'
import { EmptyState, PageHeader, TonePill } from '@/components/reelflow-ui'

export const Route = createFileRoute('/$lang/(root)/reelflow/templates')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.templates),
  component: ReelflowTemplatesPage,
})

type ReelflowTemplate = {
  id: string
  code: string
  name: string
  description: string | null
  category: string | null
  visibility: string
  recommended: boolean
  capabilityRequirements: string[] | null
  estimatedCredits: number
  estimatedCreditsWithMp4: number
}

function ReelflowTemplatesPage() {
  const { t, locale } = useTranslation()
  const [templates, setTemplates] = useState<ReelflowTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTemplates = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/reelflow/templates')
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || t.reelflow.generate.loadError)
      setTemplates(data.templates || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t.reelflow.generate.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTemplates()
  }, [])

  const recommended = useMemo(() => templates.filter((item) => item.recommended), [templates])
  const regular = useMemo(() => templates.filter((item) => !item.recommended), [templates])
  const visibleTemplates = recommended.length > 0 ? [...recommended, ...regular] : templates

  return (
    <main className="min-h-screen" data-testid="reelflow-templates-page">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow={t.reelflow.shell.nav.templates}
          title={t.reelflow.templates.title}
          description={t.reelflow.templates.description}
          actions={
            <>
              <Button type="button" variant="outline" onClick={() => void loadTemplates()} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {t.reelflow.common.refresh}
              </Button>
              <Button asChild>
                <Link to="/$lang/reelflow/draft" params={{ lang: locale }}>
                  <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t.reelflow.home.primaryCta}
                </Link>
              </Button>
            </>
          }
        />

        {error ? (
          <Alert variant="destructive" className="mt-7">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{t.reelflow.generate.loadError}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading ? (
          <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="reelflow-skeleton h-56" />
            ))}
          </section>
        ) : visibleTemplates.length === 0 ? (
          <div className="mt-7">
            <EmptyState
              icon={Layers3}
              title={t.reelflow.generate.emptyTemplates}
              description={t.reelflow.generate.emptyTemplatesHint}
              action={
                <Button asChild>
                  <Link to="/$lang/reelflow/draft" params={{ lang: locale }}>{t.reelflow.home.primaryCta}</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleTemplates.map((template) => (
              <article key={template.id} className="reelflow-soft-tile group flex min-h-64 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_0_0_0_1px_var(--reelflow-hairline)]">
                    <Film className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {template.recommended && <TonePill tone="brand" icon={Sparkles}>{t.reelflow.generate.recommended}</TonePill>}
                    {template.visibility !== 'public' && (
                      <TonePill tone="neutral" icon={LockKeyhole}>{t.reelflow.generate.privateTemplate}</TonePill>
                    )}
                  </div>
                </div>

                <div className="mt-5 min-w-0 flex-1">
                  {template.category && <p className="text-xs font-medium text-muted-foreground">{template.category}</p>}
                  <h2 className="reelflow-display mt-2 text-xl leading-tight">{template.name}</h2>
                  {template.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{template.description}</p>}
                </div>

                <div className="reelflow-muted-tile mt-5 flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{t.reelflow.generate.estimate}</p>
                    <p className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-sm text-muted-foreground">
                      <Coins className="h-4 w-4" style={{ color: 'var(--reelflow-amber)' }} aria-hidden="true" />
                      <span className="reelflow-num font-semibold text-foreground">{template.estimatedCredits}</span>
                      <span>{t.reelflow.common.credits}</span>
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0" asChild>
                    <Link to="/$lang/reelflow/draft" params={{ lang: locale }} search={{ template: template.code }}>
                      {t.reelflow.generate.createFromTemplate}
                      <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
