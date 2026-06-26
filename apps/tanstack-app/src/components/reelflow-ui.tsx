import type { ReactNode } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Film,
  Lightbulb,
  Loader2,
  MessageSquare,
  MinusCircle,
  Smile,
  type LucideIcon,
} from 'lucide-react'

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand'

/**
 * Maps a template category to a consistent accent colour + icon, used for cover
 * fallbacks and task-row chips so the same template reads the same everywhere.
 */
export function categoryVisual(category?: string | null): { color: string; icon: LucideIcon } {
  switch (category) {
    case '情绪价值':
      return { color: 'var(--reelflow-coral)', icon: Smile }
    case '知识科普':
      return { color: 'var(--reelflow-blue)', icon: Lightbulb }
    case '观点口播':
      return { color: 'var(--reelflow-violet)', icon: MessageSquare }
    default:
      return { color: 'var(--reelflow-coral)', icon: Film }
  }
}

/**
 * Maps a Reelflow status/quality/artifact/settlement code to a visual tone
 * plus an icon. Status is always expressed with text + shape + colour, never
 * colour alone (design system §11.5).
 */
export function statusToTone(status: string): { tone: Tone; icon: LucideIcon; pulse?: boolean } {
  switch (status) {
    case 'failed':
    case 'canceled':
    case 'cancelled':
    case 'debt':
    case 'needs_fix':
    case 'blocked':
      return { tone: 'danger', icon: AlertCircle }
    case 'completed':
    case 'downloadable':
    case 'accepted':
    case 'settled':
    case 'available':
    case 'ready':
    case 'done':
    case 'succeeded':
      return { tone: 'success', icon: CheckCircle2 }
    case 'queued':
    case 'pending':
    case 'frozen':
    case 'needs_review':
      return { tone: 'warning', icon: Clock3 }
    case 'running':
    case 'generating':
    case 'processing':
    case 'in_progress':
      return { tone: 'info', icon: Loader2, pulse: true }
    case 'skipped':
      return { tone: 'neutral', icon: MinusCircle }
    case 'not_started':
    case 'idle':
      return { tone: 'neutral', icon: CircleDashed }
    default:
      return { tone: 'neutral', icon: CircleDashed }
  }
}

export function StatusPill({
  status,
  label,
  pulse,
}: {
  status: string
  label: string
  pulse?: boolean
}) {
  const { tone, icon: Icon, pulse: autoPulse } = statusToTone(status)
  const spin = tone === 'info'
  return (
    <span className="reelflow-pill" data-tone={tone} data-pulse={pulse ?? autoPulse ? 'true' : undefined} data-status={status}>
      <Icon className={spin ? 'animate-spin' : ''} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  )
}

/** Standalone tone pill (no status mapping) for ad-hoc labels. */
export function TonePill({ tone, icon: Icon, children }: { tone: Tone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span className="reelflow-pill" data-tone={tone}>
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </span>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="reelflow-reveal flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && <span className="reelflow-eyebrow">{eyebrow}</span>}
        <h1 className="reelflow-display mt-3 text-[1.9rem] leading-[1.1] sm:text-[2.2rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon?: LucideIcon
  label: string
  value: ReactNode
  tone?: 'amber' | 'blue' | 'green' | 'coral'
  hint?: string
}) {
  const color =
    tone === 'amber'
      ? 'var(--reelflow-amber)'
      : tone === 'blue'
        ? 'var(--reelflow-blue)'
        : tone === 'green'
          ? 'var(--reelflow-green)'
          : tone === 'coral'
            ? 'var(--reelflow-coral)'
            : 'var(--foreground)'
  return (
    <div className="reelflow-muted-tile p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="reelflow-display reelflow-num mt-2 text-2xl" style={{ color }}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="reelflow-panel reelflow-reveal flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="reelflow-display mt-5 text-xl">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function SkeletonRows({ count = 4, className = 'h-20' }: { count?: number; className?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`reelflow-skeleton ${className}`} />
      ))}
    </div>
  )
}
