import { createFileRoute, redirect } from '@tanstack/react-router'

// Bare /reelflow/draft has no standalone screen anymore — short-video creation
// starts from the template gallery, then opens a per-template composer at
// /reelflow/draft/$templateCode.
export const Route = createFileRoute('/$lang/(root)/reelflow/draft/')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/$lang/reelflow/templates', params: { lang: (params as { lang: string }).lang } })
  },
})
