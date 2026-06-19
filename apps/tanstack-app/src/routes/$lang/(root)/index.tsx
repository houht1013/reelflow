import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { useTranslation } from '@/hooks/use-translation'
import type { ReactNode } from 'react'
import { Badge } from '@libs/react-shared/ui/badge'
import { Button } from '@libs/react-shared/ui/button'
import {
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Coins,
  Download,
  Film,
  Images,
  Layers3,
  Mic2,
  Play,
  ShieldCheck,
  WandSparkles,
} from 'lucide-react'

export const Route = createFileRoute('/$lang/(root)/')({
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.landing.metadata),
  component: HomePage,
})

const workflowIcons = [Layers3, WandSparkles, Clock3, Download]
const toolIcons = [Images, Mic2, Film]

function HomePage() {
  const { t, locale } = useTranslation()
  const landing = t.reelflow.landing

  return (
    <main className="min-h-screen bg-background text-foreground" data-testid="reelflow-landing-page">
      <section className="relative min-h-[calc(100vh-7rem)] overflow-hidden border-b bg-[#f4f7f5]">
        <div className="absolute inset-0">
          <div className="absolute inset-y-0 right-0 w-full bg-[linear-gradient(135deg,rgba(15,23,42,0.04),rgba(20,184,166,0.08))]" />
        </div>

        <div className="container relative z-10 mx-auto grid min-h-[calc(100vh-7rem)] items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)] lg:px-8">
          <div className="max-w-2xl py-10">
            <Badge className="mb-5 rounded-full border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50">
              <Film className="mr-2 h-3.5 w-3.5" />
              {landing.hero.eyebrow}
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              {landing.hero.title}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700">
              {landing.hero.subtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-lg px-6">
                <a href={`/${locale}/reelflow`} data-testid="reelflow-landing-primary-cta">
                  {landing.hero.primaryCta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-lg bg-white/70 px-6">
                <a href={`/${locale}/pricing`} data-testid="reelflow-landing-secondary-cta">
                  {landing.hero.secondaryCta}
                </a>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {landing.hero.trust.map((item: string) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-slate-900/10 bg-white/90 shadow-2xl backdrop-blur lg:rotate-[-2deg]">
              <ProductPreview landing={landing} compact />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-background py-10">
        <div className="container mx-auto grid gap-4 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          {landing.metrics.map((metric: { value: string; label: string }) => (
            <div key={metric.label} className="rounded-lg border bg-card p-4">
              <div className="text-2xl font-semibold">{metric.value}</div>
              <div className="mt-1 text-sm leading-6 text-muted-foreground">{metric.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title={landing.workflow.title} description={landing.workflow.description} />
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {landing.workflow.steps.map((step: { title: string; description: string }, index: number) => {
              const Icon = workflowIcons[index] || CheckCircle2
              return (
                <div key={step.title} className="rounded-lg border bg-card p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-y bg-[#eef7f4] py-16">
        <div className="container mx-auto grid gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <SectionHeader title={landing.templates.title} description={landing.templates.description} align="left" />
            <div className="mt-6 flex flex-wrap gap-2">
              {landing.templates.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="rounded-full bg-white text-slate-700">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {landing.templates.items.map((template: { name: string; description: string; output: string }) => (
              <div key={template.name} className="rounded-lg border bg-white p-5 shadow-sm">
                <Clapperboard className="h-5 w-5 text-emerald-700" />
                <h3 className="mt-4 font-semibold">{template.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{template.description}</p>
                <div className="mt-4 rounded-md bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700">
                  {template.output}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title={landing.tools.title} description={landing.tools.description} />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {landing.tools.items.map((tool: { title: string; description: string }, index: number) => {
              const Icon = toolIcons[index] || WandSparkles
              return (
                <div key={tool.title} className="rounded-lg border bg-card p-5">
                  <Icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-4 font-semibold">{tool.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{tool.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-t bg-slate-950 py-16 text-white">
        <div className="container mx-auto grid gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold">{landing.finalCta.title}</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">{landing.finalCta.description}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-lg bg-white px-6 text-slate-950 hover:bg-slate-200">
              <a href={`/${locale}/reelflow`}>
                {landing.finalCta.primaryCta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-lg border-white/30 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white">
              <a href={`/${locale}/pricing`}>
                {landing.finalCta.secondaryCta}
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}

function ProductPreview({ landing, compact = false }: { landing: any; compact?: boolean }) {
  return (
    <div className={compact ? 'p-4' : 'p-6'} data-testid="reelflow-landing-preview">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white">
            <Play className="h-4 w-4 fill-current" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-950">{landing.preview.title}</div>
            <div className="text-xs text-slate-500">{landing.preview.subtitle}</div>
          </div>
        </div>
        <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
          {landing.preview.status}
        </Badge>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-lg border bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-800">{landing.preview.template}</span>
            <span className="text-xs text-slate-500">{landing.preview.credits}</span>
          </div>
          <div className="mt-4 aspect-[9/16] max-h-72 rounded-lg bg-slate-950 p-3 text-white">
            <div className="flex h-full flex-col justify-between rounded-md border border-white/15 bg-[linear-gradient(180deg,#12312f,#111827)] p-4">
              <div className="space-y-2">
                <div className="h-2 w-20 rounded-full bg-emerald-300" />
                <div className="h-2 w-32 rounded-full bg-white/70" />
                <div className="h-2 w-24 rounded-full bg-white/40" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-16 rounded bg-amber-200/90" />
                <div className="h-16 rounded bg-sky-200/90" />
                <div className="h-16 rounded bg-rose-200/90" />
              </div>
              <div className="rounded bg-white/90 px-3 py-2 text-center text-xs font-medium text-slate-950">
                {landing.preview.caption}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-800">{landing.preview.progress}</span>
              <span className="text-slate-500">86%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 w-[86%] rounded-full bg-emerald-600" />
            </div>
            <div className="mt-4 space-y-3">
              {landing.preview.stages.map((stage: string, index: number) => (
                <div key={stage} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className={index < 3 ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-slate-300'} />
                  <span className={index < 3 ? 'text-slate-800' : 'text-slate-500'}>{stage}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <PreviewStat icon={<Coins className="h-4 w-4" />} label={landing.preview.costLabel} value={landing.preview.costValue} />
            <PreviewStat icon={<ShieldCheck className="h-4 w-4" />} label={landing.preview.auditLabel} value={landing.preview.auditValue} />
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  )
}

function SectionHeader({ title, description, align = 'center' }: { title: string; description: string; align?: 'left' | 'center' }) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'}>
      <h2 className="text-3xl font-semibold">{title}</h2>
      <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
    </div>
  )
}
