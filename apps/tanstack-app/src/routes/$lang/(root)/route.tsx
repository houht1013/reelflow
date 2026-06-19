import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'
import Header from '@/components/global-header'
import { ReelflowShell } from '@/components/reelflow-shell'

export const Route = createFileRoute('/$lang/(root)')({
  component: RootLayout,
})

function RootLayout() {
  const location = useLocation()
  const isReelflowWorkspace = /\/reelflow(\/|$)/.test(location.pathname)

  if (isReelflowWorkspace) {
    return (
      <ReelflowShell>
        <Outlet />
      </ReelflowShell>
    )
  }

  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
    </>
  )
}
