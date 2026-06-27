import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authClientReact } from '@libs/auth/authClient'
import { Avatar, AvatarFallback, AvatarImage } from '@libs/react-shared/ui/avatar'
import { Dialog, DialogContent, DialogTitle } from '@libs/react-shared/ui/dialog'
import { Button } from '@libs/react-shared/ui/button'
import {
  Archive,
  Bell,
  ChevronRight,
  Coins,
  CreditCard,
  Gift,
  Home,
  ImageIcon,
  Layers3,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mic2,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  UserRound,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { BrandMark } from '@/components/brand-mark'
import { useTranslation } from '@/hooks/use-translation'
import { toast } from 'sonner'

type ShellProps = {
  children: ReactNode
}

type CreditSummary = {
  balance: number
  frozenBalance: number
  debtBalance: number
}

type ShellRouteTo =
  | '/$lang/reelflow'
  | '/$lang/reelflow/draft'
  | '/$lang/reelflow/image'
  | '/$lang/reelflow/voice'
  | '/$lang/reelflow/jobs'
  | '/$lang/reelflow/templates'
  | '/$lang/reelflow/assets'
  | '/$lang/reelflow/credits'
  | '/$lang/reelflow/invites'
  | '/$lang/reelflow/notifications'
  | '/$lang/pricing'

export function ReelflowShell({ children }: ShellProps) {
  const { t, locale } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [credits, setCredits] = useState<CreditSummary | null>(null)
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const [claimingInviteCode, setClaimingInviteCode] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [creationExpanded, setCreationExpanded] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'profile' | 'subscription' | 'general'>('profile')
  const { data: session } = authClientReact.useSession()
  const user = session?.user

  useEffect(() => {
    if (typeof window === 'undefined') return
    setSidebarCollapsed(window.localStorage.getItem('reelflow.sidebarCollapsed') === 'true')
    setCreationExpanded(window.localStorage.getItem('reelflow.creationExpanded') !== 'false')
  }, [])

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('reelflow.sidebarCollapsed', String(next))
      }
      return next
    })
  }

  const toggleCreation = () => {
    setCreationExpanded((current) => {
      const next = !current
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('reelflow.creationExpanded', String(next))
      }
      return next
    })
  }

  const loadCredits = useCallback(async () => {
    try {
      const response = await fetch('/api/reelflow/credits')
      const payload = await response.json()
      if (!response.ok) return
      if (payload?.account) {
        setCredits({
          balance: Number(payload.account.balance || 0),
          frozenBalance: Number(payload.account.frozenBalance || 0),
          debtBalance: Number(payload.account.debtBalance || 0),
        })
      }
    } catch {
      // Header credits are a convenience; page-level errors handle recovery.
    }
  }, [])

  // Refresh the header balance on mount, on navigation, and whenever a tool
  // reports a credit change via the shared `reelflow:credits-changed` event.
  useEffect(() => {
    void loadCredits()
  }, [loadCredits, location.pathname])

  // Subscription state drives the sidebar label (开通订阅 vs 订阅).
  useEffect(() => {
    let alive = true
    fetch('/api/subscription/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setHasSubscription(Boolean(d.hasSubscription || d.isLifetime))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => void loadCredits()
    window.addEventListener('reelflow:credits-changed', handler)
    return () => window.removeEventListener('reelflow:credits-changed', handler)
  }, [loadCredits])

  useEffect(() => {
    if (!user || claimingInviteCode || typeof window === 'undefined') return
    const pendingInviteCode = window.localStorage.getItem('reelflow.pendingInviteCode')
    if (!pendingInviteCode) return

    setClaimingInviteCode(true)
    fetch('/api/reelflow/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: pendingInviteCode }),
    })
      .then((response) => response.json())
      .then((payload) => {
        if (['rewarded', 'already_claimed', 'self_invite', 'invalid_code'].includes(payload.status)) {
          window.localStorage.removeItem('reelflow.pendingInviteCode')
        }
        if (payload.status === 'rewarded') {
          toast.success(t.reelflow.invites.claimed, {
            description: t.reelflow.invites.claimedDescription,
          })
        }
      })
      .catch((error) => {
        console.error('Failed to claim pending Reelflow invite:', error)
      })
      .finally(() => setClaimingInviteCode(false))
  }, [claimingInviteCode, t.reelflow.invites.claimed, t.reelflow.invites.claimedDescription, user])

  const handleSignOut = async () => {
    await authClientReact.signOut()
    navigate({ to: `/${locale}` })
  }

  const shell = t.reelflow.shell
  const pathname = location.pathname

  const creditLabel = useMemo(() => {
    if (!credits) return shell.loadingCredits
    return `${formatNumber(credits.balance, locale)} ${t.reelflow.common.credits}`
  }, [credits, locale, shell.loadingCredits, t.reelflow.common.credits])

  return (
    <div className="reelflow-app min-h-dvh bg-background text-foreground">
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 hidden border-r border-sidebar-border/55 bg-sidebar/88 px-3 py-4 shadow-[12px_0_40px_-36px_oklch(0.28_0.02_265_/_36%)] backdrop-blur-xl transition-[width] duration-200 lg:flex lg:flex-col',
          sidebarCollapsed ? 'w-20' : 'w-[15.5rem]',
        ].join(' ')}
        data-collapsed={sidebarCollapsed}
      >
        <div
          className={[
            'mb-5 flex px-1',
            sidebarCollapsed ? 'justify-center' : 'items-center justify-between gap-2',
          ].join(' ')}
        >
          {!sidebarCollapsed && (
            <Link
              to="/$lang/reelflow"
              params={{ lang: locale }}
              activeOptions={{ exact: true }}
              className="flex min-w-0 items-center gap-3"
              aria-label="Reelflow"
            >
              <BrandMark className="h-11 w-11 shrink-0" fallbackIconClassName="h-6 w-6" />
              <span className="reelflow-display min-w-0 truncate text-[1.15rem]">Reelflow</span>
            </Link>
          )}

          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? shell.expandSidebar : shell.collapseSidebar}
            title={sidebarCollapsed ? shell.expandSidebar : shell.collapseSidebar}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>

        <nav className="reelflow-sidebar-nav flex-1 space-y-5 overflow-y-auto pb-4">
          <NavGroup collapsed={sidebarCollapsed}>
            <ShellLink icon={Home} label={shell.nav.home} to="/$lang/reelflow" lang={locale} active={isActive(pathname, `/${locale}/reelflow`, true)} collapsed={sidebarCollapsed} />
            <ShellDisclosure
              id="reelflow-creation-nav"
              icon={Sparkles}
              label={shell.nav.create}
              expanded={creationExpanded}
              onToggle={toggleCreation}
              collapsed={sidebarCollapsed}
              active={isCreationActive(pathname)}
            >
              <ShellLink icon={Layers3} label={shell.nav.templates} to="/$lang/reelflow/templates" lang={locale} active={pathname.includes('/reelflow/templates') || pathname.includes('/reelflow/draft')} collapsed={sidebarCollapsed} child />
              <ShellLink icon={ImageIcon} label={shell.nav.image} to="/$lang/reelflow/image" lang={locale} active={pathname.includes('/reelflow/image')} collapsed={sidebarCollapsed} child />
              <ShellLink icon={Video} label={shell.nav.video} to="/$lang/reelflow/draft" lang={locale} active={false} meta={shell.comingSoon} collapsed={sidebarCollapsed} child disabled />
              <ShellLink icon={Mic2} label={shell.nav.voice} to="/$lang/reelflow/voice" lang={locale} active={pathname.includes('/reelflow/voice')} collapsed={sidebarCollapsed} child />
            </ShellDisclosure>
            <ShellLink icon={ListChecks} label={shell.nav.tasks} to="/$lang/reelflow/jobs" lang={locale} active={pathname.includes('/reelflow/jobs')} collapsed={sidebarCollapsed} />
            <ShellLink icon={Archive} label={shell.nav.assets} to="/$lang/reelflow/assets" lang={locale} active={pathname.includes('/reelflow/assets')} collapsed={sidebarCollapsed} />
          </NavGroup>

          <NavGroup label={shell.groups.account} collapsed={sidebarCollapsed}>
            <ShellLink icon={Coins} label={shell.nav.credits} to="/$lang/reelflow/credits" lang={locale} active={pathname.includes('/reelflow/credits')} collapsed={sidebarCollapsed} />
            <ShellLink icon={CreditCard} label={hasSubscription ? shell.nav.subscription : shell.nav.subscribeCta} to="/$lang/pricing" lang={locale} active={false} collapsed={sidebarCollapsed} newTab />
            <ShellLink icon={Gift} label={shell.nav.invites} subtext={shell.nav.invitesHint} to="/$lang/reelflow/invites" lang={locale} active={pathname.includes('/reelflow/invites')} collapsed={sidebarCollapsed} accent />
            <ShellLink icon={Bell} label={shell.nav.notifications} to="/$lang/reelflow/notifications" lang={locale} active={pathname.includes('/reelflow/notifications')} collapsed={sidebarCollapsed} />
          </NavGroup>
        </nav>

        {user && (
          <div className="mt-2 border-t border-sidebar-border/45 px-1 pt-2">
            <button
              type="button"
              onClick={() => {
                setSettingsTab('profile')
                setSettingsOpen(true)
              }}
              aria-label={shell.userMenu}
              className={['reelflow-shell-link w-full', sidebarCollapsed ? 'justify-center px-0' : ''].join(' ')}
            >
              <Avatar className="h-8 w-8 shrink-0 border border-sidebar-border/50">
                <AvatarImage src={user.image || ''} alt={user.name || user.email || 'User'} />
                <AvatarFallback className="text-xs">{user.name?.charAt(0) || user.email?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              {!sidebarCollapsed && (
                <>
                  <span className="min-w-0 flex-1 truncate text-left">{user.name || user.email}</span>
                  <Settings className="h-4 w-4 shrink-0 text-sidebar-foreground/40" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        )}
      </aside>

      <div className={['flex min-h-dvh flex-col transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-[15.5rem]'].join(' ')}>
        <header className="sticky top-0 z-30 border-b border-border/35 bg-background/72 shadow-[0_1px_0_oklch(1_0_0_/_35%)] backdrop-blur-xl">
          <div className="flex h-[3.75rem] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                to="/$lang/reelflow"
                params={{ lang: locale }}
                activeOptions={{ exact: true }}
                aria-label="Reelflow"
                className="lg:hidden"
              >
                <BrandMark className="h-10 w-10" fallbackIconClassName="h-5 w-5" />
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/$lang/reelflow/credits"
                params={{ lang: locale }}
                activeOptions={{ exact: true }}
                className="flex h-9 items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 text-sm font-medium shadow-xs backdrop-blur transition-colors hover:border-primary/40 hover:bg-card"
              >
                <Coins className="h-4 w-4" style={{ color: 'var(--reelflow-amber)' }} aria-hidden="true" />
                <span className="reelflow-num">{creditLabel}</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>

      {user && (
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0 sm:max-w-5xl">
            <div className="flex min-h-[560px] flex-col sm:flex-row">
              <div className="shrink-0 border-b border-border/60 bg-muted/30 p-4 sm:w-60 sm:border-b-0 sm:border-r">
                <DialogTitle className="px-2 pb-3 text-base">{shell.settings.title}</DialogTitle>
                <nav className="flex gap-1 sm:flex-col">
                  {(
                    [
                      { key: 'profile', label: shell.settings.tabs.profile, icon: UserRound },
                      { key: 'subscription', label: shell.settings.tabs.subscription, icon: CreditCard },
                      { key: 'general', label: shell.settings.tabs.general, icon: Settings },
                    ] as const
                  ).map((tab) => {
                    const TabIcon = tab.icon
                    const active = settingsTab === tab.key
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setSettingsTab(tab.key)}
                        className={[
                          'flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex-none',
                          active
                            ? 'bg-background text-foreground shadow-xs'
                            : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                        ].join(' ')}
                      >
                        <TabIcon className="h-4 w-4" aria-hidden="true" />
                        {tab.label}
                      </button>
                    )
                  })}
                </nav>
              </div>

              <div className="flex-1 p-6">
                {settingsTab === 'profile' && (
                  <div className="space-y-3">
                    <div className="reelflow-muted-tile flex items-center gap-4 p-4">
                      <Avatar className="h-14 w-14 border border-border">
                        <AvatarImage src={user.image || ''} alt={user.name || user.email || 'User'} />
                        <AvatarFallback className="text-base">{user.name?.charAt(0) || user.email?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">{user.name || 'User'}</p>
                        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="reelflow-muted-tile flex w-full items-center justify-center gap-2 p-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      {shell.signOut}
                    </button>
                  </div>
                )}

                {settingsTab === 'subscription' && (
                  <div className="reelflow-muted-tile flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{shell.settings.planLabel}</p>
                      <p className="mt-0.5 text-base font-semibold">{shell.settings.freePlan}</p>
                    </div>
                    <Button asChild>
                      <a href={`/${locale}/pricing`} target="_blank" rel="noopener noreferrer">
                        {shell.settings.viewPlans}
                      </a>
                    </Button>
                  </div>
                )}

                {settingsTab === 'general' && (
                  <div className="space-y-3">
                    <div className="reelflow-muted-tile flex items-center justify-between p-4">
                      <span className="text-sm font-medium">{shell.theme}</span>
                      <ThemeToggle />
                    </div>
                    {user.role === 'admin' && (
                      <Link
                        to="/$lang/admin/reelflow"
                        params={{ lang: locale }}
                        onClick={() => setSettingsOpen(false)}
                        className="reelflow-muted-tile flex items-center justify-between p-4 text-sm font-medium transition-colors hover:bg-muted"
                      >
                        <span className="flex items-center gap-2">
                          <LayoutDashboard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          {shell.nav.admin}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function NavGroup({ label, children, collapsed }: { label?: string; children: ReactNode; collapsed: boolean }) {
  return (
    <div>
      {collapsed && label ? (
        <div className="mx-auto mb-2 h-px w-8 bg-sidebar-border" aria-hidden="true" />
      ) : label ? (
        <p className="mb-2 px-3 text-xs font-medium text-sidebar-foreground/45">{label}</p>
      ) : null}
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function ShellLink({
  icon: Icon,
  label,
  to,
  lang,
  active,
  meta,
  collapsed,
  child = false,
  disabled = false,
  newTab = false,
  accent = false,
  subtext,
}: {
  icon: LucideIcon
  label: string
  to: ShellRouteTo
  lang: string
  active: boolean
  meta?: string
  collapsed: boolean
  child?: boolean
  disabled?: boolean
  newTab?: boolean
  accent?: boolean
  subtext?: string
}) {
  const className = [
    'reelflow-shell-link',
    collapsed ? 'justify-center px-0' : '',
    child && !collapsed ? 'text-sidebar-foreground/62' : '',
    disabled ? 'cursor-not-allowed opacity-55 hover:bg-transparent hover:text-sidebar-foreground/70' : '',
  ].join(' ')
  // Inline style wins over the base .reelflow-shell-link px-3, so the second-level
  // indent actually applies (utility classes lose to the base class by source order).
  const indentStyle = child && !collapsed ? { paddingLeft: '2.5rem' } : undefined

  const content = (
    <>
      <Icon className={['h-[18px] w-[18px] shrink-0', accent ? 'reelflow-shell-accent-icon' : ''].join(' ')} aria-hidden="true" />
      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span className={['block truncate', accent ? 'reelflow-shell-accent font-semibold' : ''].join(' ')}>{label}</span>
          {subtext && <span className="mt-0.5 block truncate text-[10px] font-normal leading-tight text-sidebar-foreground/45">{subtext}</span>}
        </span>
      )}
      {!collapsed && meta && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{meta}</span>}
    </>
  )

  if (disabled) {
    return (
      <span
        className={className}
        style={indentStyle}
        data-active={active}
        aria-label={label}
        aria-disabled="true"
        title={collapsed ? label : undefined}
      >
        {content}
      </span>
    )
  }

  if (newTab) {
    return (
      <a
        href={to.replace('$lang', lang)}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={indentStyle}
        data-active={active}
        aria-label={label}
        title={collapsed ? label : undefined}
      >
        {content}
      </a>
    )
  }

  return (
    <Link
      to={to}
      params={{ lang }}
      activeOptions={{ exact: true }}
      className={className}
      style={indentStyle}
      data-active={active}
      aria-label={label}
      title={collapsed ? label : undefined}
    >
      {content}
    </Link>
  )
}

function ShellDisclosure({
  id,
  icon: Icon,
  label,
  expanded,
  onToggle,
  collapsed,
  active,
  children,
}: {
  id: string
  icon: LucideIcon
  label: string
  expanded: boolean
  onToggle: () => void
  collapsed: boolean
  active: boolean
  children: ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        className={['reelflow-shell-link w-full', collapsed ? 'justify-center px-0' : ''].join(' ')}
        data-active={active && collapsed}
        data-section-active={active || undefined}
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={id}
        aria-label={label}
        title={collapsed ? label : undefined}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        {!collapsed && <span className="min-w-0 flex-1 truncate text-left">{label}</span>}
        {!collapsed && (
          <span className={['text-sidebar-foreground/45 transition-transform', expanded ? 'rotate-90' : ''].join(' ')}>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        )}
      </button>
      {expanded && (
        <div id={id} className="mt-1 space-y-1">
          {children}
        </div>
      )}
    </div>
  )
}

function isActive(pathname: string, href: string, exact = false) {
  return exact ? pathname === href : pathname.startsWith(href)
}

function isCreationActive(pathname: string) {
  return (
    pathname.includes('/reelflow/templates') ||
    pathname.includes('/reelflow/draft') ||
    pathname.includes('/reelflow/image') ||
    pathname.includes('/reelflow/voice')
  )
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(value)
}
