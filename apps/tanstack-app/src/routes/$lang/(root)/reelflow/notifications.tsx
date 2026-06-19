import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Bell, CheckCheck, CircleDollarSign, Inbox, Loader2, Mail, RefreshCw, Video } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@libs/react-shared/ui/alert'
import { Badge } from '@libs/react-shared/ui/badge'
import { Button } from '@libs/react-shared/ui/button'

export const Route = createFileRoute('/$lang/(root)/reelflow/notifications')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.notifications),
  component: ReelflowNotificationsPage,
})

type NotificationFilter = 'all' | 'unread'

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
  const { t, locale } = useTranslation()
  const [data, setData] = useState<NotificationsResponse | null>(null)
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadNotifications = async () => {
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
  }

  useEffect(() => {
    void loadNotifications()
  }, [filter])

  const formatDate = (value: string) => {
    return new Date(value).toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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
    <main className="min-h-screen bg-background" data-testid="reelflow-notifications-page">
      <section className="border-b bg-muted/20">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bell className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{data?.workspace.name || t.reelflow.common.productName}</p>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t.reelflow.notifications.title}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{t.reelflow.notifications.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadNotifications} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {t.reelflow.common.refresh}
            </Button>
            <Button onClick={markAllRead} disabled={updating || unreadCount === 0} data-testid="reelflow-notifications-mark-all-read">
              {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
              {t.reelflow.notifications.markAllRead}
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="flex flex-wrap gap-2 rounded-lg border bg-card p-4 shadow-sm">
          {(['all', 'unread'] as NotificationFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              data-testid={`reelflow-notifications-filter-${item}`}
              onClick={() => setFilter(item)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                filter === item ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.reelflow.notifications.filters[item]} · {counts[item]}
            </button>
          ))}
        </section>

        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t.reelflow.notifications.loadError}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-lg border bg-muted/40" />
            ))}
          </div>
        ) : data?.notifications.length === 0 ? (
          <section className="rounded-lg border border-dashed p-10 text-center" data-testid="reelflow-notifications-empty">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">{t.reelflow.notifications.empty}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t.reelflow.notifications.emptyHint}</p>
          </section>
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

  const Icon = item.type.includes('credit') ? CircleDollarSign : item.type.includes('job') ? Video : Bell
  const typeText = (t.reelflow.notifications.types as Record<string, string>)[item.type] || item.type
  const emailStatusText = emailDelivery
    ? (t.reelflow.notifications.deliveryStatus as Record<string, string>)[emailDelivery.status] || emailDelivery.status
    : t.reelflow.notifications.noEmailDelivery

  return (
    <article
      className={`rounded-lg border bg-card p-5 shadow-sm ${unread ? 'border-primary/40' : ''}`}
      data-testid={`reelflow-notification-${item.type}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className={unread ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground' : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={unread ? 'default' : 'secondary'}>{unread ? t.reelflow.notifications.unread : t.reelflow.notifications.read}</Badge>
              <Badge variant="outline">{typeText}</Badge>
              <span className="text-sm text-muted-foreground">{formatDate(item.createdAt)}</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold">{item.title}</h2>
            {item.body && <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span>{emailStatusText}</span>
              {emailDelivery?.recipient && <span className="truncate">{emailDelivery.recipient}</span>}
            </div>
          </div>
        </div>
        {href && (
          <Button variant="outline" size="sm" asChild data-testid={`reelflow-notification-open-${item.type}`}>
            <a href={href}>{t.reelflow.notifications.openTarget}</a>
          </Button>
        )}
      </div>
    </article>
  )
}
