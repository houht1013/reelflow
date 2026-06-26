import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Bell, CheckCheck, CircleDollarSign, Inbox, Loader2, Mail, RefreshCw, Video, type LucideIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Button } from '@libs/react-shared/ui/button'
import { EmptyState, PageHeader, SkeletonRows, TonePill } from '@/components/reelflow-ui'

const notificationFilters = ['all', 'unread'] as const
type NotificationFilter = (typeof notificationFilters)[number]

export const Route = createFileRoute('/$lang/(root)/reelflow/notifications')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  validateSearch: (search: Record<string, unknown>) => {
    const filter = search.filter
    return filter === 'unread' ? { filter: 'unread' as const } : {}
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.notifications),
  component: ReelflowNotificationsPage,
})

type ReelflowNotification = {
  id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
  deliveries: Array<{
    notificationId: string
    channel: string
    status: string
    recipient: string
    provider: string | null
    sentAt: string | null
  }>
}

type NotificationsResponse = {
  workspace: { id: string; name: string }
  unreadCount: number
  notifications: ReelflowNotification[]
}

function ReelflowNotificationsPage() {
  const navigate = useNavigate()
  const { t, locale } = useTranslation()
  const { filter: routeFilter } = Route.useSearch()
  const filter: NotificationFilter = routeFilter === 'unread' ? 'unread' : 'all'
  const [data, setData] = useState<NotificationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filter === 'unread') params.set('status', 'unread')
      const response = await fetch(`/api/reelflow/notifications?${params.toString()}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || t.reelflow.notifications.loadError)
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.reelflow.notifications.loadError)
    } finally {
      setLoading(false)
    }
  }, [filter, t.reelflow.notifications.loadError])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  const updateFilter = (nextFilter: NotificationFilter) => {
    void navigate({
      to: '/$lang/reelflow/notifications',
      params: { lang: locale },
      search: nextFilter === 'unread' ? { filter: nextFilter } : {},
      replace: true,
    })
  }

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }), [locale])

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US'), [locale])

  const formatDate = (value: string) => dateFormatter.format(new Date(value))
  const formatCount = (value: number) => numberFormatter.format(value)

  const markAllRead = async () => {
    setUpdating(true)
    try {
      const response = await fetch('/api/reelflow/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || t.reelflow.notifications.updateError)
      toast.success(t.reelflow.notifications.markedRead)
      await loadNotifications()
    } catch (err) {
      toast.error(t.reelflow.notifications.updateError, {
        description: err instanceof Error ? err.message : t.reelflow.notifications.updateError,
      })
    } finally {
      setUpdating(false)
    }
  }

  const unreadCount = data?.unreadCount || 0
  const visibleCount = data?.notifications.length || 0
  const counts = useMemo(() => ({ all: visibleCount, unread: unreadCount }), [visibleCount, unreadCount])

  return (
    <main className="min-h-screen" data-testid="reelflow-notifications-page">
      <div className="container mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow={t.reelflow.shell.workspaceName}
          title={t.reelflow.notifications.title}
          description={t.reelflow.notifications.description}
          actions={
            <>
              <Button type="button" variant="outline" onClick={loadNotifications} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />}
                {t.reelflow.common.refresh}
              </Button>
              <Button type="button" onClick={markAllRead} disabled={updating || unreadCount === 0} data-testid="reelflow-notifications-mark-all-read">
                {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCheck className="mr-2 h-4 w-4" aria-hidden="true" />}
                {t.reelflow.notifications.markAllRead}
              </Button>
            </>
          }
        />

        <section className="grid gap-3 md:grid-cols-2">
          {notificationFilters.map((item) => (
            <NotificationFilterCard
              key={item}
              filter={item}
              active={filter === item}
              label={t.reelflow.notifications.filters[item]}
              count={formatCount(counts[item])}
              onClick={() => updateFilter(item)}
            />
          ))}
        </section>

        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{t.reelflow.notifications.loadError}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading ? (
          <SkeletonRows count={3} className="h-32" />
        ) : data?.notifications.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t.reelflow.notifications.empty}
            description={t.reelflow.notifications.emptyHint}
          />
        ) : (
          <section className="space-y-3">
            {data?.notifications.map((item) => (
              <NotificationCard key={item.id} item={item} formatDate={formatDate} locale={locale} t={t} />
            ))}
          </section>
        )}
      </div>
    </main>
  )
}

function NotificationFilterCard({
  filter,
  active,
  label,
  count,
  onClick,
}: {
  filter: NotificationFilter
  active: boolean
  label: string
  count: string
  onClick: () => void
}) {
  const Icon: LucideIcon = filter === 'unread' ? Bell : Inbox
  return (
    <button
      type="button"
      data-testid={`reelflow-notifications-filter-${filter}`}
      onClick={onClick}
      aria-pressed={active}
      className={[
        'reelflow-muted-tile group min-w-0 px-4 py-3 text-left transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-background/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        active ? 'shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--reelflow-coral)_42%,transparent),0_14px_34px_-30px_var(--reelflow-coral)]' : '',
      ].join(' ')}
    >
      <span className="flex items-center justify-between gap-4">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className={['flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', active ? 'bg-primary text-primary-foreground' : 'bg-background/70 text-muted-foreground ring-1 ring-border/45'].join(' ')}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="truncate text-sm font-medium">{label}</span>
        </span>
        <span className="reelflow-display reelflow-num text-2xl">{count}</span>
      </span>
    </button>
  )
}

function NotificationCard({
  item,
  formatDate,
  locale,
  t,
}: {
  item: ReelflowNotification
  formatDate: (value: string) => string
  locale: string
  t: any
}) {
  const unread = !item.readAt
  const emailDelivery = item.deliveries.find((delivery) => delivery.channel === 'email')
  const targetUrl = typeof item.data?.targetUrl === 'string' ? item.data.targetUrl : null
  const href = targetUrl ? `/${locale}${targetUrl}` : null
  const jobId = targetUrl?.match(/^\/reelflow\/jobs\/([^/?#]+)/)?.[1] ?? null

  const Icon = item.type.includes('credit') ? CircleDollarSign : item.type.includes('job') ? Video : Bell
  const typeText = (t.reelflow.notifications.types as Record<string, string>)[item.type] || item.type
  // Localize title/body at render time from type + data. The stored title/body
  // are server-generated (English, and may contain raw provider errors), so we
  // never render them directly on this user-facing page — only as a last resort
  // fallback for unknown types.
  const content = resolveNotificationContent(item, t)
  const emailStatusText = emailDelivery
    ? (t.reelflow.notifications.deliveryStatus as Record<string, string>)[emailDelivery.status] || emailDelivery.status
    : t.reelflow.notifications.noEmailDelivery
  const emailTone = deliveryTone(emailDelivery?.status)

  return (
    <article
      className="reelflow-soft-tile overflow-hidden"
      data-testid={`reelflow-notification-${item.type}`}
    >
      <div className={unread ? 'h-1 bg-primary' : 'h-1 bg-transparent'} />
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className={unread ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_14px_28px_-20px_var(--primary)]' : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border/45'}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <TonePill tone={unread ? 'brand' : 'neutral'}>{unread ? t.reelflow.notifications.unread : t.reelflow.notifications.read}</TonePill>
              <TonePill tone="neutral">{typeText}</TonePill>
              <span className="text-sm text-muted-foreground">{formatDate(item.createdAt)}</span>
            </div>
            <h2 className="mt-3 line-clamp-2 text-lg font-semibold">{content.title}</h2>
            {content.body && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{content.body}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <TonePill tone={emailTone} icon={Mail}>{emailStatusText}</TonePill>
              {emailDelivery?.recipient && <span className="truncate">{emailDelivery.recipient}</span>}
            </div>
          </div>
        </div>
        <div className="shrink-0">
          {jobId ? (
            <Button variant="outline" size="sm" asChild data-testid={`reelflow-notification-open-${item.type}`}>
              <Link to="/$lang/reelflow/jobs/$id" params={{ lang: locale, id: jobId }}>{t.reelflow.notifications.openTarget}</Link>
            </Button>
          ) : href && (
            <Button variant="outline" size="sm" asChild data-testid={`reelflow-notification-open-${item.type}`}>
              <a href={href}>{t.reelflow.notifications.openTarget}</a>
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

// Build a localized, safe title/body for a notification from its type + data.
// Falls back to the stored values only for unmapped types.
function resolveNotificationContent(item: ReelflowNotification, t: any): { title: string; body: string | null } {
  const messages = t.reelflow.notifications.messages as
    | (Record<string, { title: string; body: string }> & { fallbackName: string })
    | undefined
  const tpl = messages?.[item.type as keyof typeof messages] as { title: string; body: string } | undefined
  if (!messages || !tpl) {
    return { title: item.title, body: item.body }
  }
  const data = item.data ?? {}
  const name = typeof data.templateName === 'string' && data.templateName ? data.templateName : messages.fallbackName
  const amountRaw = data.amount ?? data.debtCredits ?? data.actualCredits ?? ''
  const fill = (s: string) => s.replace('{name}', String(name)).replace('{amount}', String(amountRaw))
  return { title: fill(tpl.title), body: fill(tpl.body) }
}

function deliveryTone(status?: string): 'neutral' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'sent':
      return 'success'
    case 'pending':
      return 'warning'
    case 'failed':
      return 'danger'
    default:
      return 'neutral'
  }
}
