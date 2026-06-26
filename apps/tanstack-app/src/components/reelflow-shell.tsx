import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authClientReact } from '@libs/auth/authClient'
import { Avatar, AvatarFallback, AvatarImage } from '@libs/react-shared/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@libs/react-shared/ui/dropdown-menu'
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
  const [claimingInviteCode, setClaimingInviteCode] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [creationExpanded, setCreationExpanded] = useState(true)
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
          sidebarCollapsed ? 'w-20' : 'w-[17rem]',
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
              <span className="min-w-0">
                <span className="reelflow-display block truncate text-[1.15rem] leading-5">Reelflow</span>
                <span className="block truncate text-xs text-sidebar-foreground/55">{shell.workspace}</span>
              </span>
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
            <ShellLink icon={CreditCard} label={shell.nav.subscription} to="/$lang/pricing" lang={locale} active={pathname.includes('/pricing')} collapsed={sidebarCollapsed} />
            <ShellLink icon={Gift} label={shell.nav.invites} to="/$lang/reelflow/invites" lang={locale} active={pathname.includes('/reelflow/invites')} collapsed={sidebarCollapsed} />
            <ShellLink icon={Bell} label={shell.nav.notifications} to="/$lang/reelflow/notifications" lang={locale} active={pathname.includes('/reelflow/notifications')} collapsed={sidebarCollapsed} />
          </NavGroup>
        </nav>
      </aside>

      <div className={['flex min-h-dvh flex-col transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-[17rem]'].join(' ')}>
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
                className="hidden h-9 items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 text-sm font-medium shadow-xs backdrop-blur transition-colors hover:border-primary/40 hover:bg-card sm:flex"
              >
                <Coins className="h-4 w-4" style={{ color: 'var(--reelflow-amber)' }} aria-hidden="true" />
                <span className="reelflow-num">{creditLabel}</span>
              </Link>
              <Link
                to="/$lang/reelflow/notifications"
                params={{ lang: locale }}
                activeOptions={{ exact: true }}
                aria-label={shell.nav.notifications}
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
              </Link>
              <ThemeToggle />
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" aria-label={shell.userMenu} className="flex h-9 items-center gap-2 rounded-md px-1.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarImage src={user.image || ''} alt={user.name || user.email || 'User'} />
                        <AvatarFallback className="text-xs">{user.name?.charAt(0) || user.email?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{user.name || 'User'}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/$lang/dashboard" params={{ lang: locale }}>
                        <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                        {shell.nav.settings}
                      </Link>
                    </DropdownMenuItem>
                    {user.role === 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link to="/$lang/admin/reelflow" params={{ lang: locale }}>
                          <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden="true" />
                          {shell.nav.admin}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                      {shell.signOut}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>
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
}) {
  const className = [
    'reelflow-shell-link',
    collapsed ? 'justify-center px-0' : '',
    child && !collapsed ? 'pl-9 text-sidebar-foreground/62' : '',
    disabled ? 'cursor-not-allowed opacity-55 hover:bg-transparent hover:text-sidebar-foreground/70' : '',
  ].join(' ')

  const content = (
    <>
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && meta && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{meta}</span>}
    </>
  )

  if (disabled) {
    return (
      <span
        className={className}
        data-active={active}
        aria-label={label}
        aria-disabled="true"
        title={collapsed ? label : undefined}
      >
        {content}
      </span>
    )
  }

  return (
    <Link
      to={to}
      params={{ lang }}
      activeOptions={{ exact: true }}
      className={className}
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
