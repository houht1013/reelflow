import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { useTranslation } from '@/hooks/use-translation'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@libs/react-shared/ui/button'
import {
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Download,
  FileText,
  Film,
  Layers3,
  Play,
  Sparkles,
  WandSparkles,
} from 'lucide-react'

export const Route = createFileRoute('/$lang/(root)/')({
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.landing.metadata),
  component: HomePage,
})

const workflowIcons = [Layers3, WandSparkles, Clock3, Download]

/**
 * Reveals every [data-reveal] element as it scrolls into view. SSR-safe:
 * elements are only hidden once JS marks the page `reveal-ready`, so the
 * content stays visible without JavaScript.
 */
function useScrollReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const root = document.querySelector<HTMLElement>('.reelflow-landing')
    if (!root) return
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    root.classList.add('reveal-ready')

    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/** Animates a numeric value (with optional suffix) up from 0 when it enters view. */
function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const match = value.match(/^(\d[\d,]*)(.*)$/)
    const el = ref.current
    if (!match || !el || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const grouped = match[1].includes(',')
    const target = Number(match[1].replace(/,/g, ''))
    const suffix = match[2]
    const format = (n: number) => (grouped ? n.toLocaleString() : String(n))
    let started = false

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started) {
            started = true
            const duration = 1200
            const start = performance.now()
            setDisplay('0' + suffix)
            const tick = (now: number) => {
              const progress = Math.min(1, (now - start) / duration)
              const eased = 1 - Math.pow(1 - progress, 3)
              setDisplay(format(Math.round(target * eased)) + suffix)
              if (progress < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
            io.disconnect()
          }
        }
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [value])

  return (
    <span ref={ref} className="landing-num">
      {display}
    </span>
  )
}

