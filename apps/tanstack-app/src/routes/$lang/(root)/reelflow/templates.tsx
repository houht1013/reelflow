import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Button } from '@libs/react-shared/ui/button'
import { Input } from '@libs/react-shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@libs/react-shared/ui/select'
import { cn } from '@libs/ui/utils/cn'
import { AlertCircle, ArrowRight, Flame, Layers3, LockKeyhole, Loader2, RefreshCw, Search, Sparkles, Star } from 'lucide-react'
import { EmptyState, PageHeader, TonePill, categoryVisual } from '@/components/reelflow-ui'
import { ossThumb } from '@/lib/image-url'

export const Route = createFileRoute('/$lang/(root)/reelflow/templates')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.templates),
  component: ReelflowTemplatesPage,
})

type TemplateBadge = 'new' | 'recommended' | 'hot'

type ReelflowTemplate = {
  id: string
  code: string
  name: string
  description: string | null
  category: string | null
  visibility: string
  recommended: boolean
  metadata: {
    tags?: string[]
    badges?: TemplateBadge[]
    coverImageUrl?: string | null
    sampleVideoUrl?: string | null
  } | null
}

const BADGE_ORDER: TemplateBadge[] = ['hot', 'recommended', 'new']

function ReelflowTemplatesPage() {
  const { t, locale } = useTranslation()
  const [templates, setTemplates] = useState<ReelflowTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [sortBy, setSortBy] = useState<'recommended' | 'newest' | 'hot'>('recommended')

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

  const badgeLabels = t.reelflow.templates.badges as Record<TemplateBadge, string>

  const allCategories = useMemo(() => {
    const set = new Set<string>()
    for (const tpl of templates) if (tpl.category) set.add(tpl.category)
    return Array.from(set)
  }, [templates])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matched = templates.filter((tpl) => {
      if (activeCategory && tpl.category !== activeCategory) return false
      if (!q) return true
      const tags = tpl.metadata?.tags ?? []
      const haystack = [tpl.name, tpl.description ?? '', tpl.category ?? '', ...tags].join(' ').toLowerCase()
      return haystack.includes(q)
    })
    const badgeRank = (tpl: ReelflowTemplate, badge: TemplateBadge) => ((tpl.metadata?.badges ?? []).includes(badge) ? 0 : 1)
    const sorted = [...matched]
    if (sortBy === 'recommended') sorted.sort((a, b) => (a.recommended === b.recommended ? badgeRank(a, 'recommended') - badgeRank(b, 'recommended') : a.recommended ? -1 : 1))
    else if (sortBy === 'newest') sorted.sort((a, b) => badgeRank(a, 'new') - badgeRank(b, 'new'))
    else sorted.sort((a, b) => badgeRank(a, 'hot') - badgeRank(b, 'hot'))
    return sorted
  }, [templates, query, activeCategory, sortBy])

  return (
    <main className="min-h-screen" data-testid="reelflow-templates-page">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title={t.reelflow.templates.title}
          actions={
            <Button type="button" variant="outline" onClick={() => void loadTemplates()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />}
              {t.reelflow.common.refresh}
            </Button>
          }
        />

        {/* Search + sort + category filters */}
        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.reelflow.templates.searchPlaceholder}
                className="pl-9"
                data-testid="reelflow-template-search"
              />
            </div>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
              <SelectTrigger className="w-auto min-w-[120px]" aria-label={t.reelflow.templates.sortLabel}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">{t.reelflow.templates.sortRecommended}</SelectItem>
                <SelectItem value="newest">{t.reelflow.templates.sortNewest}</SelectItem>
                <SelectItem value="hot">{t.reelflow.templates.sortHot}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {allCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <TagChip active={activeCategory === ''} onClick={() => setActiveCategory('')}>{t.reelflow.templates.allTag}</TagChip>
              {allCategories.map((category) => (
                <TagChip key={category} active={activeCategory === category} onClick={() => setActiveCategory(activeCategory === category ? '' : category)}>{category}</TagChip>
              ))}
            </div>
          )}
        </div>

        {error ? (
          <Alert variant="destructive" className="mt-7">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{t.reelflow.generate.loadError}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading ? (
          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="reelflow-skeleton h-72" />)}
          </section>
        ) : templates.length === 0 ? (
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
        ) : filtered.length === 0 ? (
          <div className="mt-7">
            <EmptyState icon={Search} title={t.reelflow.templates.noResults} description={t.reelflow.templates.noResultsHint} />
          </div>
        ) : (
          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((template) => {
              const badges = (template.metadata?.badges ?? []).slice().sort((a, b) => BADGE_ORDER.indexOf(a) - BADGE_ORDER.indexOf(b))
              const tags = template.metadata?.tags ?? []
              const cover = template.metadata?.coverImageUrl
              const sample = template.metadata?.sampleVideoUrl
              const visual = categoryVisual(template.category)
              const FallbackIcon = visual.icon
              return (
                <Link
                  key={template.id}
                  to="/$lang/reelflow/draft/$templateCode"
                  params={{ lang: locale, templateCode: template.code }}
                  className="reelflow-soft-tile group flex flex-col overflow-hidden p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                  data-testid={`reelflow-template-card-${template.code}`}
                >
                  {/* Cover media */}
                  <div
                    className="relative aspect-[16/10] w-full overflow-hidden"
                    style={cover || sample ? undefined : { background: `color-mix(in oklch, ${visual.color} 10%, var(--background))` }}
                  >
                    {sample ? (
                      <video src={sample} poster={cover ? ossThumb(cover, 640) : undefined} muted loop playsInline className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" onMouseEnter={(e) => void e.currentTarget.play().catch(() => {})} onMouseLeave={(e) => e.currentTarget.pause()} />
                    ) : cover ? (
                      <img src={ossThumb(cover, 640)} alt={template.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <FallbackIcon className="h-10 w-10 transition-transform duration-300 group-hover:scale-110" style={{ color: visual.color }} aria-hidden="true" />
                      </div>
                    )}
                    {/* Badges */}
                    {(badges.length > 0 || template.visibility !== 'public') && (
                      <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
                        {badges.map((badge) => <BadgePill key={badge} badge={badge} label={badgeLabels[badge]} />)}
                        {template.visibility !== 'public' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur">
                            <LockKeyhole className="h-3 w-3" aria-hidden="true" />{t.reelflow.generate.privateTemplate}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-5">
                    {template.category && <p className="text-xs font-medium text-muted-foreground">{template.category}</p>}
                    <h2 className="reelflow-display mt-1.5 text-lg leading-tight">{template.name}</h2>
                    {template.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{template.description}</p>}
                    {tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                    )}
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary" data-testid={`reelflow-template-use-${template.code}`}>
                      {t.reelflow.generate.createFromTemplate}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}

function TagChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-sm transition-colors',
        active ? 'border-primary/50 bg-primary text-primary-foreground' : 'border-border/60 bg-card/60 text-muted-foreground hover:border-primary/30 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function BadgePill({ badge, label }: { badge: TemplateBadge; label: string }) {
  const icon = badge === 'hot' ? Flame : badge === 'recommended' ? Star : Sparkles
  const Icon = icon
  const tone = badge === 'hot' ? 'warning' : badge === 'recommended' ? 'brand' : 'info'
  return (
    <span className="[&_.reelflow-pill]:backdrop-blur">
      <TonePill tone={tone as 'warning' | 'brand' | 'info'} icon={Icon}>{label}</TonePill>
    </span>
  )
}
