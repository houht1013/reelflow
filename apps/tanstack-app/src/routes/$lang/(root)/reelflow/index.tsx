import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import {
  ImageIcon,
  Layers3,
  ListChecks,
  Mic2,
  Sparkles,
  Video,
  Flame,
  Star,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react'
import { categoryVisual } from '@/components/reelflow-ui'
import { ossThumb } from '@/lib/image-url'
import { authClientReact } from '@libs/auth/authClient'

export const Route = createFileRoute('/$lang/(root)/reelflow/')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.home),
  component: ReelflowHomePage,
})

type TemplateBadge = 'new' | 'recommended' | 'hot'
const BADGE_ORDER: TemplateBadge[] = ['hot', 'recommended', 'new']

type HomeTemplate = {
  id: string
  code: string
  name: string
  category: string | null
  estimatedCredits?: number
  metadata?: { badges?: TemplateBadge[]; coverImageUrl?: string | null } | null
}

type PromptTemplate = { title: string; prompt: string; ratio: string }

type EntryTo =
  | '/$lang/reelflow/templates'
  | '/$lang/reelflow/image'
  | '/$lang/reelflow/voice'
  | '/$lang/reelflow/jobs'

type DiscoverTab = 'templates' | 'image' | 'video'

function ReelflowHomePage() {
  const { t, locale } = useTranslation()
  const { data: session } = authClientReact.useSession()
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || ''
  const [templates, setTemplates] = useState<HomeTemplate[] | null>(null)
  const [tab, setTab] = useState<DiscoverTab>('templates')

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch('/api/reelflow/templates')
        const data = await res.json().catch(() => null)
        if (alive) setTemplates(Array.isArray(data?.templates) ? (data.templates as HomeTemplate[]) : [])
      } catch {
        if (alive) setTemplates([])
      }
    }
    void load()
    return () => {
      alive = false
    }
  }, [])

  const home = t.reelflow.home
  const entryCopy = home.entries as Record<string, { title: string; desc: string }>
  const discover = home.discover
  const promptTemplates = t.reelflow.imageTool.promptTemplates as PromptTemplate[]

  const entries: { key: string; icon: LucideIcon; to?: EntryTo; color: string; comingSoon?: boolean }[] = [
    { key: 'templates', icon: Layers3, to: '/$lang/reelflow/templates', color: 'var(--reelflow-coral)' },
    { key: 'image', icon: ImageIcon, to: '/$lang/reelflow/image', color: 'var(--reelflow-blue)' },
    { key: 'voice', icon: Mic2, to: '/$lang/reelflow/voice', color: 'var(--reelflow-violet)' },
    { key: 'video', icon: Video, color: 'var(--reelflow-green)', comingSoon: true },
    { key: 'tasks', icon: ListChecks, to: '/$lang/reelflow/jobs', color: 'var(--reelflow-amber)' },
  ]

  const tabs: DiscoverTab[] = ['templates', 'image', 'video']

  return (
    <main className="min-h-screen" data-testid="reelflow-home-page">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Greeting */}
        <div className="reelflow-reveal text-center" data-delay="1">
          <p className="text-lg font-medium sm:text-xl">
            <span aria-hidden="true">👋</span> {home.greeting}{userName ? ` ${userName}` : ''}
          </p>
          <h1 className="reelflow-display mt-2 text-[1.7rem] leading-[1.15] sm:text-[2rem]">{home.greetingQuestion}</h1>
        </div>

        {/* Entry cards */}
        <div className="reelflow-reveal mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-delay="2">
          {entries.map((entry) => {
            const copy = entryCopy[entry.key]
            const Icon = entry.icon
            const inner = (
              <>
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `color-mix(in oklch, ${entry.color} 12%, transparent)`, color: entry.color }}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{copy.title}</span>
                    {entry.comingSoon && <span className="reelflow-pill shrink-0" data-tone="neutral">{t.reelflow.shell.comingSoon}</span>}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">{copy.desc}</span>
                </span>
              </>
            )
            if (entry.comingSoon || !entry.to) {
              return <div key={entry.key} className="reelflow-muted-tile flex items-center gap-3 p-4 opacity-75">{inner}</div>
            }
            return (
              <Link key={entry.key} to={entry.to} params={{ lang: locale }} className="reelflow-soft-tile group flex items-center gap-3 p-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
                {inner}
              </Link>
            )
          })}
        </div>

        {/* Discover */}
        <section className="reelflow-reveal mt-10" data-delay="3">
          <h2 className="reelflow-display text-lg">{discover.title}</h2>
          <div className="mt-3 flex items-center gap-5 border-b border-border/45">
            {tabs.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                aria-pressed={tab === item}
                data-testid={`reelflow-discover-tab-${item}`}
                className={[
                  '-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors',
                  tab === item ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {(discover.tabs as Record<DiscoverTab, string>)[item]}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {tab === 'templates' && (
              templates === null ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="reelflow-skeleton h-[190px]" />)}
                </div>
              ) : templates.length === 0 ? (
                <p className="reelflow-muted-tile px-4 py-8 text-center text-sm text-muted-foreground">{discover.emptyTemplates}</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {templates.map((tpl) => <DiscoverTemplateCard key={tpl.id} template={tpl} locale={locale} t={t} />)}
                </div>
              )
            )}

            {tab === 'image' && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {promptTemplates.map((tpl) => (
                  <Link
                    key={tpl.title}
                    to="/$lang/reelflow/image"
                    params={{ lang: locale }}
                    className="reelflow-soft-tile group flex flex-col p-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'color-mix(in oklch, var(--reelflow-blue) 12%, transparent)', color: 'var(--reelflow-blue)' }}>
                      <WandSparkles className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <h3 className="mt-3 text-sm font-semibold">{tpl.title}</h3>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{tpl.prompt}</p>
                  </Link>
                ))}
              </div>
            )}

            {tab === 'video' && (
              <div className="reelflow-muted-tile flex flex-col items-center px-6 py-14 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'color-mix(in oklch, var(--reelflow-green) 12%, transparent)', color: 'var(--reelflow-green)' }}>
                  <Video className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="mt-4 text-sm text-muted-foreground">{discover.videoComingSoon}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function DiscoverTemplateCard({
  template,
  locale,
  t,
}: {
  template: HomeTemplate
  locale: string
  t: ReturnType<typeof useTranslation>['t']
}) {
  const visual = categoryVisual(template.category)
  const Icon = visual.icon
  const cover = template.metadata?.coverImageUrl
  const badges = (template.metadata?.badges ?? []).slice().sort((a, b) => BADGE_ORDER.indexOf(a) - BADGE_ORDER.indexOf(b))
  const badgeLabels = t.reelflow.templates.badges as Record<TemplateBadge, string>
  const credits = typeof template.estimatedCredits === 'number'
    ? t.reelflow.home.templateCredits.replace('{n}', String(Math.round(template.estimatedCredits)))
    : null

  return (
    <Link
      to="/$lang/reelflow/draft/$templateCode"
      params={{ lang: locale, templateCode: template.code }}
      className="reelflow-soft-tile group flex flex-col overflow-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden" style={cover ? undefined : { background: `color-mix(in oklch, ${visual.color} 10%, var(--background))` }}>
        {cover ? (
          <img src={ossThumb(cover, 480)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <Icon className="h-9 w-9 transition-transform duration-300 group-hover:scale-110" style={{ color: visual.color }} aria-hidden="true" />
        )}
        {badges.length > 0 && (
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
            {badges.map((badge) => <DiscoverBadge key={badge} badge={badge} label={badgeLabels[badge]} />)}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="text-sm font-semibold">{template.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {template.category}
          {credits ? <span className="mx-1.5 text-border">·</span> : null}
          {credits}
        </p>
      </div>
    </Link>
  )
}

function DiscoverBadge({ badge, label }: { badge: TemplateBadge; label: string }) {
  const Icon = badge === 'hot' ? Flame : badge === 'recommended' ? Star : Sparkles
  const tone = badge === 'hot' ? 'warning' : badge === 'recommended' ? 'brand' : 'info'
  return (
    <span className="reelflow-pill backdrop-blur" data-tone={tone}>
      <Icon aria-hidden="true" />
      {label}
    </span>
  )
}