function HomePage() {
  const { t, locale } = useTranslation()
  const landing = t.reelflow.landing
  const heroRef = useRef<HTMLElement>(null)
  useScrollReveal()

  const handleHeroMove = (event: React.MouseEvent<HTMLElement>) => {
    const el = heroRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${event.clientX - rect.left}px`)
    el.style.setProperty('--my', `${event.clientY - rect.top}px`)
  }

  return (
    <main className="reelflow-landing min-h-screen overflow-hidden text-white" data-testid="reelflow-landing-page">
      <section
        className="relative"
        onMouseMove={handleHeroMove}
        onMouseEnter={() => heroRef.current?.classList.add('landing-hero-live')}
        onMouseLeave={() => heroRef.current?.classList.remove('landing-hero-live')}
        ref={heroRef}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="landing-grid" />
          <div className="landing-floor" />
          <div className="landing-glow landing-glow-c" />
          <div className="landing-glow landing-glow-a" />
          <div className="landing-glow landing-glow-b" />
          <div className="landing-spotlight" />
        </div>

        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-12 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:py-20">
          <div className="max-w-2xl">
            <span className="landing-hero-eyebrow" data-reveal style={{ '--reveal-delay': '0ms' } as React.CSSProperties}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {landing.hero.eyebrow}
            </span>
            <h1
              className="reelflow-display mt-5 text-balance text-5xl leading-[0.98] text-white md:text-6xl lg:text-[4.6rem]"
              data-reveal
              style={{ '--reveal-delay': '90ms' } as React.CSSProperties}
            >
              {landing.hero.title}
            </h1>
            <p
              className="mt-6 max-w-xl text-lg leading-8 text-white/68"
              data-reveal
              style={{ '--reveal-delay': '180ms' } as React.CSSProperties}
            >
              {landing.hero.subtitle}
            </p>
            <div
              className="mt-8 flex flex-col gap-3 sm:flex-row"
              data-reveal
              style={{ '--reveal-delay': '260ms' } as React.CSSProperties}
            >
              <Button asChild size="lg" className="landing-cta h-12 rounded-full bg-[#ff6045] px-6 text-white shadow-[0_18px_48px_-24px_#ff6045] transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-[#ff735b]">
                <a href={`/${locale}/reelflow`} data-testid="reelflow-landing-primary-cta">
                  {landing.hero.primaryCta}
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-white/15 bg-white/[0.06] px-6 text-white shadow-none backdrop-blur transition-transform hover:-translate-y-0.5 hover:bg-white/[0.1] hover:text-white">
                <a href={`/${locale}/pricing`} data-testid="reelflow-landing-secondary-cta">
                  {landing.hero.secondaryCta}
                </a>
              </Button>
            </div>

            <div
              className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3"
              data-reveal
              style={{ '--reveal-delay': '340ms' } as React.CSSProperties}
            >
              {landing.hero.trust.map((item: string) => (
                <div key={item} className="landing-mini-proof">
                  <CheckCircle2 className="h-4 w-4 text-[#ffb84d]" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative" data-reveal style={{ '--reveal-delay': '200ms' } as React.CSSProperties}>
            <ProductPreview landing={landing} />
          </div>
        </div>
      </section>

      <section id="product" className="relative border-y border-white/[0.08] bg-white/[0.025] py-16">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="grid gap-4 md:grid-cols-4">
            {landing.metrics.map((metric: { value: string; label: string }, index: number) => (
              <div
                key={metric.label}
                className="landing-metric group"
                data-reveal
                style={{ '--reveal-delay': `${index * 90}ms` } as React.CSSProperties}
              >
                <CountUp value={metric.value} />
                <div className="mt-2 text-sm leading-6 text-white/55">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="relative py-24">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <SectionHeader title={landing.workflow.title} description={landing.workflow.description} />
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {landing.workflow.steps.map((step: { title: string; description: string }, index: number) => {
              const Icon = workflowIcons[index] || CheckCircle2
              return (
                <div
                  key={step.title}
                  className="landing-panel group relative p-5"
                  data-reveal
                  style={{ '--reveal-delay': `${index * 90}ms` } as React.CSSProperties}
                >
                  <span className="landing-step-index">{String(index + 1).padStart(2, '0')}</span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.08] text-[#ffb84d] ring-1 ring-white/[0.1] transition-[background-color,transform] group-hover:-translate-y-0.5 group-hover:bg-[#ff6045] group-hover:text-white">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/56">{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="cases" className="relative py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 md:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div data-reveal>
            <SectionHeader title={landing.templates.title} description={landing.templates.description} align="left" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {landing.templates.items.map((template: { name: string; description: string; output: string }, index: number) => (
              <article
                key={template.name}
                className="landing-case group"
                data-reveal
                style={{ '--reveal-delay': `${index * 110}ms` } as React.CSSProperties}
              >
                <div className="landing-case-frame">
                  <div className={`landing-case-poster landing-case-poster-${index + 1}`}>
                    <span className="landing-case-tag">
                      <Clapperboard className="h-3.5 w-3.5 text-white/85" aria-hidden="true" />
                      {template.output}
                    </span>
                    <span className="landing-case-play">
                      <Play className="h-4 w-4 translate-x-px fill-current" aria-hidden="true" />
                    </span>
                  </div>
                </div>
                <h3 className="mt-5 text-base font-semibold text-white">{template.name}</h3>
                <p className="mt-2 text-sm leading-6 text-white/56">{template.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="docs" className="relative py-20">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {landing.docs.items.map((item: { title: string; description: string }, index: number) => (
              <div
                key={item.title}
                className="landing-doc group"
                data-reveal
                style={{ '--reveal-delay': `${index * 90}ms` } as React.CSSProperties}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-[#ffb84d] ring-1 ring-white/[0.1]">
                    {index === 0 ? <Film className="h-4 w-4" aria-hidden="true" /> : index === 1 ? <FileText className="h-4 w-4" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                  </span>
                  <h2 className="text-base font-semibold text-white">{item.title}</h2>
                </div>
                <p className="mt-4 text-sm leading-6 text-white/56">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="relative pb-28 pt-4">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="landing-subscribe" data-reveal>
            <div>
              <h2 className="reelflow-display max-w-2xl text-3xl leading-tight text-white md:text-4xl">{landing.finalCta.title}</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/62">{landing.finalCta.description}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button asChild size="lg" className="h-12 rounded-full bg-white px-6 text-slate-950 transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-white/88">
                <a href={`/${locale}/reelflow`}>
                  {landing.finalCta.primaryCta}
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-white/20 bg-transparent px-6 text-white hover:-translate-y-0.5 hover:bg-white/[0.08] hover:text-white">
                <a href={`/${locale}/pricing`}>
                  {landing.finalCta.secondaryCta}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function ProductPreview({ landing }: { landing: any }) {
  const wrapRef = useRef<HTMLDivElement>(null)

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = el.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    el.style.setProperty('--rx', `${px * 9}deg`)
    el.style.setProperty('--ry', `${py * -9}deg`)
  }

  const handleLeave = () => {
    const el = wrapRef.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  return (
    <div ref={wrapRef} className="landing-preview-parallax" onMouseMove={handleMove} onMouseLeave={handleLeave}>
      <div className="landing-preview" data-testid="reelflow-landing-preview">
        <div className="landing-preview-top">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff6045] text-white shadow-[0_12px_34px_-18px_#ff6045]">
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{landing.preview.title}</div>
              <div className="text-xs text-white/45">{landing.preview.subtitle}</div>
            </div>
          </div>
          <span className="landing-live-badge">
            <span className="landing-live-dot" aria-hidden="true" />
            {landing.preview.status}
          </span>
        </div>

        <div className="landing-preview-body mt-5">
          <div className="landing-phone">
            <div className="landing-phone-beam" />
            <div className="landing-phone-screen">
              <div className="landing-phone-stage">
                <div className="landing-phone-status">{landing.preview.verticalBadge}</div>
                <div className="landing-phone-title">{landing.preview.title}</div>
                <div className="landing-phone-caption">{landing.preview.caption}</div>
              </div>
              <div className="landing-storyboard">
                {landing.preview.sceneLabels.map((scene: string, index: number) => (
                  <div key={scene} className={`landing-scene landing-scene-${index + 1}`}>
                    <span>{scene}</span>
                  </div>
                ))}
              </div>
              <div className="landing-phone-footer">
                <span>{landing.preview.duration}</span>
                <span>{landing.preview.status}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="landing-preview-card">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="font-medium text-white">{landing.preview.progress}</span>
                <span className="text-white/45">86%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="landing-progress-fill h-2 rounded-full bg-[#ff6045] shadow-[0_0_24px_#ff6045]" />
              </div>
              <div className="mt-5 space-y-3">
                {landing.preview.stages.map((stage: string, index: number) => (
                  <div key={stage} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className={index < 3 ? 'h-4 w-4 text-[#ffb84d]' : 'h-4 w-4 text-white/22'} aria-hidden="true" />
                    <span className={index < 3 ? 'text-white/82' : 'text-white/42'}>{stage}</span>
                  </div>
                ))}
              </div>
            </div>
            <PreviewStat label={landing.preview.costLabel} value={landing.preview.costValue} />
            <PreviewStat label={landing.preview.auditLabel} value={landing.preview.auditValue} />
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="landing-preview-stat">
      <span className="text-xs text-white/42">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  )
}

function SectionHeader({ title, description, align = 'center' }: { title: string; description: string; align?: 'left' | 'center' }) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'} data-reveal>
      <h2 className="reelflow-display text-balance text-3xl leading-tight text-white md:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-white/58">{description}</p>
    </div>
  )
}
