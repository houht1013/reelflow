import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, CheckCheck, CircleDollarSign, Gift, Loader2, Video } from 'lucide-react'

type ReelflowNotification = {
  id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
}

type NotificationsResponse = {
  unreadCount: number
  notifications: ReelflowNotification[]
}

type Tab = 'all' | 'unread' | 'read'

/** Task-execution notifications vs. platform notices. */
function categoryOf(type: string): 'task' | 'platform' {
  return type.startsWith('job') || type === 'asset_ready' ? 'task' : 'platform'
}

function iconOf(type: string) {
  if (type.startsWith('job') || type === 'asset_ready') return Video
  if (type.includes('credit')) return CircleDollarSign
  if (type.includes('invite')) return Gift
  return Bell
}

/** Localized, safe title/body from type + data (stored values are server English). */
function resolveContent(item: ReelflowNotification, t: any): { title: string; body: string | null } {
  const messages = t.reelflow.notifications.messages as (Record<string, { title: string; body: string }> & { fallbackName: string }) | undefined
  const tpl = messages?.[item.type] as { title: string; body: string } | undefined
  if (!messages || !tpl) return { title: item.title, body: item.body }
  const data = item.data ?? {}
  const name = typeof data.templateName === 'string' && data.templateName ? data.templateName : messages.fallbackName
  const amount = (data.amount ?? data.debtCredits ?? data.actualCredits ?? '') as string | number
  const fill = (s: string) => s.replace('{name}', String(name)).replace('{amount}', String(amount))
  return { title: fill(tpl.title), body: fill(tpl.body) }
}

export function ReelflowNotificationsBell({ locale, t }: { locale: string; t: any }) {
  const navigate = useNavigate()
  const n = t.reelflow.notifications
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('all')
  const [data, setData] = useState<NotificationsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reelflow/notifications?limit=50')
      const payload = await res.json()
      if (res.ok) setData(payload)
    } catch {
      // best-effort; badge stays as-is
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Refresh the badge when a job/credit change is broadcast, and on a slow poll.
  useEffect(() => {
    const handler = () => void load()
    window.addEventListener('reelflow:credits-changed', handler)
    const timer = window.setInterval(() => void load(), 60000)
    return () => {
      window.removeEventListener('reelflow:credits-changed', handler)
      window.clearInterval(timer)
    }
  }, [load])

  // Reload fresh data each time the panel opens.
  useEffect(() => {
    if (open) void load()
  }, [open, load])

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const all = data?.notifications ?? []
  const unreadCount = data?.unreadCount ?? all.filter((i) => !i.readAt).length
  const items = useMemo(() => {
    if (tab === 'unread') return all.filter((i) => !i.readAt)
    if (tab === 'read') return all.filter((i) => i.readAt)
    return all
  }, [all, tab])

  const markRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    setData((prev) => (prev ? { ...prev, notifications: prev.notifications.map((i) => (ids.includes(i.id) ? { ...i, readAt: new Date().toISOString() } : i)), unreadCount: Math.max(0, prev.unreadCount - ids.length) } : prev))
    try {
      await fetch('/api/reelflow/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_read', ids }) })
    } catch {
      void load()
    }
  }, [load])

  const markAllRead = useCallback(async () => {
    setUpdating(true)
    setData((prev) => (prev ? { ...prev, notifications: prev.notifications.map((i) => (i.readAt ? i : { ...i, readAt: new Date().toISOString() })), unreadCount: 0 } : prev))
    try {
      await fetch('/api/reelflow/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_all_read' }) })
    } catch {
      void load()
    } finally {
      setUpdating(false)
    }
  }, [load])

  const onItemClick = useCallback(
    (item: ReelflowNotification) => {
      if (!item.readAt) void markRead([item.id])
      const targetUrl = typeof item.data?.targetUrl === 'string' ? item.data.targetUrl : null
      const jobId = targetUrl?.match(/^\/reelflow\/jobs\/([^/?#]+)/)?.[1] ?? null
      if (jobId) {
        setOpen(false)
        void navigate({ to: '/$lang/reelflow/jobs/$id', params: { lang: locale, id: jobId } })
      } else if (targetUrl) {
        setOpen(false)
        window.location.href = `/${locale}${targetUrl}`
      }
    },
    [markRead, navigate, locale],
  )

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: n.filters.all },
    { key: 'unread', label: n.filters.unread },
    { key: 'read', label: n.filters.read },
  ]

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={n.panel}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/70 text-muted-foreground shadow-xs backdrop-blur transition-colors hover:border-primary/40 hover:text-foreground"
        data-testid="reelflow-notifications-bell"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="reelflow-surface absolute right-0 top-11 z-50 w-[360px] overflow-hidden rounded-xl border border-border bg-card shadow-lg sm:w-[400px]">
          <div className="flex items-center justify-between gap-2 px-4 py-3 shadow-[inset_0_-1px_0_var(--reelflow-hairline)]">
            <span className="reelflow-display text-sm">{n.panel}</span>
            <button
              type="button"
              onClick={markAllRead}
              disabled={updating || unreadCount === 0}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              data-testid="reelflow-notifications-mark-all"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {n.markAllRead}
            </button>
          </div>

          <div className="flex items-center gap-1 px-3 py-2 shadow-[inset_0_-1px_0_var(--reelflow-hairline)]">
            {tabs.map((tb) => (
              <button
                key={tb.key}
                type="button"
                onClick={() => setTab(tb.key)}
                className={[
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  tab === tb.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                ].join(' ')}
              >
                {tb.label}
                {tb.key === 'unread' && unreadCount > 0 ? ` ${unreadCount}` : ''}
              </button>
            ))}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && all.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-muted-foreground">{n.empty}</p>
                <p className="mt-1 text-xs text-muted-foreground/70">{n.emptyHint}</p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--reelflow-hairline)]">
                {items.map((item) => {
                  const unread = !item.readAt
                  const category = categoryOf(item.type)
                  const Icon = iconOf(item.type)
                  const content = resolveContent(item, t)
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onItemClick(item)}
                        className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
                        data-testid={`reelflow-notification-${item.type}`}
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="reelflow-pill shrink-0" data-tone={category === 'task' ? 'info' : 'neutral'}>{n.categories[category]}</span>
                            {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" aria-hidden="true" />}
                            <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{formatDate(item.createdAt)}</span>
                          </span>
                          <span className={`mt-1.5 block truncate text-sm ${unread ? 'font-semibold' : 'font-medium'}`}>{content.title}</span>
                          {content.body && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{content.body}</span>}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
