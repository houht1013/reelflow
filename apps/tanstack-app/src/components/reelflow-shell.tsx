import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
  Clapperboard,
  Coins,
  CreditCard,
  Film,
  Gift,
  Home,
  ImageIcon,
  Layers3,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mic2,
  Settings,
  Sparkles,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
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

export function ReelflowShell({ children }: ShellProps) {
  const { t, locale } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [credits, setCredits] = useState<CreditSummary | null>(null)
  const [claimingInviteCode, setClaimingInviteCode] = useState(false)
  const { data: session } = authClientReact.useSession()
  const user = session?.user

  useEffect(() => {
    let alive = true
    async function loadCredits() {
      try {
        const response = await fetch('/api/reelflow/credits')
        const payload = await response.json()
        if (!response.ok) return
        if (alive && payload?.account) {
          setCredits({
            balance: Number(payload.account.balance || 0),
            frozenBalance: Number(payload.account.frozenBalance || 0),
            debtBalance: Number(payload.account.debtBalance || 0),
          })
        }
      } catch {
        // Header credits are a convenience; page-level errors handle recovery.
      }
    }
    void loadCredits()
    return () => {
      alive = false
    }
  }, [])

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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex lg:flex-col">
        <Link to="/$lang/reelflow" params={{ lang: locale }} className="mb-6 flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground text-background">
            <Clapperboard className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-base font-semibold leading-5">Reelflow</span>
            <span className="block text-xs text-sidebar-foreground/55">{shell.workspace}</span>
          </span>
        </Link>

        <nav className="reelflow-sidebar-nav flex-1 space-y-5 overflow-y-auto pb-4">
          <NavGroup label={shell.groups.main}>
            <ShellLink icon={Home} label={shell.nav.home} href={`/${locale}/reelflow`} active={isActive(pathname, `/${locale}/reelflow`, true)} />
            <ShellLink icon={Sparkles} label={shell.nav.create} href={`/${locale}/reelflow#creation`} active={false} />
            <ShellLink icon={ListChecks} label={shell.nav.tasks} href={`/${locale}/reelflow/jobs`} active={pathname.includes('/reelflow/jobs')} />
            <ShellLink icon={Layers3} label={shell.nav.templates} href={`/${locale}/reelflow#templates`} active={false} />
            <ShellLink icon={Archive} label={shell.nav.assets} href={`/${locale}/reelflow/assets`} active={pathname.includes('/reelflow/assets')} />
          </NavGroup>

          <NavGroup label={shell.groups.create}>
            <ShellLink icon={Film} label={shell.nav.draft} href={`/${locale}/reelflow#draft`} active={false} />
            <ShellLink icon={ImageIcon} label={shell.nav.image} href={`/${locale}/reelflow/image`} active={pathname.includes('/reelflow/image')} />
            <ShellLink icon={Video} label={shell.nav.video} href={`/${locale}/reelflow#video-soon`} active={false} meta={shell.comingSoon} />
            <ShellLink icon={Mic2} label={shell.nav.voice} href={`/${locale}/reelflow#voice-soon`} active={false} meta={shell.comingSoon} />
          </NavGroup>

          <NavGroup label={shell.groups.account}>
            <ShellLink icon={Coins} label={shell.nav.credits} href={`/${locale}/reelflow/credits`} active={pathname.includes('/reelflow/credits')} />
            <ShellLink icon={CreditCard} label={shell.nav.subscription} href={`/${locale}/pricing`} active={pathname.includes('/pricing')} />
            <ShellLink icon={Gift} label={shell.nav.invites} href={`/${locale}/reelflow/invites`} active={pathname.includes('/reelflow/invites')} />
            <ShellLink icon={Bell} label={shell.nav.notifications} href={`/${locale}/reelflow/notifications`} active={pathname.includes('/reelflow/notifications')} />
          </NavGroup>
        </nav>
      </aside>

      <div className="flex min-h-dvh flex-col lg:pl-[17rem]">
        <header className="sticky top-0 z-30 border-b border-border/80 bg-background/92 backdrop-blur">
          <div className="flex h-[3.75rem] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Link to="/$lang/reelflow" params={{ lang: locale }} className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background lg:hidden">
                <Clapperboard className="h-[18px] w-[18px]" />
              </Link>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{shell.workspaceName}</p>
                <p className="hidden text-xs text-muted-foreground sm:block">{shell.workspaceHint}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/${locale}/reelflow/credits`}
                className="hidden h-9 items-center gap-2 rounded-md bg-card/80 px-3 text-sm font-medium shadow-xs ring-1 ring-border/50 transition-colors hover:bg-card sm:flex"
              >
                <Coins className="h-4 w-4" style={{ color: 'var(--reelflow-amber)' }} />
                {creditLabel}
              </a>
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
                      <a href={`/${locale}/dashboard`}>
                        <Settings className="mr-2 h-4 w-4" />
                        {shell.nav.settings}
                      </a>
                    </DropdownMenuItem>
                    {user.role === 'admin' && (
                      <DropdownMenuItem asChild>
                        <a href={`/${locale}/admin/reelflow`}>
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          {shell.nav.admin}
                        </a>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
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

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/45">{label}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function ShellLink({
  icon: Icon,
  label,
  href,
  active,
  meta,
}: {
  icon: LucideIcon
  label: string
  href: string
  active: boolean
  meta?: string
}) {
  return (
    <a href={href} className="reelflow-shell-link" data-active={active}>
      <Icon className="h-[18px] w-[18px]" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {meta && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{meta}</span>}
    </a>
  )
}

function isActive(pathname: string, href: string, exact = false) {
  return exact ? pathname === href : pathname.startsWith(href)
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(value)
}
