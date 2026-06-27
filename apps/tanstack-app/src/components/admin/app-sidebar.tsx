import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
import {
  Boxes,
  Clapperboard,
  Coins,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  ShoppingCart,
  User,
  type LucideIcon,
} from 'lucide-react'
import { authClientReact } from '@libs/auth/authClient'
import { useTranslation } from '@/hooks/use-translation'
import { BrandMark } from '@/components/brand-mark'
import { ThemeToggle } from '@/components/theme-toggle'

type NavItem = { title: string; url: string; icon: LucideIcon }

export function AppSidebar() {
  const { t, locale } = useTranslation()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: t.navigation.admin.dashboard,
      items: [{ title: t.navigation.admin.dashboard, url: '/admin', icon: LayoutDashboard }],
    },
    {
      label: '运营',
      items: [
        { title: t.navigation.admin.users, url: '/admin/users', icon: User },
        { title: t.navigation.admin.subscriptions, url: '/admin/subscriptions', icon: CreditCard },
        { title: t.navigation.admin.orders, url: '/admin/orders', icon: ShoppingCart },
        { title: t.navigation.admin.credits, url: '/admin/credits', icon: Coins },
      ],
    },
    {
      label: '内容',
      items: [
        { title: t.navigation.admin.reelflow, url: '/admin/reelflow', icon: Clapperboard },
        { title: '模型管理', url: '/admin/reelflow/models', icon: Boxes },
        { title: t.navigation.admin.blog, url: '/admin/blog', icon: FileText },
      ],
    },
  ]

  // Active = the item whose url is the longest prefix of the current path.
  const allItems = groups.flatMap((g) => g.items)
  const activeUrl = allItems
    .filter((i) => pathname === `/${locale}${i.url}` || pathname.startsWith(`/${locale}${i.url}/`))
    .sort((a, b) => b.url.length - a.url.length)[0]?.url

  const handleSignOut = async () => {
    await authClientReact.signOut()
    navigate({ to: `/${locale}` })
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[15.5rem] flex-col border-r border-sidebar-border/55 bg-sidebar/88 px-3 py-4 shadow-[12px_0_40px_-36px_oklch(0.28_0.02_265_/_36%)] backdrop-blur-xl lg:flex">
      <Link
        to="/$lang/admin"
        params={{ lang: locale }}
        className="mb-5 flex min-w-0 items-center gap-3 px-1"
        aria-label="Reelflow Admin"
      >
        <BrandMark className="h-11 w-11 shrink-0" fallbackIconClassName="h-6 w-6" />
        <span className="reelflow-display min-w-0 truncate text-[1.15rem]">
          Reelflow <span className="text-sidebar-foreground/45">控制台</span>
        </span>
      </Link>

      <nav className="reelflow-sidebar-nav flex-1 space-y-5 overflow-y-auto pb-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-xs font-medium text-sidebar-foreground/45">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <a
                  key={item.url}
                  href={`/${locale}${item.url}`}
                  className="reelflow-shell-link"
                  data-active={activeUrl === item.url}
                  aria-label={item.title}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-2 space-y-1 border-t border-sidebar-border/45 px-1 pt-2">
        <Link to="/$lang/reelflow" params={{ lang: locale }} className="reelflow-shell-link" aria-label="返回应用">
          <Home className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">返回应用</span>
        </Link>
        <div className="reelflow-shell-link justify-between">
          <span className="flex items-center gap-3"><span className="text-sm">主题</span></span>
          <ThemeToggle />
        </div>
        <button type="button" onClick={handleSignOut} className="reelflow-shell-link w-full text-destructive" aria-label="退出登录">
          <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-left">退出登录</span>
        </button>
      </div>
    </aside>
  )
}
