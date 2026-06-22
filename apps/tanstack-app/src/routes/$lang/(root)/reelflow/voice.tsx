import { createFileRoute, Link } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { requireAuth } from '@/lib/auth-guard'
import { useTranslation } from '@/hooks/use-translation'
import { Archive, ArrowLeft, ImageIcon, Mic2 } from 'lucide-react'
import { Button } from '@libs/react-shared/ui/button'
import { EmptyState, PageHeader } from '@/components/reelflow-ui'

export const Route = createFileRoute('/$lang/(root)/reelflow/voice')({
  beforeLoad: async ({ params }) => {
    await requireAuth({ params: params as { lang: string } })
  },
  head: ({ params }) => seoHead(params.lang, (t) => t.reelflow.metadata.voiceTool),
  component: ReelflowVoiceToolPage,
})

function ReelflowVoiceToolPage() {
  const { t, locale } = useTranslation()

  return (
    <main className="min-h-screen" data-testid="reelflow-voice-tool-page">
      <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow={t.reelflow.voiceTool.badge}
          title={t.reelflow.voiceTool.comingSoonTitle}
          description={t.reelflow.voiceTool.comingSoonDescription}
          actions={
            <>
              <Button variant="outline" asChild>
                <Link to="/$lang/reelflow/draft" params={{ lang: locale }}>
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t.reelflow.voiceTool.backToDraft}
                </Link>
              </Button>
              <Button asChild>
                <Link to="/$lang/reelflow/image" params={{ lang: locale }}>
                  <ImageIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t.reelflow.voiceTool.openImageTool}
                </Link>
              </Button>
            </>
          }
        />

        <div className="mt-8">
          <EmptyState
            icon={Mic2}
            title={t.reelflow.voiceTool.title}
            description={t.reelflow.voiceTool.description}
            action={
              <Button variant="outline" asChild>
                <Link to="/$lang/reelflow/assets" params={{ lang: locale }} search={{ source: 'all', assetType: 'all', query: '' }}>
                  <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t.reelflow.voiceTool.openAssets}
                </Link>
              </Button>
            }
          />
        </div>
      </div>
    </main>
  )
}
