import { createFileRoute, Outlet, Link } from '@tanstack/react-router'
import { AppSidebar } from '@/components/admin/app-sidebar'
import { BrandMark } from '@/components/brand-mark'
import { requireAdmin } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'

export const Route = createFileRoute('/$lang/admin')({
  beforeLoad: async ({ params }) => {
    await requireAdmin({ params: params as { lang: string } })
  },
  component: AdminLayout,
})

function AdminLayout() {
  const { locale } = useTranslation()
  return (
    <div className="reelflow-app min-h-dvh bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-h-dvh flex-col lg:pl-[15.5rem]">
        <header className="sticky top-0 z-30 border-b border-border/35 bg-background/72 shadow-[0_1px_0_oklch(1_0_0_/_35%)] backdrop-blur-xl">
          <div className="flex h-[3.75rem] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <Link to="/$lang/admin" params={{ lang: locale }} aria-label="Reelflow Admin" className="lg:hidden">
              <BrandMark className="h-10 w-10" fallbackIconClassName="h-5 w-5" />
            </Link>
            <span className="reelflow-eyebrow hidden lg:inline">管理控制台</span>
          </div>
        </header>
        <div className="flex-1">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
