import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { redirectIfAuthenticated } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { Clapperboard, Layers3, Sparkles, WalletCards } from 'lucide-react'

export const Route = createFileRoute('/$lang/(auth)')({
  beforeLoad: async ({ params }) => {
    await redirectIfAuthenticated({ params: params as { lang: string } })
  },
  component: AuthLayout,
})

function AuthLayout() {
  const { lang } = Route.useParams()
  const { t } = useTranslation()

  return (
    <main className="reelflow-app min-h-svh text-foreground">
      <div className="mx-auto grid min-h-svh w-full max-w-6xl items-center gap-10 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-10">
        <section className="hidden max-w-xl flex-col gap-8 lg:flex">
          <Link
            to="/$lang"
            params={{ lang }}
            className="inline-flex w-fit items-center gap-3 rounded-full px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={t.auth.brand.homeLabel}
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-foreground text-background shadow-[0_10px_24px_-14px_oklch(0.28_0.02_265_/_60%)]">
              <Clapperboard className="size-5" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="reelflow-display font-semibold">{t.auth.brand.name}</span>
              <span className="text-xs text-muted-foreground">{t.auth.brand.tagline}</span>
            </span>
          </Link>

          <div className="space-y-4">
            <p className="reelflow-eyebrow">{t.auth.brand.eyebrow}</p>
            <h1 className="reelflow-display max-w-lg text-4xl leading-tight text-foreground">
              {t.auth.brand.title}
            </h1>
            <p className="max-w-md text-base leading-7 text-muted-foreground">
              {t.auth.brand.description}
            </p>
          </div>

          <div className="grid max-w-lg gap-3">
            {[
              { icon: Sparkles, text: t.auth.brand.points.templates },
              { icon: Layers3, text: t.auth.brand.points.assets },
              { icon: WalletCards, text: t.auth.brand.points.credits },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.text} className="reelflow-muted-tile flex items-center gap-3 px-4 py-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm text-muted-foreground">{item.text}</span>
                </div>
              )
            })}
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-[420px] flex-col gap-6">
          <Link
            to="/$lang"
            params={{ lang }}
            className="inline-flex items-center justify-center gap-3 rounded-full py-1 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={t.auth.brand.homeLabel}
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
              <Clapperboard className="size-5" aria-hidden="true" />
            </span>
            <span className="reelflow-display font-semibold">{t.auth.brand.name}</span>
          </Link>
          <Outlet />
        </div>
      </div>
    </main>
  )
}
